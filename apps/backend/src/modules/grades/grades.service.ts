import { Injectable, NotFoundException, Optional, Inject } from '@nestjs/common';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Queue } from 'bullmq';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GradeType, JwtPayload, UserRole } from '@eduplatform/types';
import { CreateGradeDto } from './dto/create-grade.dto';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { NOTIFICATION_QUEUE, NotificationJobType, GradeNotificationData } from '@/common/queue/queue.constants';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';

// ── Bulk grade DTOs ────────────────────────────────────────────────────────────
export class BulkGradeItemDto {
  @IsUUID() studentId: string;
  @IsNumber() @Min(0) score: number;
  @IsOptional() @IsNumber() @Max(1000) maxScore?: number;
  @IsOptional() @IsString() comment?: string;
}

export class BulkGradesDto {
  @IsUUID() classId: string;
  @IsUUID() subjectId: string;
  @IsEnum(GradeType) type: GradeType;
  @IsDateString() date: string;
  @IsNumber() @Min(1) @Max(1000) maxScore: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => BulkGradeItemDto)
  items: BulkGradeItemDto[];
}

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notificationsService: NotificationsService,
    @Optional() @Inject(NOTIFICATION_QUEUE) private readonly queue: Queue,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  async create(dto: CreateGradeDto, currentUser: JwtPayload) {
    const grade = await this.prisma.grade.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        maxScore: dto.maxScore ?? 100,
        type: dto.type as any,
        schoolId: currentUser.schoolId!,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Grade',
      entityId: grade.id,
      newData: { score: grade.score, maxScore: grade.maxScore, type: grade.type, studentId: grade.studentId },
    });

    // ── Real-time broadcast ───────────────────────────────────────────────────
    if (currentUser.schoolId) {
      this.eventsGateway?.emitToSchool(currentUser.schoolId, 'grade:created', {
        gradeId: grade.id,
        studentId: grade.studentId,
        subjectId: grade.subjectId,
      });
    }

    // ── O'quvchiga in-app bildirishnoma ──────────────────────────────────────
    this.triggerGradeNotification(grade, currentUser).catch(() => {});

    return grade;
  }

  private async triggerGradeNotification(grade: any, currentUser: JwtPayload) {
    try {
      const pct = grade.maxScore > 0 ? Math.round((grade.score / grade.maxScore) * 100) : 0;

      // 1. In-app notification for student
      if (this.notificationsService) {
        await this.notificationsService.createInApp({
          schoolId: currentUser.schoolId!,
          recipientId: grade.student.id,
          title: `Yangi baho: ${grade.subject.name}`,
          body: `${grade.score}/${grade.maxScore} ball (${pct}%) — ${grade.type}`,
          type: 'in_app' as any,
        });
      }

      // 2. SMS/Email to parent(s) via queue
      if (this.queue) {
        const parentLinks = await this.prisma.parentStudent.findMany({
          where: { studentId: grade.student.id },
          include: { parent: { select: { phone: true, email: true } } },
        });
        const school = await this.prisma.school.findFirst({
          where: { id: currentUser.schoolId! },
          select: { name: true },
        });
        for (const link of parentLinks) {
          if (link.parent?.phone) {
            await this.queue.add(NotificationJobType.GRADE_NOTIFICATION, {
              parentPhone: link.parent.phone,
              parentEmail: link.parent.email ?? undefined,
              studentName: `${grade.student.firstName} ${grade.student.lastName}`,
              subject: grade.subject.name,
              score: grade.score,
              maxScore: grade.maxScore,
              gradeType: grade.type,
              schoolName: school?.name ?? 'EduPlatform',
            } satisfies GradeNotificationData);
          }
        }
      }
    } catch {
      // silent — never block the main request
    }
  }

  /** Bir vaqtda butun sinf uchun baho kiritish */
  async bulkCreate(dto: BulkGradesDto, currentUser: JwtPayload) {
    const date = new Date(dto.date);
    await this.prisma.grade.createMany({
      data: dto.items.map(item => ({
        schoolId: currentUser.schoolId!,
        classId: dto.classId,
        subjectId: dto.subjectId,
        studentId: item.studentId,
        type: dto.type as any,
        score: item.score,
        maxScore: item.maxScore ?? dto.maxScore,
        comment: item.comment,
        date,
      })),
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Grade',
      newData: { classId: dto.classId, subjectId: dto.subjectId, type: dto.type, count: dto.items.length },
    });

    return { saved: dto.items.length };
  }

  async getStudentGrades(studentId: string, currentUser: JwtPayload, subjectId?: string) {
    // Students may only access their own grades
    const resolvedStudentId =
      currentUser.role === UserRole.STUDENT ? currentUser.sub : studentId;

    const where: any = { studentId: resolvedStudentId, schoolId: currentUser.schoolId! };
    if (subjectId) where.subjectId = subjectId;

    const grades = await this.prisma.grade.findMany({
      where,
      include: { subject: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const gpa = this.calculateGpa(grades);
    return { grades, gpa };
  }

  async getClassReport(
    classId: string,
    currentUser: JwtPayload,
    subjectId?: string,
    page = 1,
    limit = 50,
  ) {
    const where: any = { classId, schoolId: currentUser.schoolId! };
    if (subjectId) where.subjectId = subjectId;
    const skip = (page - 1) * limit;

    const [grades, total] = await this.prisma.$transaction([
      this.prisma.grade.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
        },
        orderBy: [{ student: { lastName: 'asc' } }, { date: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.grade.count({ where }),
    ]);

    return {
      data: grades,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: Partial<CreateGradeDto>, currentUser: JwtPayload) {
    const grade = await this.prisma.grade.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!grade) throw new NotFoundException('Baho topilmadi');
    const updated = await this.prisma.grade.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined } as any,
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'Grade',
      entityId: id,
      oldData: { score: grade.score, maxScore: grade.maxScore },
      newData: dto as any,
    });

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const grade = await this.prisma.grade.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!grade) throw new NotFoundException('Baho topilmadi');
    await this.prisma.grade.delete({ where: { id } });

    // ── Audit log ────────────────────────────────────────────────────────────
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'Grade',
      entityId: id,
      oldData: { score: grade.score, maxScore: grade.maxScore, studentId: grade.studentId },
    });

    return { message: 'Baho o\'chirildi' };
  }

  /** Returns just the GPA number for a student */
  async getStudentGpa(studentId: string, currentUser: JwtPayload) {
    const grades = await this.prisma.grade.findMany({
      where: { studentId, schoolId: currentUser.schoolId! },
      select: { score: true, maxScore: true },
    });
    const gpa = this.calculateGpa(grades);
    return { studentId, gpa, gradeCount: grades.length };
  }

  /** Returns GPA for every student in a class, sorted desc */
  async getClassGpa(classId: string, currentUser: JwtPayload) {
    const members = await this.prisma.classStudent.findMany({
      where: { classId, class: { schoolId: currentUser.schoolId! } },
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    });

    const gpas = await Promise.all(
      members.map(async (m) => {
        const grades = await this.prisma.grade.findMany({
          where: { studentId: m.studentId, classId, schoolId: currentUser.schoolId! },
          select: { score: true, maxScore: true },
        });
        return {
          studentId: m.studentId,
          name: `${m.student.firstName} ${m.student.lastName}`,
          gpa: this.calculateGpa(grades),
          gradeCount: grades.length,
        };
      }),
    );

    const sorted = gpas.sort((a, b) => b.gpa - a.gpa);
    const classAvg = sorted.length > 0
      ? Math.round((sorted.reduce((s, x) => s + x.gpa, 0) / sorted.length) * 100) / 100
      : 0;

    return { students: sorted, classAvg };
  }

  /**
   * Role-scoped grade list:
   *  - SCHOOL_ADMIN / VICE_PRINCIPAL → all grades in school (filterable)
   *  - TEACHER / CLASS_TEACHER       → grades for classes they teach
   *  - STUDENT                       → own grades only
   *  - PARENT                        → 403 (use /parent/child/:id/grades)
   */
  async findAll(
    currentUser: JwtPayload,
    query?: { classId?: string; subjectId?: string; studentId?: string; page?: number; limit?: number },
  ) {
    const schoolId = currentUser.schoolId!;
    const page  = query?.page  ?? 1;
    const limit = Math.min(query?.limit ?? 50, 200);
    const skip  = (page - 1) * limit;

    const where: any = { schoolId };

    if (query?.classId)   where.classId   = query.classId;
    if (query?.subjectId) where.subjectId = query.subjectId;

    // Student can only see their own grades
    if (currentUser.role === UserRole.STUDENT) {
      where.studentId = currentUser.sub;
    } else if (query?.studentId) {
      where.studentId = query.studentId;
    }

    // Teacher/class_teacher: scope to subjects they own
    if (
      currentUser.role === UserRole.TEACHER ||
      currentUser.role === UserRole.CLASS_TEACHER
    ) {
      const mySubjects = await this.prisma.subject.findMany({
        where: { schoolId, teacherId: currentUser.sub },
        select: { id: true },
      });
      where.subjectId = { in: mySubjects.map((s) => s.id) };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.grade.findMany({
        where,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.grade.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  private calculateGpa(grades: { score: number; maxScore: number }[]): number {
    if (grades.length === 0) return 0;
    const total = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0);
    return Math.round((total / grades.length) * 100) / 100;
  }
}
