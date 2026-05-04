/**
 * RoomsService — Xonalarni boshqarish.
 *
 * Xona har doim bitta filialga tegishli (branchId REQUIRED).
 * Conflict detector room-scoped tekshirish uchun roomId ishlatadi.
 *
 * Rollar:
 *   - director  → barcha filiallarning xonalarini ko'radi/boshqaradi
 *   - branch_admin / vice_principal → faqat o'z filialining xonalarini boshqaradi
 *   - teacher va boshqalar      → faqat ko'rish (read-only)
 */

import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsUUID, Min, Max, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateRoomDto {
  @ApiProperty({ example: '101-xona' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Filial IDsi (majburiy)' })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional({ example: 2, description: "Qavat raqami" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  floor?: number;

  @ApiPropertyOptional({ example: 'classroom', description: 'classroom | lab | gym | hall | other' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const SCHOOL_WIDE_ROLES = new Set(['super_admin', 'director']);

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload, branchId?: string) {
    const schoolId = currentUser.schoolId!;
    const where: any = { schoolId };

    if (branchId) {
      where.branchId = branchId;
    } else if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && currentUser.branchId) {
      // Branch-scoped rol: faqat o'z filiali
      where.branchId = currentUser.branchId;
    }

    return this.prisma.room.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { schedules: true } },
      },
      orderBy: [{ branch: { name: 'asc' } }, { floor: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const room = await this.prisma.room.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        schedules: {
          include: {
            class:   { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
        },
      },
    });
    if (!room) throw new NotFoundException('Xona topilmadi');

    // Branch-scoped foydalanuvchi boshqa filialning xonasini ko'ra olmaydi
    if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && currentUser.branchId && room.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Bu xonaga kirish taqiqlangan');
    }

    return room;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateRoomDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Branch-scoped foydalanuvchi faqat o'z filialida xona yarata oladi
    if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && currentUser.branchId) {
      if (dto.branchId !== currentUser.branchId) {
        throw new ForbiddenException('Siz faqat o\'z filialingizda xona yarata olasiz');
      }
    }

    // Branch schoolId ga tegishlimi?
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, schoolId },
    });
    if (!branch) throw new NotFoundException('Filial topilmadi');

    // Nomning yagonaligini tekshirish (school + branch + name)
    const existing = await this.prisma.room.findFirst({
      where: { schoolId, branchId: dto.branchId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Bu filialda "${dto.name}" nomli xona allaqachon mavjud`);
    }

    return this.prisma.room.create({
      data: {
        schoolId,
        branchId:  dto.branchId,
        name:      dto.name,
        capacity:  dto.capacity ?? 30,
        floor:     dto.floor,
        type:      dto.type ?? 'classroom',
        isActive:  dto.isActive ?? true,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateRoomDto, currentUser: JwtPayload) {
    const room = await this.prisma.room.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!room) throw new NotFoundException('Xona topilmadi');

    if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && currentUser.branchId && room.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Bu xonani tahrirlash taqiqlangan');
    }

    // Ism o'zgarayotgan bo'lsa — yagonaligini tekshirish
    if (dto.name && dto.name !== room.name) {
      const conflict = await this.prisma.room.findFirst({
        where: { schoolId: currentUser.schoolId!, branchId: room.branchId, name: dto.name, id: { not: id } },
      });
      if (conflict) throw new ConflictException(`Bu filialda "${dto.name}" nomli xona allaqachon mavjud`);
    }

    const data: any = {};
    if (dto.name     !== undefined) data.name     = dto.name;
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.floor    !== undefined) data.floor    = dto.floor;
    if (dto.type     !== undefined) data.type     = dto.type;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.room.update({
      where: { id },
      data,
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    const room = await this.prisma.room.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: { _count: { select: { schedules: true } } },
    });
    if (!room) throw new NotFoundException('Xona topilmadi');

    if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && currentUser.branchId && room.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Bu xonani o\'chirish taqiqlangan');
    }

    // Jadvalga bog'liq xona — soft delete (deactivate)
    if (room._count.schedules > 0) {
      await this.prisma.room.update({ where: { id }, data: { isActive: false } });
      return { message: `Xona o'chirilmadi, chunki ${room._count.schedules} ta darsga bog'liq. Xona deaktivlashtirildi.`, deactivated: true };
    }

    await this.prisma.room.delete({ where: { id } });
    return { message: 'Xona o\'chirildi', deleted: true };
  }
}
