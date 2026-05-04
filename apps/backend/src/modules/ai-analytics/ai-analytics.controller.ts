import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AiAnalyticsService } from './ai-analytics.service';

@ApiTags('ai-analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'ai-analytics', version: '1' })
export class AiAnalyticsController {
  constructor(private readonly aiService: AiAnalyticsService) {}

  @Get('students')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'O\'quvchilar risk profili (AI Analytics)' })
  getStudentProfiles(@CurrentUser() user: JwtPayload) {
    return this.aiService.getStudentRiskProfiles(user);
  }

  @Get('dashboard')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'AI Analytics dashboard summary' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.aiService.getDashboardSummary(user);
  }
}
