import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CreateTreasuryDto, UpdateTreasuryDto } from './dto/treasury.dto';

const SCHOOL_WIDE_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.DIRECTOR,
]);

@Injectable()
export class TreasuryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // CORE: getEffectiveTreasury
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Moliya rejimine qarab qaysi g'aznaga pul tushishi kerakligini aniqlaydi.
   *
   * CENTRALIZED:   branchId: null bo'lgan maktab g'aznasini qaytaradi.
   * DECENTRALIZED: berilgan branchId dagi g'aznani qaytaradi.
   *
   * Agar tegishli g'azna topilmasa → null qaytaradi (caller hal qiladi).
   */
  async getEffectiveTreasury(
    schoolId: string,
    branchId: string | null | undefined,
  ) {
    // 1. Maktab moliya rejimini olish
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { financeType: true },
    });

    if (!school) throw new NotFoundException('Maktab topilmadi');

    if (school.financeType === 'CENTRALIZED') {
      // Markaziy g'azna — faqat birinchi faol g'aznani qaytaradi
      return this.prisma.treasury.findFirst({
        where: { schoolId, isActive: true },
      });
    }

    // DECENTRALIZED — filialning kassasini qaytarish
    if (!branchId) return null;

    return this.prisma.treasury.findFirst({
      where: { schoolId, branchId, isActive: true },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD
  // ─────────────────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload) {
    const where = SCHOOL_WIDE_ROLES.has(currentUser.role)
      ? { schoolId: currentUser.schoolId! }
      : { schoolId: currentUser.schoolId!, branchId: currentUser.branchId ?? undefined };

    return this.prisma.treasury.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { payments: true } },
      },
      orderBy: [{ branchId: 'asc' }, { type: 'asc' }],
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const treasury = await this.prisma.treasury.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { payments: true, financialShifts: true } },
      },
    });
    if (!treasury) throw new NotFoundException(`G'azna topilmadi (id: ${id})`);
    return treasury;
  }

  async create(dto: CreateTreasuryDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Validatsiya: filial maktabga tegishli ekanligini tekshirish
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, schoolId },
      });
      if (!branch) throw new NotFoundException('Filial topilmadi');
    }

    // Xuddi shu nom bilan g'azna mavjudligini tekshirish
    const existing = await this.prisma.treasury.findFirst({
      where: { schoolId, branchId: dto.branchId ?? currentUser.branchId!, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`"${dto.name}" nomli g'azna allaqachon mavjud`);
    }

    return this.prisma.treasury.create({
      data: {
        schoolId,
        branchId: dto.branchId ?? currentUser.branchId!,
        name: dto.name,
        type: (dto.type as any) ?? 'CASH',
        currency: dto.currency ?? 'UZS',
      },
    });
  }

  async update(id: string, dto: UpdateTreasuryDto, currentUser: JwtPayload) {
    const treasury = await this.prisma.treasury.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!treasury) throw new NotFoundException(`G'azna topilmadi (id: ${id})`);

    return this.prisma.treasury.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        currency: dto.currency,
      },
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    const treasury = await this.prisma.treasury.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      select: { id: true, name: true, balance: true, _count: { select: { payments: true } } },
    });
    if (!treasury) throw new NotFoundException(`G'azna topilmadi (id: ${id})`);

    if (treasury.balance !== 0) {
      throw new BadRequestException(
        `G'azna balansi 0 emas (${treasury.balance} UZS) — avval balansi 0 ga tushiring`,
      );
    }
    if (treasury._count.payments > 0) {
      // Soft delete
      await this.prisma.treasury.update({ where: { id }, data: { isActive: false } });
      return { message: `"${treasury.name}" g'aznasi deaktivatsiya qilindi`, softDeleted: true };
    }

    await this.prisma.treasury.delete({ where: { id } });
    return { message: `"${treasury.name}" g'aznasi o'chirildi`, softDeleted: false };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCHOOL FINANCE POLICY
  // ─────────────────────────────────────────────────────────────────────────

  /** Maktab moliya rejimini o'zgartirish */
  async setFinanceType(
    schoolId: string,
    financeType: 'CENTRALIZED' | 'DECENTRALIZED',
    currentUser: JwtPayload,
  ) {
    return this.prisma.school.update({
      where: { id: schoolId },
      data: { financeType: financeType as any },
      select: { id: true, name: true, financeType: true },
    });
  }

  /** Maktabning hozirgi moliya rejimi + barcha g'azna balanslarini qaytaradi */
  async getFinanceSummary(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    const [school, treasuries] = await Promise.all([
      this.prisma.school.findUnique({
        where: { id: schoolId },
        select: { financeType: true },
      }),
      this.prisma.treasury.findMany({
        where: { schoolId, isActive: true },
        include: {
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ branchId: 'asc' }, { type: 'asc' }],
      }),
    ]);

    const totalCash = treasuries
      .filter((t) => (t.type as string) === 'CASH')
      .reduce((s, t) => s + t.balance, 0);

    const totalBank = treasuries
      .filter((t) => (t.type as string) === 'BANK')
      .reduce((s, t) => s + t.balance, 0);

    return {
      financeType: school?.financeType ?? 'CENTRALIZED',
      treasuries,
      totalCash,
      totalBank,
      totalBalance: totalCash + totalBank,
    };
  }
}
