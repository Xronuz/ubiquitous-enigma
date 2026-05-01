import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { SystemConfigService, SystemConfigMap } from './system-config.service';

class UpdateConfigDto implements Partial<SystemConfigMap> {
  bhm?: number;
  academic_year?: string;
  school_name?: string;
  school_phone?: string;
  school_address?: string;
  pass_threshold?: number;
  work_days?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'system-config', version: '1' })
export class SystemConfigController {
  constructor(private readonly service: SystemConfigService) {}

  /** GET /system-config — barcha konfiguratsiyalarni olish */
  @Get()
  getAll(@CurrentUser() user: JwtPayload) {
    return this.service.getAll(user.schoolId!);
  }

  /** PATCH /system-config — qiymatlarni yangilash (faqat school_admin) */
  @Patch()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateConfigDto,
  ) {
    await this.service.setBulk(user.schoolId!, dto as any);
    return this.service.getAll(user.schoolId!);
  }
}
