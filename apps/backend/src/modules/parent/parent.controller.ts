import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ParentService, RequestChildLeaveDto } from './parent.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('parent')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT)
@Controller({ path: 'parent', version: '1' })
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  // ── Read endpoints ────────────────────────────────────────────────────────

  @Get('children')
  @ApiOperation({ summary: 'Farzandlar ro\'yxati' })
  getChildren(@CurrentUser() user: JwtPayload) {
    return this.parentService.getChildren(user);
  }

  @Get('child/:id')
  @ApiOperation({ summary: 'Farzand ma\'lumoti' })
  getChild(@Param('id') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.parentService.getChild(studentId, user);
  }

  @Get('child/:id/attendance')
  @ApiOperation({ summary: 'Farzand davomati' })
  getChildAttendance(
    @Param('id') studentId: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit = 30,
  ) {
    return this.parentService.getChildAttendance(studentId, user, limit);
  }

  @Get('child/:id/grades')
  @ApiOperation({ summary: 'Farzand baholari' })
  getChildGrades(@Param('id') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.parentService.getChildGrades(studentId, user);
  }

  @Get('child/:id/schedule')
  @ApiOperation({ summary: 'Farzand dars jadvali' })
  getChildSchedule(@Param('id') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.parentService.getChildSchedule(studentId, user);
  }

  @Get('child/:id/payments')
  @ApiOperation({ summary: 'Farzand to\'lovlari' })
  getChildPayments(@Param('id') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.parentService.getChildPayments(studentId, user);
  }

  // ── Mutation endpoints ────────────────────────────────────────────────────

  @Post('child/:id/leave-request')
  @ApiOperation({ summary: 'Farzand uchun ta\'til so\'rovi yuborish' })
  requestChildLeave(
    @Param('id') studentId: string,
    @Body() dto: RequestChildLeaveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.parentService.requestChildLeave(studentId, dto, user);
  }

  @Get('child/:id/leave-requests')
  @ApiOperation({ summary: 'Farzandning ta\'til so\'rovlari' })
  getChildLeaveRequests(@Param('id') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.parentService.getChildLeaveRequests(studentId, user);
  }
}
