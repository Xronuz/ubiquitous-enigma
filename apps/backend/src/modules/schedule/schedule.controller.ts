import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Version, ParseIntPipe, DefaultValuePipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('schedule')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'schedule', version: '1' })
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('check-conflict')
  @ApiOperation({ summary: 'Jadval ziddiyatini tekshirish' })
  @ApiQuery({ name: 'dayOfWeek', required: true })
  @ApiQuery({ name: 'timeSlot', required: true, type: Number })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'roomNumber', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'excludeId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  checkConflict(
    @CurrentUser() user: JwtPayload,
    @Query('dayOfWeek') dayOfWeek: string,
    @Query('timeSlot', ParseIntPipe) timeSlot: number,
    @Query('teacherId') teacherId?: string,
    @Query('roomNumber') roomNumber?: string,
    @Query('roomId') roomId?: string,
    @Query('classId') classId?: string,
    @Query('excludeId') excludeId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.scheduleService.checkConflict(user, {
      dayOfWeek, timeSlot, teacherId, roomNumber, roomId, classId, excludeId, branchId,
    });
  }

  @Get('today')
  @ApiOperation({ summary: 'Bugungi darslar' })
  getToday(@CurrentUser() user: JwtPayload) {
    return this.scheduleService.getToday(user);
  }

  @Get('week')
  @ApiOperation({ summary: 'Haftalik jadval' })
  @ApiQuery({ name: 'classId', required: false })
  getWeek(@CurrentUser() user: JwtPayload, @Query('classId') classId?: string) {
    return this.scheduleService.getWeek(user, classId);
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Sinf jadvali' })
  findByClass(@Param('classId') classId: string, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.findByClass(classId, user);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Jadvalga dars qo\'shish' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Darsni yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateScheduleDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Darsni jadvaldan o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.remove(id, user);
  }

  @Get('teacher/:teacherId/cross-branch')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: "O'qituvchining barcha filiallardagi darslarini olish (UI greyed-out uchun)" })
  @ApiQuery({ name: 'viewerBranchId', required: false })
  getTeacherCrossBranch(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: JwtPayload,
    @Query('viewerBranchId') viewerBranchId?: string,
  ) {
    return this.scheduleService.getTeacherCrossBranch(teacherId, user, viewerBranchId ?? user.branchId);
  }
}
