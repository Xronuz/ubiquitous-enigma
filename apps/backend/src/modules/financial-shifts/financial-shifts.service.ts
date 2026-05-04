import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { OpenShiftDto, CloseShiftDto } from './dto/shifts.dto';

@Injectable()
export class FinancialShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // SMENA OCHISH
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Yangi smena ochadi.
   * Bir vaqtda bir g'azna uchun faqat BITTA ochiq smena bo'lishi mumkin.
   */
  async openShift(dto: OpenShiftDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Treasury maktabga tegishli ekanligini tekshirish
    const treasury = await this.prisma.treasury.findFirst({
      where: { id: dto.treasuryId, schoolId, isActive: true },
    });
    if (!treasury) throw new NotFoundException("G'azna topilmadi");

    // Allaqachon ochiq smena bormi?
    const existingOpen = await this.prisma.financialShift.findFirst({
      where: { treasuryId: dto.treasuryId, status: 'OPEN' as any },
    });
    if (existingOpen) {
      throw new ConflictException(
        `Bu g'azna uchun allaqachon ochiq smena mavjud (id: ${existingOpen.id}). Avval yoping.`,
      );
    }

    return this.prisma.financialShift.create({
      data: {
        schoolId,
        branchId: treasury.branchId,
        treasuryId: dto.treasuryId,
        openerId: currentUser.sub!,
        startingBalance: dto.startingBalance,
        status: 'OPEN' as any,
      },
      include: {
        treasury: { select: { id: true, name: true, type: true } },
        opener: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SMENA YOPISH
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Smenani yopadi va kunlik hisob-kitobni yakunlaydi.
   * expectedBalance = treasury.balance (hozirgi holatdagi balans)
   * discrepancy = expectedBalance - actualBalance
   */
  async closeShift(id: string, dto: CloseShiftDto, currentUser: JwtPayload) {
    const shift = await this.prisma.financialShift.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: { treasury: true },
    });

    if (!shift) throw new NotFoundException('Smena topilmadi');
    if ((shift.status as string) === 'CLOSED') {
      throw new BadRequestException('Smena allaqachon yopilgan');
    }

    // expectedBalance = treasury ning joriy balansi
    const expectedBalance = shift.treasury.balance;
    const discrepancy = expectedBalance - dto.actualBalance;

    return this.prisma.$transaction(async (tx) => {
      const closed = await tx.financialShift.update({
        where: { id },
        data: {
          status: 'CLOSED' as any,
          closerId: currentUser.sub!,
          endTime: new Date(),
          expectedBalance,
          actualBalance: dto.actualBalance,
          discrepancy,
          notes: dto.notes,
        },
        include: {
          treasury: { select: { id: true, name: true, balance: true } },
          opener:   { select: { id: true, firstName: true, lastName: true } },
          closer:   { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Agar farq bo'lsa treasury balansini haqiqiy balansga moslashtirish
      if (discrepancy !== 0) {
        await tx.treasury.update({
          where: { id: shift.treasuryId },
          data: { balance: dto.actualBalance },
        });
      }

      return closed;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AKTIV SMENANI OLISH
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Joriy foydalanuvchi branchId yoki schoolId bo'yicha ochiq smenani qaytaradi.
   * To'lov qabul qilishdan oldin bu metod chaqiriladi (shift guard).
   */
  async getActiveShift(schoolId: string, branchId: string) {
    return this.prisma.financialShift.findFirst({
      where: {
        schoolId,
        branchId,
        status: 'OPEN' as any,
      },
      include: {
        treasury: { select: { id: true, name: true, balance: true } },
        opener:   { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SMENA TARIXI
  // ─────────────────────────────────────────────────────────────────────────
  async findAll(currentUser: JwtPayload, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { schoolId: currentUser.schoolId! };
    if (currentUser.branchId) where.branchId = currentUser.branchId;

    const [shifts, total] = await this.prisma.$transaction([
      this.prisma.financialShift.findMany({
        where,
        include: {
          treasury: { select: { id: true, name: true, type: true } },
          opener:   { select: { id: true, firstName: true, lastName: true } },
          closer:   { select: { id: true, firstName: true, lastName: true } },
          _count:   { select: { payments: true } },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.financialShift.count({ where }),
    ]);

    return {
      data: shifts,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const shift = await this.prisma.financialShift.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        treasury: { select: { id: true, name: true, type: true, balance: true } },
        opener:   { select: { id: true, firstName: true, lastName: true } },
        closer:   { select: { id: true, firstName: true, lastName: true } },
        payments: {
          select: {
            id: true, amount: true, status: true, provider: true,
            student: { select: { id: true, firstName: true, lastName: true } },
            paidAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!shift) throw new NotFoundException('Smena topilmadi');
    return shift;
  }
}
