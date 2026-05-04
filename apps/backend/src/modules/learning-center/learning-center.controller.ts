import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  LearningCenterService, CreateCourseDto, UpdateCourseDto,
  EnrollStudentDto, UpdateEnrollmentDto,
  CreateCourseMaterialDto, UpdateCourseMaterialDto,
} from './learning-center.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('learning-center')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'learning-center', version: '1' })
export class LearningCenterController {
  constructor(private readonly service: LearningCenterService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'O\'quv markazi statistikasi' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.service.getStats(user);
  }

  // ── My courses (student) ──────────────────────────────────────────────────

  @Get('my-courses')
  @Roles(UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'Mening kurslarim (o\'quvchi)' })
  getMyCourses(@CurrentUser() user: JwtPayload) {
    return this.service.getMyCourses(user);
  }

  // ── Courses CRUD ──────────────────────────────────────────────────────────

  @Get('courses')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Kurslar ro\'yxati' })
  @ApiQuery({ name: 'search', required: false })
  getCourses(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
  ) {
    return this.service.getCourses(user, search);
  }

  @Get('courses/:id')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Kurs tafsilotlari (o\'quvchilar bilan)' })
  getCourseById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getCourseById(id, user);
  }

  @Post('courses')
  @Roles(UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Yangi kurs yaratish' })
  createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createCourse(dto, user);
  }

  @Put('courses/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Kursni yangilash' })
  updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateCourse(id, dto, user);
  }

  @Delete('courses/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Kursni o\'chirish' })
  removeCourse(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.removeCourse(id, user);
  }

  // ── Enrollments ───────────────────────────────────────────────────────────

  @Post('courses/:id/enroll')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'O\'quvchini kursga ro\'yxatdan o\'tkazish' })
  enrollStudent(
    @Param('id') courseId: string,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.enrollStudent(courseId, dto, user);
  }

  @Put('courses/:id/enrollments/:enrollmentId')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Ro\'yxatga olishni yangilash (baho, holat)' })
  updateEnrollment(
    @Param('id') courseId: string,
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateEnrollment(courseId, enrollmentId, dto, user);
  }

  @Delete('courses/:id/enrollments/:enrollmentId')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'O\'quvchini kursdan chiqarish' })
  removeEnrollment(
    @Param('id') courseId: string,
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeEnrollment(courseId, enrollmentId, user);
  }

  // ── Course Materials ─────────────────────────────────────────────────────

  /**
   * Kurs materiallari — schoolId ga asoslanadi.
   * Barcha filial o'qituvchilari GLOBAL kurs materiallarini ko'ra oladi.
   */
  @Get('courses/:id/materials')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Kurs materiallarini olish (filialdan mustaqil)' })
  getMaterials(@Param('id') courseId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getMaterials(courseId, user);
  }

  @Post('courses/:id/materials')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Kursga material qo\'shish' })
  createMaterial(
    @Param('id') courseId: string,
    @Body() dto: CreateCourseMaterialDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createMaterial(courseId, dto, user);
  }

  @Put('courses/:id/materials/:materialId')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Materialni yangilash' })
  updateMaterial(
    @Param('id') courseId: string,
    @Param('materialId') materialId: string,
    @Body() dto: UpdateCourseMaterialDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateMaterial(courseId, materialId, dto, user);
  }

  @Delete('courses/:id/materials/:materialId')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Materialni o\'chirish' })
  removeMaterial(
    @Param('id') courseId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeMaterial(courseId, materialId, user);
  }
}
