import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpCode, HttpStatus, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  PayrollService,
  CreateStaffSalaryDto,
  UpdateStaffSalaryDto,
  CreateAdvanceDto,
  AdminIssueAdvanceDto,
  ReviewAdvanceDto,
  CreatePayrollDto,
  UpdatePayrollItemDto,
} from './payroll.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BranchContext } from '@/common/decorators/branch-context.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

const MANAGERS = [UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT];
const ALL_STAFF = [
  UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER,
  UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
];

@ApiTags('payroll')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'payroll', version: '1' })
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  // ── Tariff Reference ─────────────────────────────────────────────────────

  @Get('tariff-reference')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: "UZ 2026 tarif koeffitsientlari va ustamalar (reference)" })
  getTariffReference() {
    return this.service.getTariffReference();
  }

  @Post('tariff-preview')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Tarif bo'yicha oylik maosh preview hisoblash" })
  previewTariff(
    @Body() dto: Partial<CreateStaffSalaryDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.previewTariff(dto, user.schoolId ?? undefined);
  }

  // ── Statistics ────────────────────────────────────────────────────────────

  @Get('stats')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Maosh statistikasi" })
  getStatistics(@CurrentUser() user: JwtPayload) {
    return this.service.getStatistics(user);
  }

  // ── Staff Salary Configs ──────────────────────────────────────────────────

  @Get('staff')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Barcha xodimlar maosh konfiguratsiyasi' })
  getAllSalaryConfigs(@CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.service.getAllSalaryConfigs(user, branchCtx);
  }

  @Get('staff/unconfigured')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Maosh sozlanmagan xodimlar ro'yxati" })
  getStaffWithoutSalary(@CurrentUser() user: JwtPayload) {
    return this.service.getStaffWithoutSalary(user);
  }

  @Post('staff')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Xodim maosh konfiguratsiyasi yaratish' })
  createSalaryConfig(
    @Body() dto: CreateStaffSalaryDto,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.service.createSalaryConfig(dto, user, branchCtx);
  }

  @Put('staff/:id')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Xodim maosh konfiguratsiyasini yangilash' })
  updateSalaryConfig(
    @Param('id') id: string,
    @Body() dto: UpdateStaffSalaryDto,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.service.updateSalaryConfig(id, dto, user, branchCtx);
  }

  @Delete('staff/:id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Maosh konfiguratsiyasini o'chirish" })
  deleteSalaryConfig(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.service.deleteSalaryConfig(id, user, branchCtx);
  }

  // ── Advances ──────────────────────────────────────────────────────────────

  @Get('advances')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: "Avans so'rovlari" })
  getAdvances(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.service.getAdvances(user, { status, month: month ? +month : undefined, year: year ? +year : undefined });
  }

  @Post('advances')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: "Avans so'rovi yuborish (o'zi uchun)" })
  createAdvance(@Body() dto: CreateAdvanceDto, @CurrentUser() user: JwtPayload) {
    return this.service.createAdvance(dto, user);
  }

  @Post('advances/issue')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Admin tomonidan xodimga to'g'ridan-to'g'ri avans berish (auto-approved)" })
  issueAdvance(@Body() dto: AdminIssueAdvanceDto, @CurrentUser() user: JwtPayload) {
    return this.service.issueAdvance(dto, user);
  }

  @Put('advances/:id/review')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Avans so'rovini ko'rib chiqish" })
  reviewAdvance(
    @Param('id') id: string,
    @Body() dto: ReviewAdvanceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reviewAdvance(id, dto, user);
  }

  @Put('advances/:id/paid')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Avans to'landi deb belgilash" })
  markAdvancePaid(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markAdvancePaid(id, user);
  }

  // ── Monthly Payrolls ──────────────────────────────────────────────────────

  @Get('monthly')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Oylik hisob-kitoblar ro'yxati" })
  getAllPayrolls(@CurrentUser() user: JwtPayload) {
    return this.service.getAllPayrolls(user);
  }

  @Get('monthly/:id')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Oylik hisob-kitob tafsiloti' })
  getPayrollDetail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.getPayrollDetail(id, user);
  }

  @Post('monthly/generate')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Oylik hisob-kitob yaratish (auto-generate)' })
  generatePayroll(@Body() dto: CreatePayrollDto, @CurrentUser() user: JwtPayload) {
    return this.service.generatePayroll(dto, user);
  }

  @Put('monthly/items/:itemId')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Hisob-kitob qatorini yangilash (soatlar, bonus, jarima)' })
  updatePayrollItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePayrollItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updatePayrollItem(itemId, dto, user);
  }

  @Put('monthly/:id/approve')
  @Roles(UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Oylik hisob-kitobni tasdiqlash' })
  approvePayroll(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.approvePayroll(id, user);
  }

  @Put('monthly/:id/paid')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Oylik to'landi deb belgilash" })
  markPayrollPaid(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markPayrollPaid(id, user);
  }

  @Delete('monthly/:id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Hisob-kitobni o'chirish (faqat draft)" })
  deletePayroll(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deletePayroll(id, user);
  }

  // ── Salary Slips ──────────────────────────────────────────────────────────

  @Get('monthly/:id/slip/:itemId')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Xodim maosh varaqasini PDF yuklab olish" })
  async downloadSalarySlip(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateSalarySlipPdf(id, itemId, user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="maosh-varaqasi-${itemId}.pdf"`);
    res.send(buffer);
  }

  @Post('monthly/:id/send-slips')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Barcha xodimlarga maosh varaqasini email orqali yuborish" })
  sendSalarySlips(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.sendSalarySlips(id, user);
  }
}
