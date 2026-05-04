import {
  Injectable, NotFoundException, BadRequestException, ConflictException, Optional,
} from '@nestjs/common';
import {
  IsString, IsNumber, IsOptional, IsUUID, IsDateString,
  Min, Max, MaxLength, IsBoolean, IsIn, IsArray, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import PDFDocument from 'pdfkit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { TariffCalculatorService, LanguageCert } from './tariff-calculator.service';
import { SystemConfigService } from '@/modules/system-config/system-config.service';
import { MailService } from '@/modules/notifications/mail.service';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateStaffSalaryDto {
  @IsUUID() userId: string;
  // ─ Hisoblash turi ─
  @IsOptional() @IsIn(['fixed', 'tariff_based']) calculationType?: string;
  // ─ Fixed rejimi ─
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsNumber() @Min(0) hourlyRate?: number;
  @IsOptional() @IsNumber() @Min(0) extraCurricularRate?: number;
  @IsOptional() @IsNumber() @Min(0) degreeAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) certificateAllowance?: number;
  // ─ Tarif rejimi ─
  @IsOptional() @IsIn(['none','second','first','highest']) qualificationGrade?: string;
  @IsOptional() @IsIn(['secondary_specialized','higher','master','doctoral']) educationLevel?: string;
  @IsOptional() @IsInt() @Min(0) workExperienceYears?: number;
  @IsOptional() @IsIn(['none','candidate','doctor']) academicDegree?: string;
  @IsOptional() @IsIn(['none','methodist','teacher_of_teachers']) honorificTitle?: string;
  @IsOptional() @IsArray() languageCerts?: LanguageCert[];
  @IsOptional() @IsInt() @Min(1) @Max(40) weeklyLessonHours?: number;
  // ─ Umumiy ─
  @IsOptional() @IsString() @MaxLength(100) position?: string;
  @IsDateString() startDate: string;
  @IsOptional() @IsString() currency?: string;
}

export class UpdateStaffSalaryDto {
  @IsOptional() @IsIn(['fixed', 'tariff_based']) calculationType?: string;
  @IsOptional() @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsNumber() @Min(0) hourlyRate?: number;
  @IsOptional() @IsNumber() @Min(0) extraCurricularRate?: number;
  @IsOptional() @IsNumber() @Min(0) degreeAllowance?: number;
  @IsOptional() @IsNumber() @Min(0) certificateAllowance?: number;
  @IsOptional() @IsIn(['none','second','first','highest']) qualificationGrade?: string;
  @IsOptional() @IsIn(['secondary_specialized','higher','master','doctoral']) educationLevel?: string;
  @IsOptional() @IsInt() @Min(0) workExperienceYears?: number;
  @IsOptional() @IsIn(['none','candidate','doctor']) academicDegree?: string;
  @IsOptional() @IsIn(['none','methodist','teacher_of_teachers']) honorificTitle?: string;
  @IsOptional() @IsArray() languageCerts?: LanguageCert[];
  @IsOptional() @IsInt() @Min(1) @Max(40) weeklyLessonHours?: number;
  @IsOptional() @IsString() @MaxLength(100) position?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// Admin manually issues advance to any staff member (auto-approved)
export class AdminIssueAdvanceDto {
  @IsUUID() targetUserId: string;
  @IsNumber() @Min(1000) amount: number;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() @Min(2020) year: number;
}

export class CreateAdvanceDto {
  @IsNumber() @Min(1000) amount: number;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() @Min(2020) year: number;
}

export class ReviewAdvanceDto {
  @IsString() action: 'approve' | 'reject';
  @IsOptional() @IsString() @MaxLength(200) comment?: string;
}

export class CreatePayrollDto {
  @IsNumber() @Min(1) @Max(12) month: number;
  @IsNumber() @Min(2020) year: number;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class UpdatePayrollItemDto {
  @IsOptional() @IsNumber() @Min(0) scheduledHours?: number;
  @IsOptional() @IsNumber() @Min(0) completedHours?: number;
  @IsOptional() @IsNumber() @Min(0) extraCurricularHours?: number;
  @IsOptional() @IsNumber() @Min(0) bonuses?: number;
  @IsOptional() @IsNumber() @Min(0) deductions?: number;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const STAFF_ROLES = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER,
  UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
];

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly tariffCalculator: TariffCalculatorService,
    @Optional() private readonly systemConfig: SystemConfigService,
    @Optional() private readonly mailService: MailService,
  ) {}

  /** Tarif kalkulyatsiyasi preview — frontend real-time uchun (BHM DB dan olinadi) */
  async previewTariff(dto: Partial<CreateStaffSalaryDto | UpdateStaffSalaryDto>, schoolId?: string) {
    if (!this.tariffCalculator) return null;
    // BHM: DB dan olinadi yoki standart
    let customBhm: number | undefined;
    if (schoolId && this.systemConfig) {
      customBhm = await this.systemConfig.getBhm(schoolId);
    }
    return this.tariffCalculator.calculate({
      qualificationGrade:  dto.qualificationGrade  ?? 'none',
      educationLevel:      dto.educationLevel,
      workExperienceYears: dto.workExperienceYears  ?? 0,
      academicDegree:      dto.academicDegree,
      honorificTitle:      dto.honorificTitle,
      languageCerts:       (dto.languageCerts ?? []) as LanguageCert[],
      weeklyLessonHours:   dto.weeklyLessonHours,
      customBhm,
    });
  }

  /** Frontend uchun reference ma'lumotlar */
  getTariffReference() {
    return this.tariffCalculator?.getReferenceData() ?? {};
  }

  // ── Staff Salary Config ────────────────────────────────────────────────────

  async getAllSalaryConfigs(currentUser: JwtPayload) {
    return this.prisma.staffSalary.findMany({
      where: buildTenantWhere(currentUser),
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true },
        },
      },
      orderBy: { user: { lastName: 'asc' } },
    });
  }

  async createSalaryConfig(dto: CreateStaffSalaryDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Verify user belongs to this school
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, schoolId, role: { in: STAFF_ROLES as any } },
    });
    if (!user) throw new NotFoundException('Xodim topilmadi yoki bu maktabda emas');

    // Check no duplicate
    const existing = await this.prisma.staffSalary.findUnique({ where: { userId: dto.userId } });
    if (existing) throw new ConflictException('Bu xodim uchun maosh konfiguratsiyasi allaqachon mavjud');

    // Tarif rejimdagi auto-hisoblash
    const tariffResult = dto.calculationType === 'tariff_based' && this.tariffCalculator
      ? this.tariffCalculator.calculate({
          qualificationGrade:  dto.qualificationGrade  ?? 'none',
          educationLevel:      dto.educationLevel,
          workExperienceYears: dto.workExperienceYears  ?? 0,
          academicDegree:      dto.academicDegree,
          honorificTitle:      dto.honorificTitle,
          languageCerts:       (dto.languageCerts ?? []) as LanguageCert[],
          weeklyLessonHours:   dto.weeklyLessonHours,
        })
      : null;

    return this.prisma.staffSalary.create({
      data: {
        schoolId,
        userId: dto.userId,
        calculationType:     (dto.calculationType ?? 'fixed') as any,
        baseSalary:          tariffResult ? tariffResult.grossMonthly : (dto.baseSalary ?? 0),
        hourlyRate:          tariffResult ? tariffResult.hourlyRate   : (dto.hourlyRate ?? 0),
        extraCurricularRate: dto.extraCurricularRate ?? 0,
        degreeAllowance:     dto.degreeAllowance ?? 0,
        certificateAllowance: dto.certificateAllowance ?? 0,
        qualificationGrade:  (dto.qualificationGrade ?? 'none') as any,
        educationLevel:      dto.educationLevel,
        workExperienceYears: dto.workExperienceYears ?? 0,
        academicDegree:      (dto.academicDegree ?? 'none') as any,
        honorificTitle:      (dto.honorificTitle ?? 'none') as any,
        languageCerts:       dto.languageCerts as any,
        weeklyLessonHours:   dto.weeklyLessonHours ?? 18,
        computedBaseSalary:  tariffResult?.grossMonthly ?? null,
        computedHourlyRate:  tariffResult?.hourlyRate   ?? null,
        tariffBreakdownJson: tariffResult as any,
        position:            dto.position,
        startDate:           new Date(dto.startDate),
        currency:            dto.currency ?? 'UZS',
        branchId: currentUser.branchId!,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    });
  }

  async updateSalaryConfig(id: string, dto: UpdateStaffSalaryDto, currentUser: JwtPayload) {
    const config = await this.prisma.staffSalary.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!config) throw new NotFoundException('Maosh konfiguratsiyasi topilmadi');

    // Tarif rejimdagi auto-hisoblash
    const calcType = dto.calculationType ?? config.calculationType;
    const tariffResult = calcType === 'tariff_based' && this.tariffCalculator
      ? this.tariffCalculator.calculate({
          qualificationGrade:  dto.qualificationGrade  ?? (config.qualificationGrade as string),
          educationLevel:      dto.educationLevel      ?? config.educationLevel ?? undefined,
          workExperienceYears: dto.workExperienceYears ?? config.workExperienceYears,
          academicDegree:      dto.academicDegree      ?? (config.academicDegree as string),
          honorificTitle:      dto.honorificTitle      ?? (config.honorificTitle as string),
          languageCerts:       (dto.languageCerts ?? (config.languageCerts as any) ?? []) as LanguageCert[],
          weeklyLessonHours:   dto.weeklyLessonHours   ?? config.weeklyLessonHours,
        })
      : null;

    const updateData: any = { ...dto };
    if (tariffResult) {
      updateData.baseSalary         = tariffResult.grossMonthly;
      updateData.hourlyRate         = tariffResult.hourlyRate;
      updateData.computedBaseSalary = tariffResult.grossMonthly;
      updateData.computedHourlyRate = tariffResult.hourlyRate;
      updateData.tariffBreakdownJson = tariffResult;
    }

    return this.prisma.staffSalary.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    });
  }

  async deleteSalaryConfig(id: string, currentUser: JwtPayload) {
    const config = await this.prisma.staffSalary.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!config) throw new NotFoundException('Maosh konfiguratsiyasi topilmadi');
    await this.prisma.staffSalary.delete({ where: { id } });
    return { message: "Maosh konfiguratsiyasi o'chirildi" };
  }

  // Staff members without salary config (for adding new ones)
  async getStaffWithoutSalary(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const configured = await this.prisma.staffSalary.findMany({
      where: { schoolId },
      select: { userId: true },
    });
    const configuredIds = configured.map((c) => c.userId);

    return this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: STAFF_ROLES as any },
        id: { notIn: configuredIds },
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: { lastName: 'asc' },
    });
  }

  // ── Salary Advances ────────────────────────────────────────────────────────

  async getAdvances(currentUser: JwtPayload, query?: { status?: string; month?: number; year?: number }) {
    const schoolId = currentUser.schoolId!;
    const isManager = [UserRole.DIRECTOR, UserRole.ACCOUNTANT].includes(currentUser.role as any);
    const where: any = { schoolId };
    if (!isManager) where.userId = currentUser.sub;
    if (query?.status) where.status = query.status;
    if (query?.month) where.month = query.month;
    if (query?.year) where.year = query.year;

    return this.prisma.salaryAdvance.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdvance(dto: CreateAdvanceDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    const staffSalary = await this.prisma.staffSalary.findFirst({
      where: { userId: currentUser.sub, schoolId },
    });
    if (!staffSalary) {
      throw new BadRequestException("Sizning maosh konfiguratsiyangiz yo'q. Admin bilan bog'laning.");
    }

    // Check max advance = 50% of base salary
    const maxAdvance = staffSalary.baseSalary * 0.5;
    if (dto.amount > maxAdvance) {
      throw new BadRequestException(
        `Avans so'rovi asosiy maoshning 50% dan oshmasligi kerak (maks: ${maxAdvance.toLocaleString()} so'm)`,
      );
    }

    // Check no duplicate pending advance this month
    const existing = await this.prisma.salaryAdvance.findFirst({
      where: {
        staffSalaryId: staffSalary.id,
        month: dto.month,
        year: dto.year,
        status: { in: ['pending', 'approved'] as any },
      },
    });
    if (existing) {
      throw new ConflictException("Bu oy uchun avans so'rovi allaqachon mavjud");
    }

    return this.prisma.salaryAdvance.create({
      data: {
        schoolId,
        staffSalaryId: staffSalary.id,
        userId: currentUser.sub,
        amount: dto.amount,
        reason: dto.reason,
        month: dto.month,
        year: dto.year,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // Admin directly issues advance to a staff member (auto-approved)
  async issueAdvance(dto: AdminIssueAdvanceDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    const staffSalary = await this.prisma.staffSalary.findFirst({
      where: { userId: dto.targetUserId, schoolId },
    });
    if (!staffSalary) {
      throw new NotFoundException("Xodim uchun maosh konfiguratsiyasi topilmadi. Avval maosh sozlang.");
    }

    // Max 50% of base salary
    const maxAdvance = staffSalary.baseSalary * 0.5;
    if (dto.amount > maxAdvance) {
      throw new BadRequestException(
        `Avans miqdori asosiy maoshning 50% dan oshmasligi kerak (maks: ${maxAdvance.toLocaleString()} so'm)`,
      );
    }

    // Check existing paid/approved advance this month
    const existing = await this.prisma.salaryAdvance.findFirst({
      where: {
        staffSalaryId: staffSalary.id,
        month: dto.month,
        year: dto.year,
        status: { in: ['pending', 'approved', 'paid'] as any },
      },
    });
    if (existing) {
      throw new ConflictException("Bu xodim uchun bu oy avans allaqachon mavjud");
    }

    return this.prisma.salaryAdvance.create({
      data: {
        schoolId,
        staffSalaryId: staffSalary.id,
        userId: dto.targetUserId,
        amount: dto.amount,
        reason: dto.reason ?? 'Admin tomonidan berilgan avans',
        month: dto.month,
        year: dto.year,
        status: 'approved' as any,   // auto-approved
        approvedById: currentUser.sub,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async reviewAdvance(id: string, dto: ReviewAdvanceDto, currentUser: JwtPayload) {
    const advance = await this.prisma.salaryAdvance.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    if (!advance) throw new NotFoundException("Avans so'rovi topilmadi");
    if (advance.status !== 'pending') {
      throw new BadRequestException("Faqat kutilayotgan so'rovni ko'rib chiqish mumkin");
    }

    const newStatus = dto.action === 'approve' ? 'approved' : 'rejected';
    return this.prisma.salaryAdvance.update({
      where: { id },
      data: {
        status: newStatus as any,
        approvedById: currentUser.sub,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async markAdvancePaid(id: string, currentUser: JwtPayload) {
    const advance = await this.prisma.salaryAdvance.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!advance) throw new NotFoundException("Avans so'rovi topilmadi");
    if (advance.status !== 'approved') {
      throw new BadRequestException("Faqat tasdiqlangan avansni to'landi deb belgilash mumkin");
    }

    return this.prisma.salaryAdvance.update({
      where: { id },
      data: { status: 'paid' as any, paidAt: new Date() },
    });
  }

  // ── Monthly Payroll ────────────────────────────────────────────────────────

  async getAllPayrolls(currentUser: JwtPayload) {
    return this.prisma.monthlyPayroll.findMany({
      where: { schoolId: currentUser.schoolId! },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getPayrollDetail(id: string, currentUser: JwtPayload) {
    const payroll = await this.prisma.monthlyPayroll.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
        items: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } },
            staffSalary: {
            select: {
              position: true, hourlyRate: true,
              extraCurricularRate: true, degreeAllowance: true, certificateAllowance: true,
            },
          },
          },
          orderBy: { user: { lastName: 'asc' } },
        },
      },
    });
    if (!payroll) throw new NotFoundException('Oylik hisob-kitob topilmadi');
    return payroll;
  }

  async generatePayroll(dto: CreatePayrollDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Check no duplicate
    const existing = await this.prisma.monthlyPayroll.findUnique({
      where: { schoolId_month_year: { schoolId, month: dto.month, year: dto.year } },
    });
    if (existing) {
      throw new ConflictException(`${dto.year}-yil ${dto.month}-oy uchun hisob-kitob allaqachon mavjud`);
    }

    // Get all active salary configs
    const salaryConfigs = await this.prisma.staffSalary.findMany({
      where: { schoolId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    if (salaryConfigs.length === 0) {
      throw new BadRequestException("Hech qanday maosh konfiguratsiyasi topilmadi. Avval xodimlar maoshini sozlang.");
    }

    // Get advances paid/approved this month for each staff
    const advances = await this.prisma.salaryAdvance.findMany({
      where: {
        schoolId,
        month: dto.month,
        year: dto.year,
        status: { in: ['approved', 'paid'] as any },
      },
    });

    // Build payroll items
    const items = salaryConfigs.map((config) => {
      const staffAdvances = advances
        .filter((a) => a.staffSalaryId === config.id)
        .reduce((sum, a) => sum + a.amount, 0);

      // Snapshot allowances into item; gross starts with base + allowances
      const grossTotal = config.baseSalary + config.degreeAllowance + config.certificateAllowance;
      const netTotal = Math.max(0, grossTotal - staffAdvances);

      return {
        schoolId,
        staffSalaryId: config.id,
        userId: config.userId,
        baseSalary: config.baseSalary,
        degreeAllowance: config.degreeAllowance,
        certificateAllowance: config.certificateAllowance,
        scheduledHours: 0,
        completedHours: 0,
        hourlyAmount: 0,
        extraCurricularHours: 0,
        extraCurricularAmount: 0,
        bonuses: 0,
        deductions: 0,
        grossTotal,
        advancePaid: staffAdvances,
        netTotal,
      };
    });

    const totalGross = items.reduce((s, i) => s + i.grossTotal, 0);
    const totalNet = items.reduce((s, i) => s + i.netTotal, 0);

    // Create payroll with items in transaction
    return this.prisma.monthlyPayroll.create({
      data: {
        schoolId,
        month: dto.month,
        year: dto.year,
        status: 'draft' as any,
        totalGross,
        totalNet,
        note: dto.note,
        createdById: currentUser.sub,
        items: { create: items },
      },
      include: {
        items: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } },
            staffSalary: { select: { position: true, hourlyRate: true } },
          },
        },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async updatePayrollItem(itemId: string, dto: UpdatePayrollItemDto, currentUser: JwtPayload) {
    const item = await this.prisma.payrollItem.findFirst({
      where: { id: itemId, schoolId: currentUser.schoolId! },
      include: {
        staffSalary: true,
        payroll: { select: { status: true } },
      },
    });
    if (!item) throw new NotFoundException('Hisob-kitob qatori topilmadi');
    if (item.payroll.status === 'paid') {
      throw new BadRequestException("To'langan hisob-kitobni o'zgartirish mumkin emas");
    }

    const scheduledHours = dto.scheduledHours ?? item.scheduledHours;
    const completedHours = dto.completedHours ?? item.completedHours;
    const extraCurricularHours = dto.extraCurricularHours ?? item.extraCurricularHours;
    const bonuses = dto.bonuses ?? item.bonuses;
    const deductions = dto.deductions ?? item.deductions;
    const hourlyRate = item.staffSalary.hourlyRate;
    const extraCurricularRate = item.staffSalary.extraCurricularRate;

    // Recalculate with all components
    const hourlyAmount = completedHours * hourlyRate;
    const extraCurricularAmount = extraCurricularHours * extraCurricularRate;
    const uncompletedPenalty = Math.max(0, scheduledHours - completedHours) * hourlyRate;
    const totalDeductions = deductions + uncompletedPenalty;
    const grossTotal =
      item.baseSalary +
      (item as any).degreeAllowance +
      (item as any).certificateAllowance +
      hourlyAmount +
      extraCurricularAmount +
      bonuses -
      totalDeductions;
    const netTotal = Math.max(0, grossTotal - item.advancePaid);

    const updated = await this.prisma.payrollItem.update({
      where: { id: itemId },
      data: {
        scheduledHours,
        completedHours,
        hourlyAmount,
        extraCurricularHours,
        extraCurricularAmount,
        bonuses,
        deductions: totalDeductions,
        grossTotal: Math.max(0, grossTotal),
        netTotal,
        note: dto.note ?? item.note,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        staffSalary: {
          select: {
            position: true, hourlyRate: true,
            extraCurricularRate: true, degreeAllowance: true, certificateAllowance: true,
          },
        },
      },
    });

    // Update payroll totals
    const allItems = await this.prisma.payrollItem.findMany({
      where: { payrollId: item.payrollId },
    });
    const totalGross = allItems.reduce((s, i) => s + i.grossTotal, 0);
    const totalNet = allItems.reduce((s, i) => s + i.netTotal, 0);
    await this.prisma.monthlyPayroll.update({
      where: { id: item.payrollId },
      data: { totalGross, totalNet },
    });

    return updated;
  }

  async approvePayroll(id: string, currentUser: JwtPayload) {
    const payroll = await this.prisma.monthlyPayroll.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!payroll) throw new NotFoundException('Hisob-kitob topilmadi');
    if (payroll.status !== 'draft') {
      throw new BadRequestException("Faqat draft holatdagi hisob-kitobni tasdiqlash mumkin");
    }

    return this.prisma.monthlyPayroll.update({
      where: { id },
      data: {
        status: 'approved' as any,
        approvedById: currentUser.sub,
        approvedAt: new Date(),
      },
    });
  }

  async markPayrollPaid(id: string, currentUser: JwtPayload) {
    const payroll = await this.prisma.monthlyPayroll.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!payroll) throw new NotFoundException('Hisob-kitob topilmadi');
    if (payroll.status !== 'approved') {
      throw new BadRequestException("Faqat tasdiqlangan hisob-kitobni to'langan deb belgilash mumkin");
    }

    return this.prisma.monthlyPayroll.update({
      where: { id },
      data: { status: 'paid' as any, paidAt: new Date() },
    });
  }

  async deletePayroll(id: string, currentUser: JwtPayload) {
    const payroll = await this.prisma.monthlyPayroll.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!payroll) throw new NotFoundException('Hisob-kitob topilmadi');
    if (payroll.status === 'paid') {
      throw new BadRequestException("To'langan hisob-kitobni o'chirish mumkin emas");
    }
    await this.prisma.monthlyPayroll.delete({ where: { id } });
    return { message: "Hisob-kitob o'chirildi" };
  }

  // ── Salary Slip PDF ────────────────────────────────────────────────────────

  /**
   * Bir xodim uchun maosh varaqasi PDF generatsiya
   */
  async generateSalarySlipPdf(payrollId: string, itemId: string, currentUser: JwtPayload): Promise<Buffer> {
    const item = await this.prisma.payrollItem.findFirst({
      where: { id: itemId, payrollId, schoolId: currentUser.schoolId! },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        staffSalary: { select: { position: true } },
        payroll: { select: { month: true, year: true, status: true } },
      },
    });
    if (!item) throw new NotFoundException('Hisob-kitob qatori topilmadi');

    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    const MONTHS_UZ = [
      '', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
    ];

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({ margin: 50, size: 'A5' });
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const marginL = 50;
      const contentW = pageW - marginL * 2;

      // ── Header ───────────────────────────────────────────────────────
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b')
         .text(school?.name ?? 'EduPlatform', marginL, 50, { width: contentW, align: 'center' });
      doc.fontSize(10).font('Helvetica').fillColor('#64748b')
         .text('MAOSH VARAQASI', { align: 'center' });
      doc.fontSize(9).fillColor('#94a3b8')
         .text(`${MONTHS_UZ[item.payroll.month]} ${item.payroll.year}`, { align: 'center' });

      doc.moveDown(0.5);
      doc.moveTo(marginL, doc.y).lineTo(pageW - marginL, doc.y).strokeColor('#e2e8f0').stroke();
      doc.moveDown(0.5);

      // ── Employee Info ─────────────────────────────────────────────────
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151')
         .text(`${item.user.firstName} ${item.user.lastName}`, marginL, doc.y);
      if (item.staffSalary?.position) {
        doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
           .text(item.staffSalary.position);
      }
      doc.moveDown(0.5);

      // ── Salary Breakdown Table ────────────────────────────────────────
      const labelX = marginL;
      const valueX = pageW - marginL - 100;
      const rowGap = 16;

      const rows: [string, number, string?][] = [
        ['Asosiy maosh',       item.baseSalary],
        ['Ilmiy daraja ustama',(item as any).degreeAllowance],
        ['Sertifikat ustama',  (item as any).certificateAllowance],
        ['Soatlik ish to\'lovi', item.hourlyAmount],
        ["Qo'shimcha dars",    item.extraCurricularAmount],
        ['Bonus',              item.bonuses],
        ['Jarima / ushlab qolish', item.deductions, 'red'],
        ['Avans ushlab qolindi',   item.advancePaid,   'red'],
      ];

      doc.moveTo(marginL, doc.y).lineTo(pageW - marginL, doc.y).strokeColor('#f1f5f9').stroke();
      doc.moveDown(0.3);

      let y = doc.y;
      for (const [label, value, color] of rows) {
        if (value === 0) continue;
        doc.fontSize(8).font('Helvetica').fillColor('#374151').text(label, labelX, y, { width: 160 });
        doc.fillColor(color === 'red' ? '#dc2626' : '#1e293b').font('Helvetica-Bold')
           .text(`${value.toLocaleString()} so'm`, valueX, y, { width: 100, align: 'right' });
        y += rowGap;
      }

      doc.moveDown(0.3);
      doc.moveTo(marginL, y + 2).lineTo(pageW - marginL, y + 2).lineWidth(1.5).strokeColor('#e2e8f0').stroke();
      y += 8;

      // ── Gross & Net ───────────────────────────────────────────────────
      doc.fontSize(9).font('Helvetica').fillColor('#374151').text("Jami hisoblangan (gross)", labelX, y, { width: 160 });
      doc.font('Helvetica-Bold').fillColor('#1e293b')
         .text(`${item.grossTotal.toLocaleString()} so'm`, valueX, y, { width: 100, align: 'right' });
      y += rowGap;

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6366f1').text("To'langan (net)", labelX, y, { width: 160 });
      doc.fillColor('#6366f1')
         .text(`${item.netTotal.toLocaleString()} so'm`, valueX, y, { width: 100, align: 'right' });
      y += rowGap + 4;

      // ── Footer ────────────────────────────────────────────────────────
      doc.moveTo(marginL, y).lineTo(pageW - marginL, y).strokeColor('#e2e8f0').stroke();
      doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
         .text(`Yaratildi: ${new Date().toLocaleDateString('uz-UZ')} — EduPlatform`, marginL, y + 4, { width: contentW, align: 'center' });

      doc.end();
    });
  }

  /**
   * Barcha xodimlarga maosh varaqasini email orqali yuborish
   */
  async sendSalarySlips(payrollId: string, currentUser: JwtPayload): Promise<{ sent: number; failed: number; skipped: number }> {
    const payroll = await this.prisma.monthlyPayroll.findFirst({
      where: { id: payrollId, schoolId: currentUser.schoolId! },
      include: {
        items: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!payroll) throw new NotFoundException('Hisob-kitob topilmadi');

    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    const MONTHS_UZ = [
      '', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
    ];

    let sent = 0, failed = 0, skipped = 0;

    for (const item of payroll.items) {
      if (!item.user.email) { skipped++; continue; }

      try {
        const pdfBuffer = await this.generateSalarySlipPdf(payrollId, item.id, currentUser);
        const monthLabel = `${MONTHS_UZ[payroll.month]}-${payroll.year}`;
        const filename = `maosh-varaqasi-${monthLabel}-${item.user.lastName}.pdf`;

        const success = await this.mailService?.sendEmailWithAttachment({
          to: item.user.email,
          subject: `💰 Maosh varaqasi — ${monthLabel} | ${school?.name ?? 'EduPlatform'}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">${school?.name ?? 'EduPlatform'}</h2>
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1;">
                <p>Hurmatli <strong>${item.user.firstName} ${item.user.lastName}</strong>,</p>
                <p>${monthLabel} oyi uchun maosh varaqangiz ilova qilingan.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Hisoblangan (gross):</td>
                    <td style="padding: 6px 0; font-weight: bold; text-align: right;">${item.grossTotal.toLocaleString()} so'm</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b;">Avans ushlab qolindi:</td>
                    <td style="padding: 6px 0; color: #ef4444; text-align: right;">-${item.advancePaid.toLocaleString()} so'm</td>
                  </tr>
                  <tr style="border-top: 2px solid #e2e8f0;">
                    <td style="padding: 8px 0; font-weight: bold; color: #6366f1;">To'langan (net):</td>
                    <td style="padding: 8px 0; font-weight: bold; color: #6366f1; text-align: right;">${item.netTotal.toLocaleString()} so'm</td>
                  </tr>
                </table>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
                Bu xabar avtomatik yuborildi — EduPlatform.uz
              </p>
            </div>
          `,
          attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
        });

        if (success) sent++; else failed++;
      } catch {
        failed++;
      }
    }

    return { sent, failed, skipped };
  }

  // ── Statistics ─────────────────────────────────────────────────────────────

  async getStatistics(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [staffCount, totalSalaryBudget, currentPayroll, recentPayrolls, pendingAdvances] =
      await this.prisma.$transaction([
        this.prisma.staffSalary.count({ where: { schoolId, isActive: true } }),
        this.prisma.staffSalary.aggregate({
          where: { schoolId, isActive: true },
          _sum: { baseSalary: true },
        }),
        this.prisma.monthlyPayroll.findUnique({
          where: { schoolId_month_year: { schoolId, month: currentMonth, year: currentYear } },
          include: { _count: { select: { items: true } } },
        }),
        this.prisma.monthlyPayroll.findMany({
          where: { schoolId },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 6,
          select: {
            id: true, month: true, year: true, status: true,
            totalGross: true, totalNet: true, paidAt: true,
          },
        }),
        this.prisma.salaryAdvance.count({
          where: { schoolId, status: 'pending' as any },
        }),
      ]);

    // Per role salary breakdown
    const salaryByRole = await this.prisma.staffSalary.groupBy({
      by: ['userId'],
      where: { schoolId, isActive: true },
      _sum: { baseSalary: true },
    });

    // Get user roles
    const users = await this.prisma.user.findMany({
      where: { schoolId, role: { in: STAFF_ROLES as any } },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    const roleStats: Record<string, { count: number; total: number }> = {};
    for (const config of await this.prisma.staffSalary.findMany({
      where: { schoolId, isActive: true },
      include: { user: { select: { role: true } } },
    })) {
      const role = config.user.role;
      if (!roleStats[role]) roleStats[role] = { count: 0, total: 0 };
      roleStats[role].count++;
      roleStats[role].total += config.baseSalary;
    }

    return {
      staffCount,
      monthlyBudget: totalSalaryBudget._sum.baseSalary ?? 0,
      pendingAdvances,
      currentPayroll: currentPayroll
        ? {
            id: currentPayroll.id,
            status: currentPayroll.status,
            totalGross: currentPayroll.totalGross,
            totalNet: currentPayroll.totalNet,
            itemCount: (currentPayroll as any)._count.items,
          }
        : null,
      recentPayrolls,
      roleStats,
    };
  }
}
