import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('attendance')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'attendance', version: '1' })
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Davomat belgilash' })
  mark(@Body() dto: MarkAttendanceDto, @CurrentUser() user: JwtPayload) {
    return this.attendanceService.markAttendance(dto, user);
  }

  @Get('report')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'Davomat hisoboti' })
  getReport(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getReport(user, classId, startDate, endDate);
  }

  @Get('today/summary')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'Bugungi davomat xulosasi (dashboard widget)' })
  getTodaySummary(@CurrentUser() user: JwtPayload) {
    return this.attendanceService.getTodaySummary(user);
  }

  @Get('student/:id/history')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'O\'quvchi davomat tarixi' })
  getStudentHistory(
    @Param('id') studentId: string,
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit = 30,
  ) {
    return this.attendanceService.getStudentHistory(studentId, user, +limit);
  }
}
