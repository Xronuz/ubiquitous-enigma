import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IsString, IsNumber, IsOptional, IsDateString, Min, Max, MaxLength,
} from 'class-validator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateMenuDayDto {
  @IsDateString()
  date: string;

  @IsString() @MaxLength(50)
  mealType: string; // breakfast | lunch | dinner | snack

  @IsOptional() @IsNumber() @Min(0)
  price?: number;

  items: MenuItemDto[];
}

export class MenuItemDto {
  @IsString() @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsNumber() @Min(0)
  calories?: number;
}

export class UpdateMenuDayDto {
  @IsOptional() @IsNumber() @Min(0)
  price?: number;

  @IsOptional()
  items?: MenuItemDto[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CanteenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Admin: barcha menyu yozuvlari ro'yxati (CRUD sahifasi uchun)
   * Sahifalanadi, `from`/`to` sana filtri qo'llanadi.
   */
  async findAll(
    currentUser: JwtPayload,
    query?: { from?: string; to?: string; page?: number; limit?: number },
  ) {
    const schoolId = currentUser.schoolId!;
    const page  = query?.page  ?? 1;
    const limit = Math.min(query?.limit ?? 30, 100);
    const skip  = (page - 1) * limit;

    const where: any = { schoolId };
    if (query?.from) where.date = { ...(where.date ?? {}), gte: new Date(query.from) };
    if (query?.to)   where.date = { ...(where.date ?? {}), lte: new Date(query.to) };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.menuDay.findMany({
        where,
        orderBy: [{ date: 'desc' }, { mealType: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.menuDay.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /** Haftalik menyu — sana oralig'i bo'yicha */
  async getWeekMenu(currentUser: JwtPayload, from?: string, to?: string) {
    const schoolId = currentUser.schoolId!;

    const now = new Date();
    // Default: joriy hafta (Dushanba – Juma)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const dateFrom = from ? new Date(from) : startOfWeek;
    const dateTo = to ? new Date(to) : endOfWeek;

    return this.prisma.menuDay.findMany({
      where: {
        schoolId,
        date: { gte: dateFrom, lte: dateTo },
      },
      orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
    });
  }

  /** Bitta kun menuyi */
  async getDayMenu(date: string, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    return this.prisma.menuDay.findMany({
      where: { schoolId, date: new Date(date) },
      orderBy: { mealType: 'asc' },
    });
  }

  /** Yangi menyu yaratish (upsert) */
  async upsert(dto: CreateMenuDayDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const date = new Date(dto.date);

    return this.prisma.menuDay.upsert({
      where: {
        schoolId_date_mealType: {
          schoolId,
          date,
          mealType: dto.mealType,
        },
      },
      update: {
        itemsJson: dto.items as any,
        price: dto.price,
      },
      create: {
        schoolId,
        date,
        mealType: dto.mealType,
        itemsJson: dto.items as any,
        price: dto.price,
      },
    });
  }

  /** O'chirish */
  async remove(id: string, currentUser: JwtPayload) {
    const menu = await this.prisma.menuDay.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!menu) throw new NotFoundException('Menyu topilmadi');
    await this.prisma.menuDay.delete({ where: { id } });
    return { message: 'Menyu o\'chirildi' };
  }

  /** Bugungi menyu (public-friendly) */
  async getTodayMenu(currentUser: JwtPayload) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return this.prisma.menuDay.findMany({
      where: {
        schoolId: currentUser.schoolId!,
        date: { gte: today, lt: tomorrow },
      },
      orderBy: { mealType: 'asc' },
    });
  }
}
