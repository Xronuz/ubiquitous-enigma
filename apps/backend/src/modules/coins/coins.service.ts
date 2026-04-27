import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

export const COIN_RULES = {
  GRADE_EXCELLENT:    10,
  ATTENDANCE_WEEKLY:  20,
  DISCIPLINE_PRAISE:  100,
  DISCIPLINE_WARNING: -50,
} as const;

export interface CreateShopItemDto {
  name:        string;
  description?: string;
  cost:        number;
  emoji?:      string;
  stock?:      number | null;
}

@Injectable()
export class CoinsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Internal helpers ──────────────────────────────────────────────────────

  async earnCoins(
    userId:   string,
    schoolId: string,
    amount:   number,
    reason:   'grade_excellent' | 'attendance_weekly' | 'discipline_praise' | 'manual_award',
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
    userId:   string,
    schoolId: string,
    amount:   number,
    reason:   'discipline_warning' | 'shop_purchase' | 'manual_deduct',
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

  // ─── Student endpoints ─────────────────────────────────────────────────────

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

  // ─── Shop item CRUD ────────────────────────────────────────────────────────

  async getShopItems(schoolId: string) {
    return this.prisma.coinShopItem.findMany({
      where:   { schoolId, isActive: true },
      orderBy: { cost: 'asc' },
    });
  }

  async getAllShopItems(schoolId: string) {
    return this.prisma.coinShopItem.findMany({
      where:   { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createShopItem(dto: CreateShopItemDto, currentUser: JwtPayload) {
    if (dto.cost <= 0) throw new BadRequestException('Narx musbat bo\'lishi kerak');
    return this.prisma.coinShopItem.create({
      data: {
        schoolId:    currentUser.schoolId!,
        name:        dto.name,
        description: dto.description,
        cost:        dto.cost,
        emoji:       dto.emoji,
        stock:       dto.stock ?? null,
      },
    });
  }

  async updateShopItem(id: string, dto: Partial<CreateShopItemDto> & { isActive?: boolean }, currentUser: JwtPayload) {
    const item = await this.prisma.coinShopItem.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!item) throw new NotFoundException('Mahsulot topilmadi');

    return this.prisma.coinShopItem.update({
      where: { id },
      data: {
        ...(dto.name        !== undefined && { name:        dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.cost        !== undefined && { cost:        dto.cost }),
        ...(dto.emoji       !== undefined && { emoji:       dto.emoji }),
        ...(dto.stock       !== undefined && { stock:       dto.stock }),
        ...(dto.isActive    !== undefined && { isActive:    dto.isActive }),
      },
    });
  }

  async deleteShopItem(id: string, currentUser: JwtPayload) {
    const item = await this.prisma.coinShopItem.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!item) throw new NotFoundException('Mahsulot topilmadi');
    await this.prisma.coinShopItem.delete({ where: { id } });
    return { message: 'Mahsulot o\'chirildi' };
  }

  // ─── Purchase ──────────────────────────────────────────────────────────────

  async spendCoins(itemId: string, currentUser: JwtPayload) {
    const item = await this.prisma.coinShopItem.findFirst({
      where: { id: itemId, schoolId: currentUser.schoolId!, isActive: true },
    });
    if (!item) throw new NotFoundException(`Mahsulot topilmadi`);
    if (item.stock !== null && item.stock <= 0) {
      throw new BadRequestException('Mahsulot tugagan');
    }

    await this.prisma.$transaction(async (tx) => {
      // Deduct stock
      if (item.stock !== null) {
        await tx.coinShopItem.update({
          where: { id: itemId },
          data:  { stock: { decrement: 1 } },
        });
      }
      // Deduct coins (throws if insufficient)
      const user = await tx.user.findUnique({ where: { id: currentUser.sub }, select: { coins: true } });
      if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
      if (user.coins < item.cost) {
        throw new BadRequestException(
          `Yetarli coin yo'q. Mavjud: ${user.coins}, kerak: ${item.cost}`,
        );
      }
      const updated = await tx.user.update({
        where:  { id: currentUser.sub },
        data:   { coins: { decrement: item.cost } },
        select: { id: true, coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          userId:   currentUser.sub,
          schoolId: currentUser.schoolId!,
          amount:   -item.cost,
          type:     'deduct',
          reason:   'shop_purchase',
          balance:  updated.coins,
          metadata: { itemId: item.id, itemName: item.name } as any,
        },
      });
    });

    return {
      message: `"${item.name}" muvaffaqiyatli sotib olindi`,
      cost:    item.cost,
      item,
    };
  }

  // ─── Admin: manual award ───────────────────────────────────────────────────

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
      await this.deductCoins(studentId, currentUser.schoolId!, Math.abs(amount), 'manual_deduct', {
        deductedBy: currentUser.sub,
      });
    }

    return { studentId, amount };
  }

  // ─── Admin: all students coin balances ─────────────────────────────────────

  async getStudentBalances(currentUser: JwtPayload) {
    return this.prisma.user.findMany({
      where:   { schoolId: currentUser.schoolId!, role: 'student' as any, isActive: true },
      select:  { id: true, firstName: true, lastName: true, coins: true },
      orderBy: { coins: 'desc' },
    });
  }

  // ─── Admin: shop purchase history ─────────────────────────────────────────

  async getShopOrders(currentUser: JwtPayload) {
    return this.prisma.coinTransaction.findMany({
      where:   { schoolId: currentUser.schoolId!, reason: 'shop_purchase' },
      orderBy: { createdAt: 'desc' },
      take:    100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Cron: weekly GPA decline alert → notify parents ──────────────────────

  @Cron('0 18 * * 5') // Har juma soat 18:00 da
  async weeklyGpaDeclineAlert() {
    const now        = new Date();
    const day        = now.getDay();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    thisMonday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const avgPct = (grades: { score: number; maxScore: number }[]) =>
      grades.reduce((s, g) => s + (g.maxScore > 0 ? g.score / g.maxScore * 100 : 0), 0) / grades.length;

    const schools = await this.prisma.school.findMany({
      where:  { isActive: true },
      select: { id: true },
    });

    for (const school of schools) {
      const students = await this.prisma.user.findMany({
        where:  { schoolId: school.id, role: 'student' as any, isActive: true },
        select: { id: true, firstName: true, lastName: true },
      });

      for (const student of students) {
        const [thisWeek, lastWeek] = await Promise.all([
          this.prisma.grade.findMany({
            where:  { studentId: student.id, schoolId: school.id, date: { gte: thisMonday } },
            select: { score: true, maxScore: true },
          }),
          this.prisma.grade.findMany({
            where:  { studentId: student.id, schoolId: school.id, date: { gte: lastMonday, lt: thisMonday } },
            select: { score: true, maxScore: true },
          }),
        ]);

        if (!thisWeek.length || !lastWeek.length) continue;

        const thisAvg = avgPct(thisWeek);
        const lastAvg = avgPct(lastWeek);

        if (thisAvg < lastAvg - 10) {
          const parents = await this.prisma.parentStudent.findMany({
            where:  { studentId: student.id },
            select: { parentId: true },
          });
          if (!parents.length) continue;

          await this.prisma.notification.createMany({
            data: parents.map(p => ({
              schoolId:    school.id,
              recipientId: p.parentId,
              title:       "Farzandingizning natijalari pasaymoqda",
              body:        `${student.firstName} ${student.lastName}ning bu haftadagi o'rtacha ko'rsatkichi ${thisAvg.toFixed(0)}% (o'tgan hafta: ${lastAvg.toFixed(0)}%). E'tibor qarating!`,
            })),
          }).catch(() => {});
        }
      }
    }
  }

  // ─── Cron: weekly attendance bonus ────────────────────────────────────────

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
