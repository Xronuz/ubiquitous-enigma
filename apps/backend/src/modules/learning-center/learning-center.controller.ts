import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  LearningCenterService, CreateCourseDto, UpdateCourseDto,
  EnrollStudentDto, UpdateEnrollmentDto,
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
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
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
    UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Kurslar ro\'yxati' })
  @ApiQuery({ name: 'search', required: false })
  getCourses(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.service.getCourses(user, search);
  }

  @Get('courses/:id')
  @Roles(
    UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Kurs tafsilotlari (o\'quvchilar bilan)' })
  getCourseById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.getCourseById(id, user);
  }

  @Post('courses')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Yangi kurs yaratish' })
  createCourse(@Body() dto: CreateCourseDto, @CurrentUser() user: JwtPayload) {
    return this.service.createCourse(dto, user);
  }

  @Put('courses/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Kursni yangilash' })
  updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateCourse(id, dto, user);
  }

  @Delete('courses/:id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Kursni o\'chirish' })
  removeCourse(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.removeCourse(id, user);
  }

  // ── Enrollments ───────────────────────────────────────────────────────────

  @Post('courses/:id/enroll')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'O\'quvchini kursga ro\'yxatdan o\'tkazish' })
  enrollStudent(
    @Param('id') courseId: string,
    @Body() dto: EnrollStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.enrollStudent(courseId, dto, user);
  }

  @Put('courses/:id/enrollments/:enrollmentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
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
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'O\'quvchini kursdan chiqarish' })
  removeEnrollment(
    @Param('id') courseId: string,
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeEnrollment(courseId, enrollmentId, user);
  }
}
