import { Controller, Get, Query, Param, Res, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ReportsService } from './reports.service';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

// Roles that can see cross-branch analytics
const ANALYTICS_ROLES = [
  UserRole.DIRECTOR, UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.ACCOUNTANT,
];

@ApiTags('reports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // ─── Analytics endpoints ───────────────────────────────────────────────

  @Get('analytics/pulse')
  @Roles(...ANALYTICS_ROLES)
  @ApiOperation({ summary: 'Maktab bugungi real-vaqt ko\'rsatkichlari (Pulse)' })
  getSchoolPulse(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getSchoolPulse(user);
  }

  @Get('analytics/finance')
  @Roles(...ANALYTICS_ROLES)
  @ApiOperation({ summary: 'Global moliyaviy hisobot — oyma-oy, filiallar bo\'yicha' })
  @ApiQuery({ name: 'months',   required: false, description: 'Necha oy (default: 12)' })
  @ApiQuery({ name: 'branchId', required: false })
  getGlobalFinance(
    @CurrentUser() user: JwtPayload,
    @Query('months')   months?:   string,
    @Query('branchId') branchId?: string,
  ) {
    return this.analyticsService.getGlobalFinanceReport(user, months ? Number(months) : 12, branchId);
  }

  @Get('analytics/branch-comparison')
  @Roles(...ANALYTICS_ROLES)
  @ApiOperation({ summary: 'Filiallarni akademik ko\'rsatkichlar bo\'yicha solishtirish' })
  getBranchComparison(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getBranchComparison(user);
  }

  @Get('analytics/marketing-roi')
  @Roles(...ANALYTICS_ROLES)
  @ApiOperation({ summary: 'Marketing manba × konversiya × daromad (ROI)' })
  @ApiQuery({ name: 'branchId', required: false })
  getMarketingROI(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.analyticsService.getMarketingROI(user, branchId);
  }

  @Get('analytics/alerts')
  @Roles(...ANALYTICS_ROLES)
  @ApiOperation({ summary: 'Smart Alerts — avto ogohlantirishlar' })
  getSmartAlerts(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getSmartAlerts(user);
  }

  @Get('analytics/at-risk')
  @Roles(...ANALYTICS_ROLES, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Xavf ostidagi o\'quvchilar — davomat va ball bo\'yicha' })
  @ApiQuery({ name: 'attendanceThreshold', required: false, description: 'Davomat chegarasi % (default: 75)' })
  @ApiQuery({ name: 'gradeThreshold',      required: false, description: 'Ball chegarasi %  (default: 60)' })
  @ApiQuery({ name: 'classId',             required: false })
  getAtRiskStudents(
    @CurrentUser() user: JwtPayload,
    @Query('attendanceThreshold') att?:     string,
    @Query('gradeThreshold')      grade?:   string,
    @Query('classId')             classId?: string,
  ) {
    return this.reportsService.getAtRiskStudents(
      user,
      att   ? Number(att)   : 75,
      grade ? Number(grade) : 60,
      classId,
    );
  }

  // ─── Excel export ──────────────────────────────────────────────────────

  @Get('export/excel')
  @Roles(...ANALYTICS_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Excel eksport (students | payments | attendance)' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiQuery({ name: 'type',     required: true, enum: ['students', 'payments', 'attendance'] })
  @ApiQuery({ name: 'branchId', required: false })
  async exportExcel(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('type')     type:      'students' | 'payments' | 'attendance',
    @Query('branchId') branchId?: string,
  ) {
    const buf = await this.analyticsService.exportToExcel(user, type, branchId);
    const names: Record<string, string> = {
      students:   "o'quvchilar",
      payments:   "to'lovlar",
      attendance: 'davomat',
    };
    const filename = `${names[type] ?? type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buf.length),
    });
    res.end(buf);
  }

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
