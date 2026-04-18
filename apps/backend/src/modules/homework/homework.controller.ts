import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto, UpdateHomeworkDto, SubmitHomeworkDto, GradeSubmissionDto } from './dto/homework.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('homework')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'homework', version: '1' })
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Uyga vazifalar ro\'yxati' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.homeworkService.findAll(user, classId, subjectId);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Uyga vazifa ma\'lumoti' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.homeworkService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Uyga vazifa yaratish' })
  create(@Body() dto: CreateHomeworkDto, @CurrentUser() user: JwtPayload) {
    return this.homeworkService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Uyga vazifani yangilash' })
  update(@Param('id') id: string, @Body() dto: UpdateHomeworkDto, @CurrentUser() user: JwtPayload) {
    return this.homeworkService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Uyga vazifani o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.homeworkService.remove(id, user);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Uyga vazifani topshirish' })
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitHomeworkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.homeworkService.submit(id, dto, user);
  }

  @Put(':id/submissions/:submissionId/grade')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Topshiriqni baholash' })
  grade(
    @Param('id') homeworkId: string,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.homeworkService.grade(homeworkId, submissionId, dto, user);
  }

  @Get(':id/my-submission')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Mening topshirig\'im' })
  getMySubmission(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.homeworkService.getMySubmission(id, user);
  }
}
