import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'marketing', version: '1' })
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get('dashboard')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Marketing dashboard (lead analytics)' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.marketingService.getDashboard(user);
  }

  @Get('funnel')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lead funnel' })
  getFunnel(@CurrentUser() user: JwtPayload) {
    return this.marketingService.getFunnel(user);
  }

  @Get('sources')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lead source breakdown' })
  getSources(@CurrentUser() user: JwtPayload) {
    return this.marketingService.getSources(user);
  }

  @Get('monthly-trend')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Monthly lead trend' })
  getMonthlyTrend(@CurrentUser() user: JwtPayload) {
    return this.marketingService.getMonthlyTrend(user);
  }
}
