import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

// ─── Shop catalogue (MVP — DB'siz hardcode) ───────────────────────────────────

export const SHOP_ITEMS = [
  { id: 'free_lesson',  name: 'Darsdan ozod',      cost: 100, description: "1 ta darsdan ozod bo'lish" },
  { id: 'sticker_pack', name: "Stiker to'plami",   cost:  50, description: "Ajoyib raqamli stikerlar" },
  { id: 'certificate',  name: 'Faxriy yorliq',      cost: 200, description: 'Yutuq sertifikati (PDF)' },
  { id: 'extra_time',   name: "Qo'shimcha vaqt",   cost:  75, description: "Uy vazifasi uchun +1 kun" },
  { id: 'merch_pen',    name: "Maktab ruchkasi",   cost:  30, description: 'Logotipi bor ruchka' },
] as const;

export type ShopItemId = (typeof SHOP_ITEMS)[number]['id'];

// ─── Coin amounts ─────────────────────────────────────────────────────────────

export const COIN_RULES = {
  GRADE_EXCELLENT: 10,
  ATTENDANCE_WEEKLY: 20,
  DISCIPLINE_PRAISE: 100,
  DISCIPLINE_WARNING: -50,
} as const;

@Injectable()
export class CoinsService {
  constructor(private readonly prisma: PrismaService) {}

  async earnCoins(
    userId: string,
    schoolId: string,
    amount: number,
    reason: 'grade_excellent' | 'attendance_weekly' | 'discipline_praise' | 'manual_award',
    metadata?: Record<string, unknown>,
  ) {
    if (amount <= 0) return null;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where:  { id: userId },
        data:   { coins: { increment: amount } },
        select: { id: true, coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          userId,
          schoolId,
          amount,
          type:    'earn',
          reason:  reason as any,
          balance: updated.coins,
          metadata: (metadata ?? null) as any,
        },
      });
      return updated;
    });
  }

  async deductCoins(
    userId: string,
    schoolId: string,
    amount: number,
    reason: 'discipline_warning' | 'shop_purchase' | 'grade_excellent',
    metadata?: Record<string, unknown>,
  ) {
    if (amount <= 0) return null;

    const user = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: { coins: true },
    });
    if (!user) throw new NotFoundException('O\'quvchi topilmadi');

    const deduct = Math.abs(amount);
    if (user.coins < deduct) {
      throw new BadRequestException(
        `Yetarli coin yo'q. Mavjud: ${user.coins}, kerak: ${deduct}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where:  { id: userId },
        data:   { coins: { decrement: deduct } },
        select: { id: true, coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          userId,
          schoolId,
          amount:  -deduct,
          type:    'deduct',
          reason:  reason as any,
          balance: updated.coins,
          metadata: (metadata ?? null) as any,
        },
      });
      return updated;
    });
  }

  async getBalance(currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where:  { id: currentUser.sub },
      select: { coins: true },
    });
    return { coins: user?.coins ?? 0 };
  }

  async getHistory(currentUser: JwtPayload, limit = 20) {
    return this.prisma.coinTransaction.findMany({
      where:   { userId: currentUser.sub, schoolId: currentUser.schoolId! },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }

  getShopItems() {
    return SHOP_ITEMS;
  }

  async spendCoins(itemId: string, currentUser: JwtPayload) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException(`"${itemId}" mahsulot topilmadi`);

    await this.deductCoins(
      currentUser.sub,
      currentUser.schoolId!,
      item.cost,
      'shop_purchase',
      { itemId, itemName: item.name },
    );

    return {
      message: `"${item.name}" muvaffaqiyatli sotib olindi`,
      cost:    item.cost,
      item,
    };
  }

  async awardManual(studentId: string, amount: number, currentUser: JwtPayload) {
    const student = await this.prisma.user.findFirst({
      where:  { id: studentId, schoolId: currentUser.schoolId! },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    if (amount > 0) {
      await this.earnCoins(studentId, currentUser.schoolId!, amount, 'manual_award', {
        awardedBy: currentUser.sub,
      });
    } else {
      await this.deductCoins(studentId, currentUser.schoolId!, Math.abs(amount), 'discipline_warning', {
        deductedBy: currentUser.sub,
      });
    }

    return { studentId, amount };
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weeklyAttendanceBonus() {
    const now    = new Date();
    const day    = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const schools = await this.prisma.school.findMany({
      where:  { isActive: true },
      select: { id: true },
    });

    for (const school of schools) {
      const students = await this.prisma.user.findMany({
        where:  { schoolId: school.id, role: 'student' as any, isActive: true },
        select: { id: true },
      });

      for (const student of students) {
        const records = await this.prisma.attendance.findMany({
          where:  { studentId: student.id, schoolId: school.id, date: { gte: monday, lte: friday } },
          select: { status: true },
        });

        if (records.length === 0) continue;

        const allPresent = records.every((r) => r.status === 'present');
        if (allPresent) {
          await this.earnCoins(
            student.id,
            school.id,
            COIN_RULES.ATTENDANCE_WEEKLY,
            'attendance_weekly',
            { weekStart: monday.toISOString().slice(0, 10) },
          ).catch(() => {});
        }
      }
    }
  }
}
