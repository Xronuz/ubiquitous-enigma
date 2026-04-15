import { Controller, Get, Post, Put, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AcademicCalendarService, CreateAcademicEventDto } from './academic-calendar.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('academic-calendar')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'academic-calendar', version: '1' })
export class AcademicCalendarController {
  constructor(private readonly service: AcademicCalendarService) {}

  @Get()
  @Roles(
    UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER,
    UserRole.CLASS_TEACHER, UserRole.STUDENT, UserRole.PARENT, UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Akademik kalendar tadbirlari' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO date (from)' })
  @ApiQuery({ name: 'to',   required: false, description: 'ISO date (to)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to')   to?: string,
  ) {
    return this.service.findAll(user, from, to);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Bir tadbir' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Tadbir qo\'shish' })
  create(@Body() dto: CreateAcademicEventDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Tadbirni yangilash' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateAcademicEventDto>, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Tadbirni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }

  // ─── Export Endpoints ──────────────────────────────────────────────────────

  @Get('export/pdf')
  @Roles(
    UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER,
    UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Akademik kalendarni PDF eksport' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportPdf(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to')   to?: string,
  ) {
    const buffer = await this.service.exportPdf(user, from, to);
    const filename = `akademik-kalendar-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('export/ical')
  @Roles(
    UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER,
    UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.STUDENT, UserRole.PARENT,
  )
  @ApiOperation({ summary: 'Akademik kalendarni iCal (.ics) eksport' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async exportICal(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to')   to?: string,
  ) {
    const ical = await this.service.exportICal(user, from, to);
    const filename = `akademik-kalendar-${Date.now()}.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(ical);
  }
}
