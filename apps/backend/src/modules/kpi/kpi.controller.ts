import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { KpiService } from './kpi.service';
import { CreateKpiMetricDto, UpdateKpiMetricDto, CreateKpiRecordDto } from './dto/create-kpi.dto';
import { KpiCategory } from '@prisma/client';

@ApiTags('kpi')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'kpi', version: '1' })
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('metrics')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrikalar ro\'yxati' })
  @ApiQuery({ name: 'category', required: false, enum: KpiCategory })
  findMetrics(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: KpiCategory,
  ) {
    return this.kpiService.findMetrics(user, category);
  }

  @Get('metrics/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika tafsilotlari + tarixi' })
  findMetric(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.kpiService.findMetric(id, user);
  }

  @Post('metrics')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika yaratish' })
  createMetric(@Body() dto: CreateKpiMetricDto, @CurrentUser() user: JwtPayload) {
    return this.kpiService.createMetric(dto, user);
  }

  @Put('metrics/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika yangilash' })
  updateMetric(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKpiMetricDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.kpiService.updateMetric(id, dto, user);
  }

  @Delete('metrics/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika o\'chirish' })
  deleteMetric(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.kpiService.deleteMetric(id, user);
  }

  @Post('records')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI qiymat kiritish' })
  createRecord(@Body() dto: CreateKpiRecordDto, @CurrentUser() user: JwtPayload) {
    return this.kpiService.createRecord(dto, user);
  }

  @Get('dashboard')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI dashboard (so\'nggi qiymatlar)' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.kpiService.getDashboard(user);
  }
}
