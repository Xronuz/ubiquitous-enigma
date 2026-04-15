import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { SuperAdminService, CreateSchoolDto, ToggleModuleDto } from './super-admin.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@eduplatform/types';

@ApiTags('super-admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller({ path: 'super-admin', version: '1' })
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform statistikasi' })
  getStats() {
    return this.superAdminService.getPlatformStats();
  }

  @Get('schools')
  @ApiOperation({ summary: 'Barcha maktablar' })
  getSchools(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.superAdminService.getSchools(+page, +limit, search);
  }

  @Get('schools/:id')
  @ApiOperation({ summary: 'Maktab ma\'lumoti' })
  getSchool(@Param('id') id: string) {
    return this.superAdminService.getSchool(id);
  }

  @Post('schools')
  @ApiOperation({ summary: 'Yangi maktab qo\'shish (onboarding)' })
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.superAdminService.createSchool(dto);
  }

  @Put('schools/:id')
  @ApiOperation({ summary: 'Maktabni yangilash' })
  updateSchool(@Param('id') id: string, @Body() dto: Partial<CreateSchoolDto>) {
    return this.superAdminService.updateSchool(id, dto);
  }

  @Get('schools/:id/modules')
  @ApiOperation({ summary: 'Maktab modullari' })
  getModules(@Param('id') id: string) {
    return this.superAdminService.getModules(id);
  }

  @Post('schools/:id/modules/toggle')
  @ApiOperation({ summary: 'Modul yoqish/o\'chirish' })
  toggleModule(@Param('id') id: string, @Body() dto: ToggleModuleDto) {
    return this.superAdminService.toggleModule(id, dto);
  }
}
