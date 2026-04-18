import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExamsService, BulkCreateExamDto, BulkResultsDto } from './exams.service';
import { CreateExamDto, UpdateExamDto } from './dto/create-exam.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('exams')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'exams', version: '1' })
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('upcoming')
  @Roles(
    UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER,
    UserRole.CLASS_TEACHER, UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Yaqin imtihonlar (dashboard widget)' })
  getUpcoming(
    @CurrentUser() user: JwtPayload,
    @Query('days') days = 7,
  ) {
    return this.examsService.getUpcoming(user, +days);
  }

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Imtihonlar ro\'yxati' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.examsService.findAll(user, classId, subjectId);
  }

  @Get(':id')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Imtihon ma\'lumoti' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.examsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Imtihon yaratish' })
  create(@Body() dto: CreateExamDto, @CurrentUser() user: JwtPayload) {
    return this.examsService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Imtihonni yangilash' })
  update(@Param('id') id: string, @Body() dto: UpdateExamDto, @CurrentUser() user: JwtPayload) {
    return this.examsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Imtihonni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.examsService.remove(id, user);
  }

  @Get(':id/results')
  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Imtihon natijalari va statistika' })
  getResults(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.examsService.getResults(id, user);
  }

  @Put(':id/publish')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Imtihonni nashr etish' })
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.examsService.publish(id, user);
  }

  @Post(':id/results/bulk')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Imtihon natijalarini toplu kiritish' })
  submitBulkResults(
    @Param('id') id: string,
    @Body() dto: BulkResultsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.examsService.submitBulkResults(id, dto, user);
  }

  @Post('bulk')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Ko\'p sinflar uchun toplu imtihon yaratish' })
  bulkCreate(@Body() dto: BulkCreateExamDto, @CurrentUser() user: JwtPayload) {
    return this.examsService.bulkCreate(dto, user);
  }
}
