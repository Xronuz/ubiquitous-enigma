import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload } from '@eduplatform/types';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { branchFilter } from '@/common/utils/branch-filter.util';

const ATTENDANCE_TTL = 3 * 60;   // 3 min — nisbatan tez-tez o'zgaradi
const SUMMARY_TTL   = 2 * 60;   // 2 min — joriy kun xulosasi
const HISTORY_TTL   = 5 * 60;   // 5 min — o'quvchi tarixi

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly notificationQueue: NotificationQueueService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  private ck(schoolId: string, branchCtx: string | null, suffix: string) {
    return `attendance:${schoolId}:${branchCtx ?? 'all'}:${suffix}`;
  }

  private async invalidate(schoolId: string) {
    const keys = await this.redis.keys(`attendance:${schoolId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async markAttendance(dto: MarkAttendanceDto, currentUser: JwtPayload, branchCtx: string | null = null) {
    const schoolId = currentUser.schoolId!;
    const date = new Date(dto.date);

    // Support legacy 'records' alias: resolve entries from either field
    const entries = (dto.entries?.length ? dto.entries : null) ?? dto.records ?? [];

    // Use findFirst + create/update to avoid NULL-unsafe upsert on scheduleId
    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const existing = await tx.attendance.findFirst({
          where: { studentId: entry.studentId, classId: dto.classId, date },
          select: { id: true },
        });
        if (existing) {
          await tx.attendance.update({
            where: { id: existing.id },
            data: { status: entry.status as any, note: entry.note },
          });
        } else {
          await tx.attendance.create({
            data: {
              schoolId,
              branchId: branchCtx ?? currentUser.branchId ?? undefined,
              classId: dto.classId,
              studentId: entry.studentId,
              scheduleId: dto.scheduleId,
              date,
              status: entry.status as any,
              note: entry.note,
            },
          });
        }
      }
    });

    // ── Cache invalidation ────────────────────────────────────────────────────
    await this.invalidate(schoolId);

    // ── Audit log ────────────────────────────────────────────────────────────
    const absentCount = entries.filter(e => e.status === 'absent').length;
    const lateCount   = entries.filter(e => e.status === 'late').length;
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Attendance',
      newData: {
        classId: dto.classId,
        date: dto.date,
        total: entries.length,
        absent: absentCount,
        late: lateCount,
      },
    });

    // ── Real-time broadcast ───────────────────────────────────────────────────
    // Frontend useRealtimeNotifications listens for 'attendance:marked'
    this.eventsGateway?.emitToSchool(schoolId, 'attendance:marked', {
      classId: dto.classId,
      date: dto.date,
      count: entries.length,
    });

    // ── Ota-onaga SMS trigger (absent/late) ──────────────────────────────────
    await this.triggerAttendanceAlerts(dto, schoolId, date);

    return { message: `${entries.length} ta o'quvchi davomati belgilandi` };
  }

  /** Absent/late o'quvchilarning ota-onalariga SMS yuborish */
  private async triggerAttendanceAlerts(dto: MarkAttendanceDto, schoolId: string, date: Date) {
    if (!this.notificationQueue) return;

    const resolvedEntries = (dto.entries?.length ? dto.entries : null) ?? dto.records ?? [];
    const alertEntries = resolvedEntries.filter(e => e.status === 'absent' || e.status === 'late');
    if (!alertEntries.length) return;

    try {
      const alertIds = alertEntries.map(e => e.studentId);

      // Single batch query — no N+1
      // NOTE: Prisma v6 + TS5 can't infer Promise.all destructure tuple types
      // for union return types; running them in parallel via Promise.all
      // collapses both results to {}. We keep both queries parallel with
      // separate variables so TypeScript preserves the precise types.
      const schoolP = this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true },
      });
      const studentsP = this.prisma.user.findMany({
        where: { id: { in: alertIds }, schoolId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          childParents: {
            include: { parent: { select: { phone: true, email: true } } },
          },
        },
      });
      const school   = await schoolP;
      const students = await studentsP;
      if (!school) return;

      const studentMap = new Map(students.map(s => [s.id, s]));
      const dateStr = date.toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });

      const queueJobs = alertEntries.flatMap(entry => {
        const student = studentMap.get(entry.studentId);
        if (!student) return [];
        const statusText = entry.status === 'absent' ? 'darsga kelmadi' : 'darsga kech qoldi';
        return student.childParents
          .filter(rel => !!rel.parent.phone)
          .map(rel => this.notificationQueue!.queueAttendanceAlert({
            parentPhone: rel.parent.phone!,
            parentEmail: rel.parent.email ?? undefined,
            studentName: `${student.firstName} ${student.lastName}`,
            date: dateStr,
            status: statusText,
            schoolName: school.name,
          }));
      });

      await Promise.allSettled(queueJobs);
    } catch (err) {
      // Alert xatosi asosiy jarayonni to'xtatmasligi kerak
    }
  }

  async getReport(currentUser: JwtPayload, branchCtx: string | null = null, classId?: string, startDate?: string, endDate?: string) {
    const schoolId = currentUser.schoolId!;
    const key = this.ck(schoolId, branchCtx, `report:${classId ?? 'all'}:${startDate ?? ''}:${endDate ?? ''}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const where: any = { ...branchFilter(currentUser, branchCtx) };
    if (classId) where.classId = classId;
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

    const result = await this.prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        schedule: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ date: 'desc' }, { student: { lastName: 'asc' } }],
    });
    await this.redis.setJson(key, result, ATTENDANCE_TTL);
    return result;
  }

  async getStudentHistory(studentId: string, currentUser: JwtPayload, branchCtx: string | null = null, limit = 30) {
    const schoolId = currentUser.schoolId!;
    const key = this.ck(schoolId, branchCtx, `history:${studentId}:${limit}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const result = await this.prisma.attendance.findMany({
      where: { studentId, ...branchFilter(currentUser, branchCtx) },
      include: {
        schedule: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
    await this.redis.setJson(key, result, HISTORY_TTL);
    return result;
  }

  /** Dashboard widget: today's attendance percentages (branch-aware) */
  async getTodaySummary(currentUser: JwtPayload, branchCtx: string | null = null) {
    const schoolId = currentUser.schoolId!;
    const todayStr = new Date().toISOString().slice(0, 10);
    const key = this.ck(schoolId, branchCtx, `today-summary:${todayStr}`);
    const cached = await this.redis.getJson<any>(key);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = branchFilter(currentUser, branchCtx);
    const [records, totalStudents] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { ...filter, date: { gte: today, lt: tomorrow } },
        select: { status: true },
      }),
      this.prisma.user.count({
        where: { ...filter, role: 'student' as any, isActive: true },
      }),
    ]);

    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    }

    const marked = records.length;
    const presentPct = marked > 0 ? Math.round((counts.present / marked) * 100) : 0;

    const result = { ...counts, marked, totalStudents, presentPct };
    await this.redis.setJson(key, result, SUMMARY_TTL);
    return result;
  }
}
