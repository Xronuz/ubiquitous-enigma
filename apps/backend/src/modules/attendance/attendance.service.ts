import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationQueue: NotificationQueueService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  async markAttendance(dto: MarkAttendanceDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const date = new Date(dto.date);

    // Upsert each student attendance
    const operations = dto.entries.map((entry) =>
      this.prisma.attendance.upsert({
        where: {
          studentId_scheduleId_date: {
            studentId: entry.studentId,
            scheduleId: dto.scheduleId ?? null as any,
            date,
          },
        },
        create: {
          schoolId,
          classId: dto.classId,
          studentId: entry.studentId,
          scheduleId: dto.scheduleId,
          date,
          status: entry.status as any,
          note: entry.note,
        },
        update: {
          status: entry.status as any,
          note: entry.note,
        },
      }),
    );

    await this.prisma.$transaction(operations);

    // ── Audit log ────────────────────────────────────────────────────────────
    const absentCount = dto.entries.filter(e => e.status === 'absent').length;
    const lateCount   = dto.entries.filter(e => e.status === 'late').length;
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Attendance',
      newData: {
        classId: dto.classId,
        date: dto.date,
        total: dto.entries.length,
        absent: absentCount,
        late: lateCount,
      },
    });

    // ── Real-time broadcast ───────────────────────────────────────────────────
    // Frontend useRealtimeNotifications listens for 'attendance:marked'
    this.eventsGateway?.emitToSchool(schoolId, 'attendance:marked', {
      classId: dto.classId,
      date: dto.date,
      count: dto.entries.length,
    });

    // ── Ota-onaga SMS trigger (absent/late) ──────────────────────────────────
    await this.triggerAttendanceAlerts(dto, schoolId, date);

    return { message: `${dto.entries.length} ta o'quvchi davomati belgilandi` };
  }

  /** Absent/late o'quvchilarning ota-onalariga SMS yuborish */
  private async triggerAttendanceAlerts(dto: MarkAttendanceDto, schoolId: string, date: Date) {
    if (!this.notificationQueue) return;

    const alertEntries = dto.entries.filter(e => e.status === 'absent' || e.status === 'late');
    if (!alertEntries.length) return;

    try {
      const alertIds = alertEntries.map(e => e.studentId);

      // Single batch query — no N+1
      const [school, students] = await Promise.all([
        this.prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
        this.prisma.user.findMany({
          where: { id: { in: alertIds }, schoolId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            childParents: {
              include: { parent: { select: { phone: true, email: true } } },
            },
          },
        }),
      ]);
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

  async getReport(currentUser: JwtPayload, classId?: string, startDate?: string, endDate?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (classId) where.classId = classId;
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

    return this.prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        schedule: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ date: 'desc' }, { student: { lastName: 'asc' } }],
    });
  }

  async getStudentHistory(studentId: string, currentUser: JwtPayload, limit = 30) {
    return this.prisma.attendance.findMany({
      where: { studentId, schoolId: currentUser.schoolId! },
      include: {
        schedule: {
          include: { subject: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  /** Dashboard widget: today's school-wide attendance percentages */
  async getTodaySummary(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [records, totalStudents] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { schoolId, date: { gte: today, lt: tomorrow } },
        select: { status: true },
      }),
      this.prisma.user.count({
        where: { schoolId, role: 'student' as any, isActive: true },
      }),
    ]);

    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      if (r.status in counts) counts[r.status as keyof typeof counts]++;
    }

    const marked = records.length;
    const presentPct = marked > 0 ? Math.round((counts.present / marked) * 100) : 0;

    return { ...counts, marked, totalStudents, presentPct };
  }
}
