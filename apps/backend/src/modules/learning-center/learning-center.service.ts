import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import {
  IsString, IsOptional, IsInt, IsBoolean, IsNumber, IsDateString,
  Min, Max, MaxLength, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

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

  async getCourses(currentUser: JwtPayload, search?: string) {
    const where: any = { schoolId: currentUser.schoolId! };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.map(c => ({
      ...c,
      enrolledCount: c._count.enrollments,
    }));
  }

  async getCourseById(id: string, currentUser: JwtPayload) {
    const course = await this.prisma.course.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
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

  async createCourse(dto: CreateCourseDto, currentUser: JwtPayload) {
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
        name: dto.name,
        description: dto.description,
        teacherId: dto.teacherId,
        duration: dto.duration,
        price: dto.price,
        maxStudents: dto.maxStudents ?? 30,
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
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
}
