import {
  Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import {
  IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, IsNumber, IsDateString, IsEnum,
  Min, Max, MaxLength, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { branchFilter } from '@/common/utils/branch-filter.util';

// CourseScope — GLOBAL: barcha filiallarga ko'rinadi, LOCAL: faqat yaratgan filial
enum CourseScope { GLOBAL = 'GLOBAL', LOCAL = 'LOCAL' }

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateCourseDto {
  @IsString() @MinLength(2) @MaxLength(200)
  name: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsString()
  teacherId?: string;

  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  duration?: number; // weeks

  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional() @IsInt() @Min(1) @Max(500)
  @Type(() => Number)
  maxStudents?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  /** GLOBAL — barcha filiallarga ko'rinadi; LOCAL — faqat yaratgan filial ko'radi */
  @ApiPropertyOptional({ enum: CourseScope, default: CourseScope.GLOBAL })
  @IsOptional()
  @IsEnum(CourseScope)
  scope?: CourseScope;
}

// ─── CourseMaterial DTOs ──────────────────────────────────────────────────────

export class CreateCourseMaterialDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Fayl URL (CDN/S3 dan upload qilingan)' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'document', description: 'document | video | image | link | other' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateCourseMaterialDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateCourseDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200)
  name?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsString()
  teacherId?: string;

  @IsOptional() @IsInt() @Min(1)
  @Type(() => Number)
  duration?: number;

  @IsOptional() @IsNumber() @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional() @IsInt() @Min(1) @Max(500)
  @Type(() => Number)
  maxStudents?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;
}

export class EnrollStudentDto {
  @IsString()
  studentId: string;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

export class UpdateEnrollmentDto {
  @IsOptional() @IsString()
  status?: 'active' | 'completed' | 'dropped';

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  @Type(() => Number)
  grade?: number;

  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const MANAGER_ROLES = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL];

@Injectable()
export class LearningCenterService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Courses ───────────────────────────────────────────────────────────────

  async getCourses(currentUser: JwtPayload, branchCtx: string | null = null, search?: string) {
    const schoolId  = currentUser.schoolId!;
    const viewerBranchId = branchCtx ?? currentUser.branchId ?? null;

    // CourseScope logikasi:
    //   GLOBAL kurslar — schoolId ga tegishli barcha filiallarga ko'rinadi
    //   LOCAL kurslar  — faqat o'sha filialning kurslari
    // Director/school_admin barcha kurslarni ko'radi.
    const SCHOOL_WIDE = new Set(['super_admin', 'school_admin', 'director']);
    let where: any;

    if (SCHOOL_WIDE.has(currentUser.role) && !branchCtx) {
      // Barcha kurslar: GLOBAL + LOCAL (filialga qaramay)
      where = { schoolId };
    } else if (viewerBranchId) {
      // GLOBAL kurslar (barcha filiallarga) YOKI LOCAL kurslar (faqat shu filialniki)
      where = {
        schoolId,
        OR: [
          { scope: 'GLOBAL' },
          { scope: 'LOCAL', branchId: viewerBranchId },
        ],
      };
    } else {
      // branchId yo'q — faqat GLOBAL kurslar
      where = { schoolId, scope: 'GLOBAL' };
    }

    if (search) {
      const searchFilter = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      // Mavjud OR bilan birlashtirish
      if (where.OR) {
        where = { ...where, AND: [{ OR: where.OR }, { OR: searchFilter }] };
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        branch:  { select: { id: true, name: true, code: true } },
        _count:  { select: { enrollments: true, materials: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.map(c => ({
      ...c,
      enrolledCount: c._count.enrollments,
      materialsCount: c._count.materials,
    }));
  }

  async getCourseById(id: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    const course = await this.prisma.course.findFirst({
      where: { id, ...branchFilter(currentUser, branchCtx) },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        enrollments: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
          orderBy: { enrolledAt: 'desc' },
        },
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    return { ...course, enrolledCount: course._count.enrollments };
  }

  async createCourse(dto: CreateCourseDto, currentUser: JwtPayload, branchCtx: string | null = null) {
    const schoolId = currentUser.schoolId!;

    if (dto.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: dto.teacherId,
          schoolId,
          role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] as any },
        },
      });
      if (!teacher) throw new NotFoundException('O\'qituvchi topilmadi');
    }

    return this.prisma.course.create({
      data: {
        schoolId,
        branchId: branchCtx ?? currentUser.branchId ?? undefined,
        name:        dto.name,
        description: dto.description,
        teacherId:   dto.teacherId,
        duration:    dto.duration,
        price:       dto.price,
        maxStudents: dto.maxStudents ?? 30,
        isActive:    dto.isActive ?? true,
        scope:       dto.scope ?? 'GLOBAL',
        startDate:   dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:     dto.endDate   ? new Date(dto.endDate)   : undefined,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        branch:  { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateCourse(id: string, dto: UpdateCourseDto, currentUser: JwtPayload) {
    const course = await this.prisma.course.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    if (dto.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: dto.teacherId,
          schoolId: currentUser.schoolId!,
          role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] as any },
        },
      });
      if (!teacher) throw new NotFoundException('O\'qituvchi topilmadi');
    }

    const data: any = {};
    if (dto.name !== undefined)        data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.teacherId !== undefined)   data.teacherId = dto.teacherId;
    if (dto.duration !== undefined)    data.duration = dto.duration;
    if (dto.price !== undefined)       data.price = dto.price;
    if (dto.maxStudents !== undefined) data.maxStudents = dto.maxStudents;
    if (dto.isActive !== undefined)    data.isActive = dto.isActive;
    if (dto.startDate !== undefined)   data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined)     data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.prisma.course.update({
      where: { id },
      data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: true } },
      },
    });
  }

  async removeCourse(id: string, currentUser: JwtPayload) {
    const course = await this.prisma.course.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    const activeEnrollments = await this.prisma.courseEnrollment.count({
      where: { courseId: id, status: 'active' },
    });
    if (activeEnrollments > 0) {
      throw new BadRequestException(
        `Bu kursda ${activeEnrollments} ta faol o'quvchi bor. Avval ularni o'tkazing.`,
      );
    }

    await this.prisma.course.delete({ where: { id } });
    return { message: 'Kurs o\'chirildi' };
  }

  // ── Enrollments ───────────────────────────────────────────────────────────

  async enrollStudent(courseId: string, dto: EnrollStudentDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, schoolId },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');
    if (!course.isActive) throw new BadRequestException('Kurs faol emas');

    const student = await this.prisma.user.findFirst({
      where: { id: dto.studentId, schoolId, role: UserRole.STUDENT as any },
    });
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    // Check already enrolled
    const existing = await this.prisma.courseEnrollment.findFirst({
      where: { courseId, studentId: dto.studentId },
    });
    if (existing) {
      if (existing.status === 'active') throw new ConflictException('O\'quvchi bu kursda allaqachon o\'qiyapti');
      // Re-enroll if dropped/completed
      return this.prisma.courseEnrollment.update({
        where: { id: existing.id },
        data: { status: 'active', enrolledAt: new Date(), notes: dto.notes },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    // Check capacity
    const currentCount = await this.prisma.courseEnrollment.count({
      where: { courseId, status: 'active' },
    });
    if (currentCount >= course.maxStudents) {
      throw new BadRequestException(`Kurs to'la (${course.maxStudents} ta o'rin)`);
    }

    return this.prisma.courseEnrollment.create({
      data: {
        schoolId,
        courseId,
        studentId: dto.studentId,
        notes: dto.notes,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateEnrollment(
    courseId: string,
    enrollmentId: string,
    dto: UpdateEnrollmentDto,
    currentUser: JwtPayload,
  ) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { id: enrollmentId, courseId, schoolId: currentUser.schoolId! },
    });
    if (!enrollment) throw new NotFoundException('Ro\'yxatga olish topilmadi');

    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.grade !== undefined)  data.grade = dto.grade;
    if (dto.notes !== undefined)  data.notes = dto.notes;

    return this.prisma.courseEnrollment.update({ where: { id: enrollmentId }, data });
  }

  async removeEnrollment(courseId: string, enrollmentId: string, currentUser: JwtPayload) {
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { id: enrollmentId, courseId, schoolId: currentUser.schoolId! },
    });
    if (!enrollment) throw new NotFoundException('Ro\'yxatga olish topilmadi');

    await this.prisma.courseEnrollment.delete({ where: { id: enrollmentId } });
    return { message: 'O\'quvchi kursdan chiqarildi' };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    const [totalCourses, activeCourses, totalEnrollments, completedEnrollments] =
      await this.prisma.$transaction([
        this.prisma.course.count({ where: { schoolId } }),
        this.prisma.course.count({ where: { schoolId, isActive: true } }),
        this.prisma.courseEnrollment.count({ where: { schoolId, status: 'active' } }),
        this.prisma.courseEnrollment.count({ where: { schoolId, status: 'completed' } }),
      ]);

    const totalFinished = completedEnrollments + totalEnrollments;
    const completionRate = totalFinished > 0
      ? Math.round((completedEnrollments / totalFinished) * 100)
      : 0;

    return {
      totalCourses,
      activeCourses,
      activeStudents: totalEnrollments,
      completionRate,
    };
  }

  /** My courses — for students */
  async getMyCourses(currentUser: JwtPayload) {
    return this.prisma.courseEnrollment.findMany({
      where: { studentId: currentUser.sub, schoolId: currentUser.schoolId! },
      include: {
        course: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  // ── CourseMaterials ───────────────────────────────────────────────────────

  /**
   * Kurs materiallarini olish.
   * schoolId ga asoslanadi — filialdan mustaqil (barcha filial o'qituvchilari ko'radi).
   */
  async getMaterials(courseId: string, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Kurs mavjudligini tekshirish (schoolId bo'yicha — branchId yoki scope e'tiborsiz)
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, schoolId },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    return this.prisma.courseMaterial.findMany({
      where: { courseId, schoolId },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createMaterial(
    courseId: string,
    dto: CreateCourseMaterialDto,
    currentUser: JwtPayload,
  ) {
    const schoolId = currentUser.schoolId!;

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, schoolId },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    return this.prisma.courseMaterial.create({
      data: {
        schoolId,
        courseId,
        title:       dto.title,
        description: dto.description,
        fileUrl:     dto.fileUrl,
        type:        dto.type ?? 'document',
        isPublic:    dto.isPublic ?? true,
        sortOrder:   dto.sortOrder ?? 0,
        createdById: currentUser.sub,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateMaterial(
    courseId: string,
    materialId: string,
    dto: UpdateCourseMaterialDto,
    currentUser: JwtPayload,
  ) {
    const material = await this.prisma.courseMaterial.findFirst({
      where: { id: materialId, courseId, schoolId: currentUser.schoolId! },
    });
    if (!material) throw new NotFoundException('Material topilmadi');

    const data: any = {};
    if (dto.title       !== undefined) data.title       = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.fileUrl     !== undefined) data.fileUrl     = dto.fileUrl;
    if (dto.type        !== undefined) data.type        = dto.type;
    if (dto.isPublic    !== undefined) data.isPublic    = dto.isPublic;
    if (dto.sortOrder   !== undefined) data.sortOrder   = dto.sortOrder;

    return this.prisma.courseMaterial.update({
      where: { id: materialId },
      data,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeMaterial(courseId: string, materialId: string, currentUser: JwtPayload) {
    const material = await this.prisma.courseMaterial.findFirst({
      where: { id: materialId, courseId, schoolId: currentUser.schoolId! },
    });
    if (!material) throw new NotFoundException('Material topilmadi');

    await this.prisma.courseMaterial.delete({ where: { id: materialId } });
    return { message: 'Material o\'chirildi' };
  }
}
