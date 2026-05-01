import {
  Controller, Get, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService, AuditAction } from './audit.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('audit-logs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Maktab bo'yicha audit log tarixi — school_admin va vice_principal uchun
   */
  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Maktab audit log tarixi' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entity', required: false, type: String, description: 'Filter by entity: User, Grade, Attendance, Payment...' })
  @ApiQuery({ name: 'action', required: false, enum: ['create', 'update', 'delete', 'login', 'logout', 'export'] })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO date string' })
  getSchoolLogs(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('entity') entity?: string,
    @Query('action') action?: AuditAction,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.auditService.getSchoolLogs(user.schoolId!, {
      page: +page,
      limit: +limit,
      entity,
      action,
      userId,
      from,
      to,
    });
  }

  /**
   * Audit loglarni Excel sifatida yuklab olish
   */
  @Get('export')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Audit loglarni Excel sifatida eksport' })
  async exportLogs(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('entity') entity?: string,
    @Query('action') action?: AuditAction,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const buffer = await this.auditService.exportToExcel(user.schoolId!, { entity, action, from, to });
    const filename = `audit_log_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * Super admin — barcha maktablar bo'yicha audit loglar
   */
  @Get('all')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Barcha maktablar audit loglari (super_admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'schoolId', required: false, type: String })
  @ApiQuery({ name: 'entity', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: ['create', 'update', 'delete', 'login', 'logout', 'export'] })
  getAllLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('schoolId') schoolId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: AuditAction,
  ) {
    return this.auditService.getAllLogs({
      page: +page,
      limit: +limit,
      schoolId,
      entity,
      action,
    });
  }
}
