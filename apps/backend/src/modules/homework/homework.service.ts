import { Injectable, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { CreateHomeworkDto, UpdateHomeworkDto, SubmitHomeworkDto, GradeSubmissionDto } from './dto/homework.dto';
import { AuditService } from '@/common/audit/audit.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(currentUser: JwtPayload, classId?: string, subjectId?: string) {
    const where: any = { ...buildTenantWhere(currentUser) };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    return this.prisma.homework.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');
    return homework;
  }

  async create(dto: CreateHomeworkDto, currentUser: JwtPayload) {
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId! },
      select: { branchId: true },
    });
    const homework = await this.prisma.homework.create({
      data: {
        ...dto,
        dueDate: new Date(dto.dueDate),
        schoolId: currentUser.schoolId!,
        branchId: cls!.branchId,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Homework',
      entityId: homework.id,
      newData: { title: homework.title, classId: homework.classId, subjectId: homework.subjectId, dueDate: homework.dueDate },
    });

    // ── Sinfning barcha o'quvchilariga bildirishnoma ──────────────────────────
    this.notifyHomeworkCreated(homework, currentUser).catch(() => {});

    return homework;
  }

  private async notifyHomeworkCreated(homework: any, currentUser: JwtPayload) {
    if (!this.notificationsService) return;
    try {
      const students = await this.prisma.classStudent.findMany({
        where: { classId: homework.classId },
        select: { studentId: true },
      });
      const dueStr = new Date(homework.dueDate).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
      await Promise.allSettled(
        students.map(s =>
          this.notificationsService!.createInApp({
            schoolId: currentUser.schoolId!,
            recipientId: s.studentId,
            title: `Yangi uy vazifasi: ${homework.subject?.name ?? ''}`,
            body: `"${homework.title}" — muddati: ${dueStr}`,
            type: 'in_app' as any,
          }),
        ),
      );
    } catch {
      // silent
    }
  }

  async update(id: string, dto: UpdateHomeworkDto, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    const updated = await this.prisma.homework.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'Homework',
      entityId: id,
      oldData: { title: homework.title, dueDate: homework.dueDate },
      newData: dto as any,
    });

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');
    await this.prisma.homework.delete({ where: { id } });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'Homework',
      entityId: id,
      oldData: { title: homework.title, classId: homework.classId },
    });

    return { message: 'Uyga vazifa o\'chirildi' };
  }

  async submit(id: string, dto: SubmitHomeworkDto, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    // Upsert: update if already submitted, create otherwise
    const existing = await this.prisma.homeworkSubmission.findFirst({
      where: { homeworkId: id, studentId: currentUser.sub },
    });

    if (existing) {
      return this.prisma.homeworkSubmission.update({
        where: { id: existing.id },
        data: { ...dto, submittedAt: new Date() },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    return this.prisma.homeworkSubmission.create({
      data: {
        homeworkId: id,
        studentId: currentUser.sub,
        content: dto.content,
        fileUrl: dto.fileUrl,
        submittedAt: new Date(),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async grade(homeworkId: string, submissionId: string, dto: GradeSubmissionDto, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, ...buildTenantWhere(currentUser) },
      include: { subject: { select: { name: true } } },
    });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { id: submissionId, homeworkId },
    });
    if (!submission) throw new NotFoundException('Topshiriq topilmadi');

    const updated = await this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: { score: dto.score },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // ── O'quvchiga baho haqida bildirishnoma ──────────────────────────────────
    if (this.notificationsService && dto.score !== null && dto.score !== undefined) {
      this.notificationsService.createInApp({
        schoolId: currentUser.schoolId!,
        recipientId: submission.studentId,
        title: `Uy vazifasi baholandi: ${homework.subject?.name ?? ''}`,
        body: `"${homework.title}" — ball: ${dto.score}`,
        type: 'in_app' as any,
      }).catch(() => {});
    }

    return updated;
  }

  async getMySubmission(homeworkId: string, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id: homeworkId, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { homeworkId, studentId: currentUser.sub },
    });

    if (!submission) throw new NotFoundException('Topshiriq topilmadi');
    return submission;
  }
}
