import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import {
  IsString, IsOptional, IsDateString, IsInt, Min, Max, IsEnum, MaxLength,
} from 'class-validator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateMeetingDto {
  @IsString() teacherId:  string;
  @IsString() parentId:   string;
  @IsString() studentId:  string;

  @IsDateString() scheduledAt: string;

  @IsOptional() @IsInt() @Min(10) @Max(180)
  duration?: number;

  @IsOptional() @IsEnum(['in_person', 'phone', 'video'])
  medium?: string;

  @IsOptional() @IsString() @MaxLength(500)
  agenda?: string;
}

export class UpdateMeetingDto {
  @IsOptional() @IsEnum(['scheduled', 'completed', 'cancelled'])
  status?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;

  @IsOptional() @IsDateString()
  scheduledAt?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MeetingsService {
  constructor(private readonly prisma: PrismaService) {}

  private meetingInclude() {
    return {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      parent:  { select: { id: true, firstName: true, lastName: true } },
      student: {
        select: {
          id: true, firstName: true, lastName: true,
          studentClasses: {
            include: { class: { select: { name: true } } },
            take: 1,
          },
        },
      },
    };
  }

  async findAll(
    currentUser: JwtPayload,
    opts?: {
      status?: string;
      teacherId?: string;
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

    const where: any = { schoolId };
    if (opts?.status)    where.status    = opts.status;
    if (opts?.teacherId) where.teacherId = opts.teacherId;
    if (opts?.from || opts?.to) {
      where.scheduledAt = {};
      if (opts?.from) where.scheduledAt.gte = new Date(opts.from);
      if (opts?.to)   where.scheduledAt.lte = new Date(opts.to);
    }

    // Teachers can only see their own meetings
    if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      where.teacherId = currentUser.sub;
    }
    // Parents see their own meetings
    if (currentUser.role === UserRole.PARENT) {
      where.parentId = currentUser.sub;
    }

    const [data, total] = await Promise.all([
      this.prisma.parentMeeting.findMany({
        where,
        include: this.meetingInclude(),
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.parentMeeting.count({ where }),
    ]);

    return {
      data: data.map(m => ({
        ...m,
        student: {
          id: m.student.id,
          firstName: m.student.firstName,
          lastName:  m.student.lastName,
          class: m.student.studentClasses[0]?.class ?? null,
        },
      })),
      meta: { total, page, totalPages: Math.ceil(total / limit) },
    };
  }

  async getMyMeetings(currentUser: JwtPayload) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      where.teacherId = currentUser.sub;
    } else if (currentUser.role === UserRole.PARENT) {
      where.parentId = currentUser.sub;
    }

    const data = await this.prisma.parentMeeting.findMany({
      where,
      include: this.meetingInclude(),
      orderBy: { scheduledAt: 'asc' },
      take: 20,
    });

    return data.map(m => ({
      ...m,
      student: {
        id: m.student.id,
        firstName: m.student.firstName,
        lastName:  m.student.lastName,
        class: m.student.studentClasses[0]?.class ?? null,
      },
    }));
  }

  async create(dto: CreateMeetingDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Verify teacher belongs to school
    const teacher = await this.prisma.user.findFirst({
      where: { id: dto.teacherId, schoolId, role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] as any } },
    });
    if (!teacher) throw new NotFoundException('O\'qituvchi topilmadi');

    // Verify student belongs to school
    const student = await this.prisma.user.findFirst({
      where: { id: dto.studentId, schoolId, role: UserRole.STUDENT as any },
    });
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    // Verify parent is a user
    const parent = await this.prisma.user.findFirst({
      where: { id: dto.parentId },
    });
    if (!parent) throw new NotFoundException('Ota-ona topilmadi');

    // Check for scheduling conflict: same teacher, overlapping time
    const scheduledAt = new Date(dto.scheduledAt);
    const endTime = new Date(scheduledAt.getTime() + (dto.duration ?? 30) * 60 * 1000);

    const conflict = await this.prisma.parentMeeting.findFirst({
      where: {
        teacherId:   dto.teacherId,
        status:      'scheduled' as any,
        scheduledAt: { lt: endTime },
        AND: [
          { scheduledAt: { gte: scheduledAt } },
        ],
      },
    });
    if (conflict) {
      throw new BadRequestException('O\'qituvchi bu vaqtda allaqachon uchrashuvga belgilangan');
    }

    return this.prisma.parentMeeting.create({
      data: {
        schoolId,
        teacherId:   dto.teacherId,
        parentId:    dto.parentId,
        studentId:   dto.studentId,
        scheduledAt,
        duration:    dto.duration ?? 30,
        medium:      (dto.medium ?? 'in_person') as any,
        agenda:      dto.agenda,
      },
      include: this.meetingInclude(),
    });
  }

  async update(id: string, dto: UpdateMeetingDto, currentUser: JwtPayload) {
    const meeting = await this.prisma.parentMeeting.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!meeting) throw new NotFoundException('Uchrashuv topilmadi');

    // Cancelled meetings can't be updated
    if (meeting.status === 'cancelled' && dto.status !== 'scheduled') {
      throw new ForbiddenException('Bekor qilingan uchrashuvni o\'zgartirish mumkin emas');
    }

    return this.prisma.parentMeeting.update({
      where: { id },
      data: {
        status:      dto.status      as any ?? undefined,
        notes:       dto.notes       ?? undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: this.meetingInclude(),
    });
  }

  async remove(id: string, currentUser: JwtPayload) {
    const meeting = await this.prisma.parentMeeting.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!meeting) throw new NotFoundException('Uchrashuv topilmadi');

    await this.prisma.parentMeeting.delete({ where: { id } });
    return { message: 'Uchrashuv o\'chirildi' };
  }

  async getStats(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, scheduled, completed, cancelled, thisMonth] = await Promise.all([
      this.prisma.parentMeeting.count({ where: { schoolId } }),
      this.prisma.parentMeeting.count({ where: { schoolId, status: 'scheduled' as any } }),
      this.prisma.parentMeeting.count({ where: { schoolId, status: 'completed' as any } }),
      this.prisma.parentMeeting.count({ where: { schoolId, status: 'cancelled' as any } }),
      this.prisma.parentMeeting.count({ where: { schoolId, scheduledAt: { gte: monthStart } } }),
    ]);

    // Upcoming meetings (next 7 days)
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const upcoming = await this.prisma.parentMeeting.findMany({
      where: {
        schoolId,
        status:      'scheduled' as any,
        scheduledAt: { gte: now, lte: nextWeek },
      },
      include: this.meetingInclude(),
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });

    return {
      total, scheduled, completed, cancelled, thisMonth,
      upcoming: upcoming.map(m => ({
        ...m,
        student: {
          id: m.student.id,
          firstName: m.student.firstName,
          lastName:  m.student.lastName,
          class: m.student.studentClasses[0]?.class ?? null,
        },
      })),
    };
  }
}
