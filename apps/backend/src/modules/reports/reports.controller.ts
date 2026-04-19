import { Controller, Get, Query, Param, Res, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ReportsService } from './reports.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── JSON endpoints ────────────────────────────────────────────────────

  @Get('attendance')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'Davomat xulosasi (JSON)' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'month',   required: false, description: 'YYYY-MM format' })
  getAttendanceSummary(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('month')   month?: string,
  ) {
    return this.reportsService.getAttendanceSummary(user, classId, month);
  }

  @Get('grades')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Baholar xulosasi (JSON)' })
  @ApiQuery({ name: 'classId',   required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  getGradesSummary(
    @CurrentUser() user: JwtPayload,
    @Query('classId')   classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.reportsService.getGradesSummary(user, classId, subjectId);
  }

  @Get('finance')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Moliyaviy xulosa (JSON)' })
  getFinanceSummary(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getFinanceSummary(user);
  }

  // ─── PDF endpoints ─────────────────────────────────────────────────────

  @Get('attendance/pdf')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Davomat hisoboti — PDF yuklab olish' })
  @ApiProduces('application/pdf')
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'month',   required: false, description: 'YYYY-MM' })
  async downloadAttendancePdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('classId') classId?: string,
    @Query('month')   month?: string,
  ) {
    const pdf = await this.reportsService.generateAttendancePdf(user, classId, month);
    const filename = `davomat-${month ?? new Date().toISOString().slice(0, 7)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
    });
    res.end(pdf);
  }

  @Get('grades/pdf')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Baholar hisoboti — PDF yuklab olish' })
  @ApiProduces('application/pdf')
  @ApiQuery({ name: 'classId',   required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  async downloadGradesPdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('classId')   classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    const pdf = await this.reportsService.generateGradesPdf(user, classId, subjectId);
    const filename = `baholar-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
    });
    res.end(pdf);
  }

  @Get('report-card/:studentId/pdf')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Choraklik guvohnoma — PDF yuklab olish' })
  @ApiProduces('application/pdf')
  @ApiQuery({ name: 'quarter', required: false, description: '1-4 (default: 1)' })
  async downloadReportCard(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Param('studentId') studentId: string,
    @Query('quarter') quarter = '1',
  ) {
    const pdf = await this.reportsService.generateReportCard(user, studentId, Number(quarter));
    const filename = `guvohnoma-${quarter}-chorak-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
    });
    res.end(pdf);
  }

  @Get('finance/pdf')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Moliyaviy hisobot — PDF yuklab olish' })
  @ApiProduces('application/pdf')
  async downloadFinancePdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const pdf = await this.reportsService.generateFinancePdf(user);
    const filename = `moliya-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdf.length),
    });
    res.end(pdf);
  }
}
