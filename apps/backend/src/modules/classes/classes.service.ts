import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload } from '@eduplatform/types';
import { CreateClassDto } from './dto/create-class.dto';
import { PartialType } from '@nestjs/swagger';
import { branchFilter } from '@/common/utils/branch-filter.util';

const CLASS_TTL = 10 * 60; // 10 minutes

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private cacheKey(schoolId: string, branchCtx: string | null, suffix: string) {
    return `classes:${schoolId}:${branchCtx ?? 'all'}:${suffix}`;
  }

  private async invalidate(schoolId: string) {
    const keys = await this.redis.keys(`classes:${schoolId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  /** Class teacher o'z sinfini oladi (classTeacherId === currentUser.sub) */
  async findMyClass(currentUser: JwtPayload, branchCtx: string | null = null) {
    const cls = await this.prisma.class.findFirst({
      where: {
        ...branchFilter(currentUser, branchCtx),
        classTeacherId: currentUser.sub,
      },
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { students: true } },
        students: {
          include: { student: { select: { id: true, firstName: true, lastName: true } } },
          take: 50,
        },
      },
    });
    return cls ?? null;
  }

  async findAll(currentUser: JwtPayload, branchCtx: string | null = null) {
    const schoolId = currentUser.schoolId!;
    const key = this.cacheKey(schoolId, branchCtx, 'all');
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const result = await this.prisma.class.findMany({
      where: branchFilter(currentUser, branchCtx),
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
    });
    await this.redis.setJson(key, result, CLASS_TTL);
    return result;
  }

  async findOne(id: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    const schoolId = currentUser.schoolId!;
    const key = this.cacheKey(schoolId, branchCtx, `one:${id}`);
    const cached = await this.redis.getJson<any>(key);
    if (cached) return cached;

    const cls = await this.prisma.class.findFirst({
      where: { id, ...branchFilter(currentUser, branchCtx) },
      include: {
        classTeacher: { select: { id: true, firstName: true, lastName: true } },
        students: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        subjects: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!cls) throw new NotFoundException('Sinf topilmadi');
    await this.redis.setJson(key, cls, CLASS_TTL);
    return cls;
  }

  async create(dto: CreateClassDto, currentUser: JwtPayload, branchCtx: string | null = null) {
    const result = await this.prisma.class.create({
      data: {
        ...dto,
        schoolId: currentUser.schoolId!,
        branchId: branchCtx ?? currentUser.branchId ?? undefined,
      },
    });
    await this.invalidate(currentUser.schoolId!);
    return result;
  }

  async update(id: string, dto: Partial<CreateClassDto>, currentUser: JwtPayload, branchCtx: string | null = null) {
    await this.findOne(id, currentUser, branchCtx);
    const result = await this.prisma.class.update({ where: { id }, data: dto });
    await this.invalidate(currentUser.schoolId!);
    return result;
  }

  async remove(id: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    await this.findOne(id, currentUser, branchCtx);
    const studentCount = await this.prisma.classStudent.count({ where: { classId: id } });
    if (studentCount > 0) {
      throw new BadRequestException('Sinfda o\'quvchilar bor. Avval ularni chiqaring');
    }
    await this.prisma.class.delete({ where: { id } });
    await this.invalidate(currentUser.schoolId!);
    return { message: 'Sinf o\'chirildi' };
  }

  async getStudents(classId: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    const schoolId = currentUser.schoolId!;
    const key = this.cacheKey(schoolId, branchCtx, `students:${classId}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const records = await this.prisma.classStudent.findMany({
      where: { classId, class: branchFilter(currentUser, branchCtx) },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true,
            email: true, phone: true, isActive: true, avatarUrl: true,
          },
        },
      },
      orderBy: { student: { lastName: 'asc' } },
    });
    const result = records.map((r) => r.student);
    await this.redis.setJson(key, result, CLASS_TTL);
    return result;
  }

  async addStudent(classId: string, studentId: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    await this.findOne(classId, currentUser, branchCtx);
    const result = await this.prisma.classStudent.create({ data: { classId, studentId } });
    await this.invalidate(currentUser.schoolId!);
    return result;
  }

  async removeStudent(classId: string, studentId: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    await this.findOne(classId, currentUser, branchCtx);
    await this.prisma.classStudent.delete({
      where: { classId_studentId: { classId, studentId } },
    });
    await this.invalidate(currentUser.schoolId!);
    return { message: 'O\'quvchi sinfdan chiqarildi' };
  }

  /**
   * Academic year promotion: move students from source classes to target classes.
   * promotions: [{ fromClassId, toClassId }]
   */
  async promoteStudents(
    promotions: { fromClassId: string; toClassId: string }[],
    currentUser: JwtPayload,
    branchCtx: string | null = null,
  ) {
    const filter = branchFilter(currentUser, branchCtx);
    let promoted = 0;
    const errors: string[] = [];

    for (const { fromClassId, toClassId } of promotions) {
      const [fromClass, toClass] = await Promise.all([
        this.prisma.class.findFirst({ where: { id: fromClassId, ...filter } }),
        this.prisma.class.findFirst({ where: { id: toClassId, ...filter } }),
      ]);

      if (!fromClass) { errors.push(`Sinf topilmadi: ${fromClassId}`); continue; }
      if (!toClass)   { errors.push(`Sinf topilmadi: ${toClassId}`);   continue; }

      const students = await this.prisma.classStudent.findMany({
        where: { classId: fromClassId },
        select: { studentId: true },
      });

      for (const { studentId } of students) {
        try {
          await this.prisma.$transaction([
            this.prisma.classStudent.delete({
              where: { classId_studentId: { classId: fromClassId, studentId } },
            }),
            this.prisma.classStudent.upsert({
              where: { classId_studentId: { classId: toClassId, studentId } },
              create: { classId: toClassId, studentId },
              update: {},
            }),
          ]);
          promoted++;
        } catch {
          errors.push(`O'quvchini ko'chirishda xato: studentId=${studentId}`);
        }
      }
    }

    await this.invalidate(currentUser.schoolId!);
    return { promoted, errors, message: `${promoted} ta o'quvchi muvaffaqiyatli ko'chirildi` };
  }
}
