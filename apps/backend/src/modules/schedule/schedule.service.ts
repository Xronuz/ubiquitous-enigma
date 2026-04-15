import { Injectable, NotFoundException, ConflictException, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload, DayOfWeek } from '@eduplatform/types';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { EventsGateway } from '@/modules/gateway/events.gateway';

const SCHEDULE_TTL = 5 * 60; // 5 minutes

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  private cacheKey(schoolId: string, suffix: string) {
    return `schedule:${schoolId}:${suffix}`;
  }

  private async invalidateSchoolCache(schoolId: string) {
    const keys = await this.redis.keys(`schedule:${schoolId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  async findByClass(classId: string, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const key = this.cacheKey(schoolId, `class:${classId}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const result = await this.prisma.schedule.findMany({
      where: { classId, schoolId },
      include: {
        subject: {
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });
    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  async getToday(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const today = new Date().toISOString().slice(0, 10);
    const key = this.cacheKey(schoolId, `today:${today}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const days: DayOfWeek[] = [
      DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
    ];
    const todayIndex = new Date().getDay(); // 0=Sunday
    const dayOfWeek = days[todayIndex === 0 ? 6 : todayIndex - 1];

    const result = await this.prisma.schedule.findMany({
      where: { schoolId, dayOfWeek },
      include: {
        subject: {
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        class: { select: { id: true, name: true, gradeLevel: true } },
      },
      orderBy: [{ class: { gradeLevel: 'asc' } }, { timeSlot: 'asc' }],
    });
    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  async getWeek(currentUser: JwtPayload, classId?: string) {
    const schoolId = currentUser.schoolId!;
    const key = this.cacheKey(schoolId, `week:${classId ?? 'all'}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const where: any = { schoolId };
    if (classId) where.classId = classId;

    const result = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: {
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });
    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  async checkConflict(
    currentUser: JwtPayload,
    params: { dayOfWeek: string; timeSlot: number; teacherId?: string; roomNumber?: string; classId?: string; excludeId?: string },
  ) {
    const schoolId = currentUser.schoolId!;
    const base = { schoolId, dayOfWeek: params.dayOfWeek as any, timeSlot: params.timeSlot };
    const exclude = params.excludeId ? { id: { not: params.excludeId } } : {};

    const [roomConflict, teacherConflict, classConflict] = await Promise.all([
      params.roomNumber
        ? this.prisma.schedule.findFirst({ where: { ...base, ...exclude, roomNumber: params.roomNumber } })
        : Promise.resolve(null),
      params.teacherId
        ? this.prisma.schedule.findFirst({
            where: { ...base, ...exclude, teacherId: params.teacherId },
            include: { class: { select: { name: true } }, subject: { select: { name: true } } },
          })
        : Promise.resolve(null),
      params.classId
        ? this.prisma.schedule.findFirst({
            where: { ...base, ...exclude, classId: params.classId },
            include: { subject: { select: { name: true } } },
          })
        : Promise.resolve(null),
    ]);

    const conflicts: { type: string; message: string }[] = [];
    if (roomConflict) conflicts.push({ type: 'room', message: `${params.roomNumber}-xona bu vaqtda band` });
    if (teacherConflict) {
      const tc = teacherConflict as any;
      conflicts.push({ type: 'teacher', message: `O'qituvchi ${tc.class?.name ?? ''} sinfida ${tc.subject?.name ?? ''} darsi bor` });
    }
    if (classConflict) {
      const cc = classConflict as any;
      conflicts.push({ type: 'class', message: `Sinf bu vaqtda ${cc.subject?.name ?? 'boshqa'} darsida` });
    }

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  async create(dto: CreateScheduleDto, currentUser: JwtPayload) {
    // Check all conflicts before creating
    const { hasConflict, conflicts } = await this.checkConflict(currentUser, {
      dayOfWeek: dto.dayOfWeek,
      timeSlot: dto.timeSlot,
      teacherId: dto.teacherId,
      roomNumber: dto.roomNumber,
      classId: dto.classId,
    });
    if (hasConflict) {
      throw new ConflictException(conflicts.map(c => c.message).join('; '));
    }

    const result = await this.prisma.schedule.create({
      data: { ...dto, dayOfWeek: dto.dayOfWeek as any, schoolId: currentUser.schoolId! },
      include: {
        subject: true,
        class: { select: { id: true, name: true } },
      },
    });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'schedule:updated', {
      action: 'create',
      scheduleId: result.id,
    });
    return result;
  }

  async update(id: string, dto: Partial<CreateScheduleDto>, currentUser: JwtPayload) {
    const slot = await this.prisma.schedule.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');

    const result = await this.prisma.schedule.update({
      where: { id },
      data: dto as any,
    });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'schedule:updated', {
      action: 'update',
      scheduleId: id,
    });
    return result;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const slot = await this.prisma.schedule.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');
    await this.prisma.schedule.delete({ where: { id } });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'schedule:updated', {
      action: 'delete',
      scheduleId: id,
    });
    return { message: 'Jadval sloti o\'chirildi' };
  }
}
