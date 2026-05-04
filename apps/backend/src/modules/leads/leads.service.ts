/**
 * LeadsService — CRM va Lead boshqaruvi.
 *
 * Asosiy funksiyalar:
 *  - create()          → telefon + schoolId bo'yicha duplicate tekshirish.
 *                        Agar mavjud bo'lsa: ConflictException + existingLead qaytariladi.
 *  - findAll()         → branchFilter orqali filial izolyatsiyasi. Status/source/search filter.
 *  - updateStatus()    → Voronka bosqichini o'zgartirish.
 *  - assign()          → Mas'ul xodim biriktirish.
 *  - convertToStudent() → Prisma.$transaction ichida:
 *                         1. User (student) yaratish
 *                         2. ClassStudent qo'shish (groupId = classId)
 *                         3. Lead.status = CONVERTED, convertedStudentId saqlash
 *  - addComment()      → Muloqot tarixiga yozuv qo'shish
 *  - getAnalytics()    → Source va status bo'yicha statistika
 */

import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum LeadSource {
  INSTAGRAM = 'INSTAGRAM', TELEGRAM = 'TELEGRAM', FACEBOOK = 'FACEBOOK',
  WEBSITE   = 'WEBSITE',   REFERRAL = 'REFERRAL', CALL     = 'CALL',
  WALK_IN   = 'WALK_IN',   OTHER    = 'OTHER',
}

export enum LeadStatus {
  NEW             = 'NEW',
  CONTACTED       = 'CONTACTED',
  TEST_LESSON     = 'TEST_LESSON',
  WAITING_PAYMENT = 'WAITING_PAYMENT',
  CONVERTED       = 'CONVERTED',
  CLOSED          = 'CLOSED',
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateLeadDto {
  @ApiProperty({ example: 'Jasur' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Toshmatov' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString() @IsNotEmpty() @MaxLength(20)
  // Must contain at least 7 digits (allows +, spaces, dashes, parens)
  @Matches(/^[+\d][\d\s\-().]{5,18}$/, { message: 'phone raqam noto\'g\'ri formatda' })
  phone: string;

  @ApiProperty({ enum: LeadSource, default: LeadSource.OTHER })
  @IsEnum(LeadSource)
  source: LeadSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(2000)
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: "Mas'ul xodim IDsi" })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: "Mo'ljallangan sinf/guruh IDsi" })
  @IsOptional()
  @IsUUID()
  expectedClassId?: string;

  @ApiPropertyOptional({ description: 'Keyingi bog\'lanish sanasi (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  nextContactDate?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString() @MaxLength(20)
  @Matches(/^[+\d][\d\s\-().]{5,18}$/, { message: 'phone raqam noto\'g\'ri formatda' })
  phone?: string;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @MaxLength(2000)
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  expectedClassId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextContactDate?: string;
}

export class AddCommentDto {
  @ApiProperty({ example: 'Qo\'ng\'iroq qildim, sinov darsiga kelishga rozi bo\'ldi.' })
  @IsString() @IsNotEmpty() @MaxLength(2000)
  text: string;
}

export class ConvertToStudentDto {
  @ApiProperty({ description: 'Sinf/guruh IDsi (Class modelidagi id)' })
  @IsUUID()
  classId: string;

  @ApiPropertyOptional({ description: "O'quvchining parol (default: telefon raqami)" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  password?: string;

  @ApiPropertyOptional({ description: "O'quvchining email (ixtiyoriy)" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const SCHOOL_WIDE_ROLES = new Set(['super_admin', 'director']);
const CRM_ROLES         = new Set(['super_admin', 'director', 'branch_admin', 'vice_principal', 'accountant']);

/** Telefon raqamini normallashtirish: faqat raqamlar, + boshida */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('998')) return `+${digits}`;
  if (digits.startsWith('0'))   return `+998${digits.slice(1)}`;
  return `+${digits}`;
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Duplicate tekshirish ──────────────────────────────────────────────────

  private async checkDuplicate(schoolId: string, phone: string, excludeId?: string) {
    const normalized = normalizePhone(phone);
    const existing = await this.prisma.lead.findFirst({
      where: {
        schoolId,
        phone: normalized,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      include: {
        branch:     { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return { normalized, existing };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(dto: CreateLeadDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Branch-scoped xodim faqat o'z filialida lead yarata oladi
    const branchId = dto.branchId ?? currentUser.branchId!;

    // ─ DUPLICATE CHECK ────────────────────────────────────────────────────
    const { normalized, existing } = await this.checkDuplicate(schoolId, dto.phone);

    if (existing) {
      throw new ConflictException({
        message: `Bu telefon raqam (${normalized}) bilan allaqachon lead mavjud.`,
        isDuplicate: true,
        existingLead: {
          id:         existing.id,
          firstName:  existing.firstName,
          lastName:   existing.lastName,
          status:     existing.status,
          source:     existing.source,
          branchName: (existing as any).branch?.name ?? null,
          assignedTo: (existing as any).assignedTo
            ? `${(existing as any).assignedTo.firstName} ${(existing as any).assignedTo.lastName}`
            : null,
          createdAt: existing.createdAt,
        },
      });
    }

    return this.prisma.lead.create({
      data: {
        schoolId,
        branchId,
        firstName:       dto.firstName,
        lastName:        dto.lastName,
        phone:           normalized,
        source:          dto.source,
        status:          'NEW',
        note:            dto.note,
        assignedToId:    dto.assignedToId,
        createdById:     currentUser.sub,
        expectedClassId: dto.expectedClassId,
        nextContactDate: dto.nextContactDate ? new Date(dto.nextContactDate) : undefined,
      },
      include: this.defaultInclude(),
    });
  }

  async findAll(
    currentUser: JwtPayload,
    filters: {
      status?:   string;
      source?:   string;
      search?:   string;
      branchId?: string;
      assignedToId?: string;
      page?:     number;
      limit?:    number;
    } = {},
  ) {
    const schoolId = currentUser.schoolId!;
    const page  = Math.max(1, filters.page  ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
    const skip  = (page - 1) * limit;

    const where: any = { schoolId };

    // Branch izolyatsiyasi
    if (filters.branchId) {
      where.branchId = filters.branchId;
    } else if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && currentUser.branchId) {
      where.branchId = currentUser.branchId;
    }

    if (filters.status)       where.status       = filters.status;
    if (filters.source)       where.source       = filters.source;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;

    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName:  { contains: q, mode: 'insensitive' } },
        { phone:     { contains: q, mode: 'insensitive' } },
        { note:      { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        include: this.defaultInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      include: {
        ...this.defaultInclude(),
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');
    this.assertBranchAccess(currentUser, lead.branchId);
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, currentUser: JwtPayload) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');
    this.assertBranchAccess(currentUser, lead.branchId);

    if (lead.status === 'CONVERTED' && dto.status && dto.status !== 'CONVERTED') {
      throw new BadRequestException('Konvertatsiya qilingan leadni qayta ochish mumkin emas');
    }

    // Telefon o'zgaryotgan bo'lsa — duplicate tekshirish
    if (dto.phone && normalizePhone(dto.phone) !== lead.phone) {
      const { normalized, existing } = await this.checkDuplicate(currentUser.schoolId!, dto.phone, id);
      if (existing) {
        throw new ConflictException({
          message: `Bu telefon raqam (${normalized}) boshqa leadda allaqachon ishlatilmoqda.`,
          isDuplicate: true,
          existingLead: { id: existing.id, firstName: existing.firstName, lastName: existing.lastName },
        });
      }
    }

    const data: any = {};
    if (dto.firstName       !== undefined) data.firstName       = dto.firstName;
    if (dto.lastName        !== undefined) data.lastName        = dto.lastName;
    if (dto.phone           !== undefined) data.phone           = normalizePhone(dto.phone);
    if (dto.source          !== undefined) data.source          = dto.source;
    if (dto.status          !== undefined) data.status          = dto.status;
    if (dto.note            !== undefined) data.note            = dto.note;
    if (dto.assignedToId    !== undefined) data.assignedToId    = dto.assignedToId;
    if (dto.branchId        !== undefined) data.branchId        = dto.branchId;
    if (dto.expectedClassId !== undefined) data.expectedClassId = dto.expectedClassId;
    if (dto.nextContactDate !== undefined) {
      data.nextContactDate = dto.nextContactDate ? new Date(dto.nextContactDate) : null;
    }

    return this.prisma.lead.update({
      where: { id },
      data,
      include: this.defaultInclude(),
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');
    if (lead.status === 'CONVERTED') {
      throw new BadRequestException("Konvertatsiya qilingan leadni o'chirib bo'lmaydi");
    }
    this.assertBranchAccess(currentUser, lead.branchId);
    await this.prisma.lead.delete({ where: { id } });
    return { message: "Lead o'chirildi" };
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async addComment(leadId: string, dto: AddCommentDto, currentUser: JwtPayload) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, schoolId: currentUser.schoolId! },
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');
    this.assertBranchAccess(currentUser, lead.branchId);

    return this.prisma.leadComment.create({
      data: {
        leadId,
        schoolId: currentUser.schoolId!,
        authorId: currentUser.sub,
        text:     dto.text,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  async removeComment(leadId: string, commentId: string, currentUser: JwtPayload) {
    const comment = await this.prisma.leadComment.findFirst({
      where: { id: commentId, leadId, schoolId: currentUser.schoolId! },
    });
    if (!comment) throw new NotFoundException('Izoh topilmadi');

    // Faqat muallif yoki admin o'chira oladi
    if (comment.authorId !== currentUser.sub && !SCHOOL_WIDE_ROLES.has(currentUser.role)) {
      throw new ForbiddenException("Boshqa xodim izohini o'chira olmaysiz");
    }

    await this.prisma.leadComment.delete({ where: { id: commentId } });
    return { message: "Izoh o'chirildi" };
  }

  // ── THE BIG CONVERSION ────────────────────────────────────────────────────

  /**
   * Lead → O'quvchi konvertatsiyasi.
   *
   * Prisma.$transaction atomik:
   *   1. User(STUDENT) yaratish (email bo'lmasa — telefon@school.local)
   *   2. ClassStudent yozuvi qo'shish
   *   3. Lead.status = CONVERTED, convertedStudentId saqlash
   *
   * Natija: { student, lead }
   */
  async convertToStudent(
    leadId: string,
    dto: ConvertToStudentDto,
    currentUser: JwtPayload,
  ) {
    const schoolId = currentUser.schoolId!;

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, schoolId },
    });
    if (!lead) throw new NotFoundException('Lead topilmadi');
    this.assertBranchAccess(currentUser, lead.branchId);

    if (lead.status === 'CONVERTED') {
      throw new BadRequestException('Bu lead allaqachon o\'quvchiga aylantirilib bo\'lgan');
    }

    // Maqsadli sinf/guruh tekshirish
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
      select: { id: true, name: true, branchId: true },
    });
    if (!cls) throw new NotFoundException('Sinf/guruh topilmadi');

    // SECURITY: branch-scoped foydalanuvchi boshqa filial sinfiga convert qila olmaydi
    const SCHOOL_WIDE = new Set([
      'super_admin', 'director', 'vice_principal',
    ]);
    if (!SCHOOL_WIDE.has(currentUser.role as string) && lead.branchId && cls.branchId && cls.branchId !== lead.branchId) {
      throw new ForbiddenException(
        'Lead va sinf bir xil filialda bo\'lishi kerak. Cross-branch convert taqiqlangan.',
      );
    }

    // Email generatsiyasi: agar berilmagan bo'lsa — telefon asosida
    const phoneDigits = lead.phone.replace(/[^\d]/g, '');
    const email       = dto.email ?? `student${phoneDigits}@school.local`;

    // Email allaqachon bandmi?
    const emailExists = await this.prisma.user.findUnique({ where: { email } });
    if (emailExists) {
      throw new ConflictException(
        `${email} email allaqachon ro'yxatda. Boshqa email bering yoki mavjud foydalanuvchi bilan bog'lang.`,
      );
    }

    // Parolni xeshlash
    const rawPassword   = dto.password ?? lead.phone;
    const passwordHash  = await bcrypt.hash(rawPassword, 10);

    // ─ ATOMIC TRANSACTION ────────────────────────────────────────────────
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. O'quvchi (User) yaratish
      const student = await tx.user.create({
        data: {
          schoolId,
          branchId:     lead.branchId ?? cls.branchId ?? undefined,
          role:         'student' as any,
          email,
          phone:        lead.phone,
          firstName:    lead.firstName,
          lastName:     lead.lastName,
          passwordHash,
          isActive:     true,
        },
        select: {
          id: true, firstName: true, lastName: true,
          email: true, phone: true, role: true,
        },
      });

      // 2. Sinfga qo'shish
      await tx.classStudent.create({
        data: { classId: dto.classId, studentId: student.id },
      });

      // 3. Lead ni CONVERTED ga o'tkazish
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: {
          status:            'CONVERTED',
          convertedStudentId: student.id,
        },
      });

      return { student, lead: updatedLead };
    });

    return {
      ...result,
      message: `${lead.firstName} ${lead.lastName} muvaffaqiyatli o'quvchiga aylantIrildi!`,
      className: cls.name,
      rawPassword, // Frontend ga ko'rsatish uchun (bir martaga)
    };
  }

  // ── Analytics ─────────────────────────────────────────────────────────────

  async getAnalytics(currentUser: JwtPayload, branchId?: string) {
    const schoolId   = currentUser.schoolId!;
    const viewBranch = branchId
      ?? (!SCHOOL_WIDE_ROLES.has(currentUser.role) ? currentUser.branchId ?? undefined : undefined);

    const where: any = { schoolId };
    if (viewBranch) where.branchId = viewBranch;

    // Parallel queries — groupBy ni $transaction dan tashqarida qilamiz (type inference uchun)
    const [
      totalLeads,
      convertedThisMonth,
      newThisWeek,
    ] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),

      // Bu oy konvertatsiya
      this.prisma.lead.count({
        where: {
          ...where,
          status:    'CONVERTED',
          updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),

      // Bu hafta yangi leadlar
      this.prisma.lead.count({
        where: {
          ...where,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // groupBy alohida — $transaction array yig'ish type inference yo'qotadi
    const [byStatus, bySource] = await Promise.all([
      this.prisma.lead.groupBy({
        by:     ['status'],
        where,
        _count: { _all: true },
        orderBy: { _count: { status: 'desc' } },
      }),
      this.prisma.lead.groupBy({
        by:     ['source'],
        where,
        _count: { _all: true },
        orderBy: { _count: { source: 'desc' } },
      }),
    ]);

    const convertedRow = byStatus.find((s) => s.status === 'CONVERTED');
    const converted      = (convertedRow?._count as any)?._all ?? 0;
    const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

    return {
      totalLeads,
      conversionRate,
      convertedThisMonth,
      newThisWeek,
      byStatus: byStatus.map((s) => ({ status: s.status, count: (s._count as any)._all as number })),
      bySource: bySource.map((s) => ({ source: s.source, count: (s._count as any)._all as number })),
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private defaultInclude() {
    return {
      branch:        { select: { id: true, name: true, code: true } },
      assignedTo:    { select: { id: true, firstName: true, lastName: true, role: true } },
      createdBy:     { select: { id: true, firstName: true, lastName: true } },
      _count:        { select: { comments: true } },
    } as const;
  }

  private assertBranchAccess(user: JwtPayload, resourceBranchId: string | null) {
    if (SCHOOL_WIDE_ROLES.has(user.role)) return;
    if (user.branchId && resourceBranchId && user.branchId !== resourceBranchId) {
      throw new ForbiddenException('Bu lead sizning filialingizga tegishli emas');
    }
  }
}
