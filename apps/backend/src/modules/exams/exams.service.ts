import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { IsString, IsUUID, IsNumber, IsDateString, IsOptional, IsArray, Min, Max, MaxLength, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { CreateExamDto, UpdateExamDto } from './dto/create-exam.dto';
import { AuditService } from '@/common/audit/audit.service';

export class BulkResultItemDto {
  @IsUUID()
  studentId: string;

  @IsNumber() @Min(0)
  score: number;

  @IsOptional() @IsString() @MaxLength(500)
  comment?: string;
}

export class BulkResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkResultItemDto)
  results: BulkResultItemDto[];
}

export class BulkCreateExamDto {
  @IsString() @MaxLength(200)
  title: string;

  @IsString()
  frequency: string;

  @IsDateString()
  scheduledAt: string;

  @IsNumber() @Min(1) @Max(1000)
  maxScore: number;

  @IsOptional() @IsNumber() @Min(1)
  duration?: number;

  @IsArray() @IsUUID(undefined, { each: true })
  classIds: string[]; // bir yoki bir nechta sinf

  @IsArray() @IsUUID(undefined, { each: true })
  subjectIds: string[]; // bir yoki bir nechta fan
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
  ) {}

  async findAll(currentUser: JwtPayload, classId?: string, subjectId?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    return this.prisma.exam.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    return exam;
  }

  async create(dto: CreateExamDto, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.create({
      data: {
        ...dto,
        scheduledAt: new Date(dto.scheduledAt),
        frequency: dto.frequency as any,
        schoolId: currentUser.schoolId!,
        isPublished: false,
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
      entity: 'Exam',
      entityId: exam.id,
      newData: { title: exam.title, classId: exam.classId, subjectId: exam.subjectId, scheduledAt: exam.scheduledAt },
    });

    return exam;
  }

  async update(id: string, dto: UpdateExamDto, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const updated = await this.prisma.exam.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        frequency: dto.frequency as any,
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
      entity: 'Exam',
      entityId: id,
      oldData: { title: exam.title, scheduledAt: exam.scheduledAt, isPublished: exam.isPublished },
      newData: dto as any,
    });

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    await this.prisma.exam.delete({ where: { id } });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'Exam',
      entityId: id,
      oldData: { title: exam.title, classId: exam.classId, subjectId: exam.subjectId },
    });

    return { message: 'Imtihon o\'chirildi' };
  }

  async publish(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    return this.prisma.exam.update({
      where: { id },
      data: { isPublished: true },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Imtihon natijalari — shu imtihon sinfidagi EXAM tipidagi baholarni qaytaradi.
   * Sana oralig'i: scheduledAt ± 3 kun (bir xil kunda bir nechta imtihon bo'lishi mumkin)
   */
  async getResults(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const scheduledAt = exam.scheduledAt ?? new Date();
    const dateFrom = new Date(scheduledAt);
    dateFrom.setDate(dateFrom.getDate() - 3);
    const dateTo = new Date(scheduledAt);
    dateTo.setDate(dateTo.getDate() + 3);

    const grades = await this.prisma.grade.findMany({
      where: {
        schoolId: currentUser.schoolId!,
        classId: exam.classId,
        subjectId: exam.subjectId,
        type: 'exam',
        createdAt: { gte: dateFrom, lte: dateTo },
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { score: 'desc' },
    });

    // Statistika
    const scores = grades.map(g => g.score);
    const total = grades.length;
    const avg = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
    const maxScore = grades[0]?.score ?? 0;
    const minScore = scores.length ? Math.min(...scores) : 0;
    const passed = grades.filter(g => g.score >= exam.maxScore * 0.5).length;
    const failed = total - passed;

    return {
      exam,
      grades,
      stats: {
        total,
        avg,
        max: maxScore,
        min: minScore,
        passed,
        failed,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      },
    };
  }

  // Bir nechta sinf × fan kombinatsiyasi uchun toplu yaratish
  async bulkCreate(dto: BulkCreateExamDto, currentUser: JwtPayload) {
    const { classIds, subjectIds, title, frequency, scheduledAt, maxScore, duration } = dto;
    const schoolId = currentUser.schoolId!;
    const date = new Date(scheduledAt);
    const freq = frequency as any;

    const data = classIds.flatMap((classId) =>
      subjectIds.map((subjectId) => ({
        schoolId,
        classId,
        subjectId,
        title,
        frequency: freq,
        maxScore,
        scheduledAt: date,
        duration,
        isPublished: false,
      })),
    );

    await this.prisma.exam.createMany({ data });

    const created = await this.prisma.exam.findMany({
      where: {
        schoolId,
        scheduledAt: date,
        title,
        classId: { in: classIds },
        subjectId: { in: subjectIds },
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    return { count: data.length, exams: created };
  }

  /**
   * Imtihon natijalarini toplu kiritish.
   * Mavjud yozuvlar scheduledAt ±3 kun oralig'ida o'chirib qayta yoziladi.
   */
  async submitBulkResults(examId: string, dto: BulkResultsDto, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId: currentUser.schoolId! },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const scheduledAt = exam.scheduledAt ?? new Date();
    const dateFrom = new Date(scheduledAt);
    dateFrom.setDate(dateFrom.getDate() - 3);
    const dateTo = new Date(scheduledAt);
    dateTo.setDate(dateTo.getDate() + 3);

    const studentIds = dto.results.map(r => r.studentId);

    // Mavjud exam baholarini o'chir
    await this.prisma.grade.deleteMany({
      where: {
        schoolId: currentUser.schoolId!,
        classId: exam.classId,
        subjectId: exam.subjectId,
        type: 'exam',
        date: { gte: dateFrom, lte: dateTo },
        studentId: { in: studentIds },
      },
    });

    // Yangi baholarni yoz
    await this.prisma.grade.createMany({
      data: dto.results.map(r => ({
        schoolId: currentUser.schoolId!,
        classId: exam.classId,
        subjectId: exam.subjectId,
        studentId: r.studentId,
        type: 'exam' as any,
        score: r.score,
        maxScore: exam.maxScore,
        comment: r.comment,
        date: scheduledAt,
      })),
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'ExamResult',
      entityId: examId,
      newData: { count: dto.results.length, examId },
    });

    return { saved: dto.results.length };
  }

  /** Dashboard widget: exams scheduled in the next N days */
  async getUpcoming(currentUser: JwtPayload, days = 7) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + days);

    return this.prisma.exam.findMany({
      where: {
        schoolId: currentUser.schoolId!,
        scheduledAt: { gte: from, lte: to },
        isPublished: true,
      },
      include: {
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });
  }
}
