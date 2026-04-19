import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GradesService, BulkGradesDto } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('grades')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'grades', version: '1' })
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Baholar ro\'yxati (rol bo\'yicha filtrlangan)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('studentId') studentId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.gradesService.findAll(user, { classId, subjectId, studentId, page: +page, limit: +limit });
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Baho qo\'shish' })
  create(@Body() dto: CreateGradeDto, @CurrentUser() user: JwtPayload) {
    return this.gradesService.create(dto, user);
  }

  @Post('bulk')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Bir vaqtda butun sinf uchun baho kiritish' })
  bulkCreate(@Body() dto: BulkGradesDto, @CurrentUser() user: JwtPayload) {
    return this.gradesService.bulkCreate(dto, user);
  }

  @Get('student/:id/gpa')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.STUDENT, UserRole.PARENT)
  @ApiOperation({ summary: 'O\'quvchi GPA (faqat raqam)' })
  getStudentGpa(
    @Param('id') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradesService.getStudentGpa(studentId, user);
  }

  @Get('class/:id/gpa')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Sinf bo\'yicha GPA xulosa' })
  getClassGpa(
    @Param('id') classId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradesService.getClassGpa(classId, user);
  }

  @Get('student/:id')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL, UserRole.SCHOOL_ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'O\'quvchi baholari' })
  getStudentGrades(
    @Param('id') studentId: string,
    @CurrentUser() user: JwtPayload,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.gradesService.getStudentGrades(studentId, user, subjectId);
  }

  @Get('class/:id/report')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Sinf jurnali (sahifalanadi)' })
  getClassReport(
    @Param('id') classId: string,
    @CurrentUser() user: JwtPayload,
    @Query('subjectId') subjectId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.gradesService.getClassReport(classId, user, subjectId, +page, +limit);
  }

  @Put(':id')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Bahoni yangilash' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateGradeDto>, @CurrentUser() user: JwtPayload) {
    return this.gradesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.VICE_PRINCIPAL, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Bahoni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.gradesService.remove(id, user);
  }
}
