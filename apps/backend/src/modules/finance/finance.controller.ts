import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BranchContext } from '@/common/decorators/branch-context.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.ACCOUNTANT)
@Controller({ path: 'finance', version: '1' })
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Moliyaviy dashboard statistikasi' })
  getDashboard(@CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.financeService.getDashboardStats(user, branchCtx);
  }

  @Get('monthly-revenue')
  @ApiOperation({ summary: 'Oylik daromad grafigi (so\'nggi N oy)' })
  getMonthlyRevenue(
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
    @Query('months') months = 12,
  ) {
    return this.financeService.getMonthlyRevenue(user, branchCtx, +months);
  }

  @Get('debtors')
  @ApiOperation({ summary: 'Qarzdorlar ro\'yxati' })
  getDebtors(@CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.financeService.getDebtors(user, branchCtx);
  }

  @Get('fee-summary')
  @ApiOperation({ summary: 'To\'lov tartiblari xulosa' })
  getFeeSummary(@CurrentUser() user: JwtPayload) {
    return this.financeService.getFeeStructureSummary(user);
  }
}
