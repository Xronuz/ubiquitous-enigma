import {
  Injectable, NotFoundException, ForbiddenException, Optional,
} from '@nestjs/common';
import {
  IsString, IsOptional, IsDateString, IsEnum, MaxLength, MinLength,
} from 'class-validator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CoinsService, COIN_RULES } from '@/modules/coins/coins.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

// ─── Enums (mirror schema) ────────────────────────────────────────────────────

export type DisciplineType     = 'behavior' | 'absence' | 'academic' | 'dress_code' | 'other';
export type DisciplineSeverity = 'low' | 'medium' | 'high';
export type DisciplineAction   = 'warning' | 'praise' | 'detention' | 'parent_call' | 'parent_meeting' | 'suspension' | 'other';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateDisciplineDto {
  @IsString() studentId: string;

  @IsOptional() @IsEnum(['behavior', 'absence', 'academic', 'dress_code', 'other'])
  type?: DisciplineType;

  @IsOptional() @IsEnum(['low', 'medium', 'high'])
  severity?: DisciplineSeverity;

  @IsOptional() @IsEnum(['warning', 'praise', 'detention', 'parent_call', 'parent_meeting', 'suspension', 'other'])
  action?: DisciplineAction;

  @IsString() @MinLength(5) @MaxLength(1000)
  description: string;

  @IsDateString()
  date: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class ResolveDto {
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

// ─── Roles that can manage discipline ────────────────────────────────────────
const MANAGER_ROLES = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
];

@Injectable()
export class DisciplineService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly coinsService: CoinsService,
  ) {}

  async findAll(
    currentUser: JwtPayload,
    opts?: {
      studentId?: string;
      classId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const schoolId = currentUser.schoolId!;
    const page  = Math.max(1, opts?.page  ?? 1);
    const limit = Math.min(100, opts?.limit ?? 20);
    const skip  = (page - 1) * limit;

    const where: any = { ...buildTenantWhere(currentUser) };
    if (opts?.studentId) where.studentId = opts.studentId;
    if (opts?.from || opts?.to) {
      where.date = {};
      if (opts?.from) where.date.gte = new Date(opts.from);
      if (opts?.to)   where.date.lte = new Date(opts.to);
    }

    // If classId filter — first get students in that class
    if (opts?.classId) {
      const classStudents = await this.prisma.classStudent.findMany({
        where: { classId: opts.classId },
        select: { studentId: true },
      });
      where.studentId = { in: classStudents.map(cs => cs.studentId) };
    }

    const [data, total] = await Promise.all([
      this.prisma.disciplineIncident.findMany({
        where,
        include: {
          student:    { select: { id: true, firstName: true, lastName: true, studentClasses: { include: { class: { select: { name: true } } }, take: 1 } } },
          reportedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.disciplineIncident.count({ where }),
    ]);

    // Flatten class name for convenience
    const formatted = data.map(d => ({
      ...d,
      student: {
        id: d.student.id,
        firstName: d.student.firstName,
        lastName:  d.student.lastName,
        class: d.student.studentClasses[0]?.class ?? null,
      },
    }));

    return {
      data: formatted,
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStudentHistory(studentId: string, currentUser: JwtPayload) {
    return this.prisma.disciplineIncident.findMany({
      where: { studentId, ...buildTenantWhere(currentUser) },
      include: {
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async create(dto: CreateDisciplineDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Verify student belongs to this school/branch
    const student = await this.prisma.user.findFirst({
      where: { id: dto.studentId, ...buildTenantWhere(currentUser), role: UserRole.STUDENT },
    });
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    const incident = await this.prisma.disciplineIncident.create({
      data: {
        schoolId,
        branchId:     student.branchId || currentUser.branchId!,
        studentId:    dto.studentId,
        reportedById: currentUser.sub,
        type:         (dto.type     ?? 'other')   as any,
        severity:     (dto.severity ?? 'low')     as any,
        action:       (dto.action   ?? 'warning') as any,
        description:  dto.description,
        date:         new Date(dto.date),
        notes:        dto.notes,
      },
      include: {
        student:    { select: { id: true, firstName: true, lastName: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // ── Coin mukofot/jarima ───────────────────────────────────────────────────
    const action = dto.action ?? 'warning';
    if (action === 'praise') {
      this.coinsService?.earnCoins(
        dto.studentId, schoolId, COIN_RULES.DISCIPLINE_PRAISE, 'discipline_praise',
        { disciplineId: incident.id, action: 'praise' },
      ).catch(() => {});
    } else if (action === 'warning') {
      this.coinsService?.deductCoins(
        dto.studentId, schoolId, Math.abs(COIN_RULES.DISCIPLINE_WARNING), 'discipline_warning',
        { disciplineId: incident.id, action: 'warning' },
      ).catch(() => {});
    }

    return incident;
  }

  async resolve(id: string, dto: ResolveDto, currentUser: JwtPayload) {
    const incident = await this.prisma.disciplineIncident.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!incident) throw new NotFoundException('Intizom hodisasi topilmadi');
    if (incident.resolved) throw new ForbiddenException('Allaqachon hal qilingan');

    return this.prisma.disciplineIncident.update({
      where: { id },
      data: {
        resolved:   true,
        resolvedAt: new Date(),
        notes:      dto.notes ?? incident.notes,
      },
      include: {
        student:    { select: { id: true, firstName: true, lastName: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    const incident = await this.prisma.disciplineIncident.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!incident) throw new NotFoundException('Intizom hodisasi topilmadi');

    // Only admin/vice can delete; reporters can delete their own
    const canDelete =
      [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL].includes(currentUser.role as any) ||
      incident.reportedById === currentUser.sub;

    if (!canDelete) throw new ForbiddenException('O\'chirish huquqi yo\'q');

    await this.prisma.disciplineIncident.delete({ where: { id } });
    return { message: 'O\'chirildi' };
  }

  async getStats(currentUser: JwtPayload) {
    const filter = buildTenantWhere(currentUser);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, thisMonth, unresolved, bySeverity, byType] = await Promise.all([
      this.prisma.disciplineIncident.count({ where: { ...filter } }),
      this.prisma.disciplineIncident.count({ where: { ...filter, date: { gte: monthStart } } }),
      this.prisma.disciplineIncident.count({ where: { ...filter, resolved: false } }),
      this.prisma.disciplineIncident.groupBy({
        by: ['severity'],
        where: { ...filter },
        _count: true,
      }),
      this.prisma.disciplineIncident.groupBy({
        by: ['type'],
        where: { ...filter },
        _count: true,
      }),
    ]);

    return {
      total,
      thisMonth,
      unresolved,
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s._count })),
      byType:     byType.map(t => ({ type: t.type, count: t._count })),
    };
  }
}
