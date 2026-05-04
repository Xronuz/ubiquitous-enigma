import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsInt, MaxLength } from 'class-validator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { AuditService } from '@/common/audit/audit.service';

export class CreateFeeStructureDto {
  @IsString() @MaxLength(200)
  name: string;

  @IsOptional() @IsString()
  description?: string;

  @IsNumber() @Min(0)
  amount: number;

  @IsOptional() @IsString()
  currency?: string;

  @IsOptional() @IsString()
  frequency?: string; // monthly | quarterly | yearly | once

  @IsOptional() @IsInt()
  gradeLevel?: number;

  @IsString()
  academicYear: string;
}

export class UpdateFeeStructureDto {
  @IsOptional() @IsString() @MaxLength(200)
  name?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsNumber() @Min(0)
  amount?: number;

  @IsOptional() @IsString()
  frequency?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

@Injectable()
export class FeeStructuresService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
  ) {}

  async findAll(currentUser: JwtPayload, academicYear?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (academicYear) where.academicYear = academicYear;

    return this.prisma.feeStructure.findMany({
      where,
      orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const fee = await this.prisma.feeStructure.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!fee) throw new NotFoundException('To\'lov tartibi topilmadi');
    return fee;
  }

  async create(dto: CreateFeeStructureDto, currentUser: JwtPayload) {
    const fee = await this.prisma.feeStructure.create({
      data: {
        schoolId: currentUser.schoolId!,
        branchId: currentUser.branchId!,
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'UZS',
        frequency: dto.frequency ?? 'monthly',
        gradeLevel: dto.gradeLevel,
        academicYear: dto.academicYear,
        isActive: true,
      },
    });
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'FeeStructure',
      entityId: fee.id,
      newData: { name: fee.name, amount: fee.amount, frequency: fee.frequency, academicYear: fee.academicYear },
    });
    return fee;
  }

  async update(id: string, dto: UpdateFeeStructureDto, currentUser: JwtPayload) {
    const fee = await this.prisma.feeStructure.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!fee) throw new NotFoundException('To\'lov tartibi topilmadi');

    const updated = await this.prisma.feeStructure.update({
      where: { id },
      data: dto,
    });
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'FeeStructure',
      entityId: id,
      oldData: { name: fee.name, amount: fee.amount, isActive: fee.isActive },
      newData: dto as any,
    });
    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const fee = await this.prisma.feeStructure.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!fee) throw new NotFoundException('To\'lov tartibi topilmadi');
    await this.prisma.feeStructure.delete({ where: { id } });
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'FeeStructure',
      entityId: id,
      oldData: { name: fee.name, amount: fee.amount, academicYear: fee.academicYear },
    });
    return { message: 'To\'lov tartibi o\'chirildi' };
  }

  /**
   * Fee structure asosida sinfning barcha o'quvchilari uchun
   * payment yozuvlarini avtomatik yaratish
   */
  async generatePayments(id: string, currentUser: JwtPayload) {
    const fee = await this.prisma.feeStructure.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!fee) throw new NotFoundException('To\'lov tartibi topilmadi');

    // Targetted grade level yoki barcha sinflar
    const where: any = { schoolId: currentUser.schoolId! };
    if (fee.gradeLevel) where.gradeLevel = fee.gradeLevel;

    const classes = await this.prisma.class.findMany({
      where,
      include: { students: { select: { studentId: true } } },
    });

    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Keyingi oy 1-si

    const payments: any[] = [];
    for (const cls of classes) {
      for (const cs of cls.students) {
        payments.push({
          schoolId: currentUser.schoolId!,
          studentId: cs.studentId,
          amount: fee.amount,
          currency: fee.currency,
          description: `${fee.name} — ${fee.academicYear}`,
          dueDate,
        });
      }
    }

    if (payments.length === 0) return { created: 0 };

    // $transaction orqali atomik: ya hammasi yoziladi, yoki hech biri
    const result = await this.prisma.$transaction(async (tx) => {
      const r = await tx.payment.createMany({ data: payments, skipDuplicates: true });
      return r;
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Payment',
      newData: { feeStructureId: id, feeName: fee.name, created: result.count },
    });
    return { created: result.count };
  }
}
