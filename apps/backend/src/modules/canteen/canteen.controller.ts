import {
  Controller, Get, Post, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CanteenService, CreateMenuDayDto } from './canteen.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('canteen')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'canteen', version: '1' })
export class CanteenController {
  constructor(private readonly canteenService: CanteenService) {}

  /** Haftalik menyu */
  @Get('week')
  @ApiOperation({ summary: 'Haftalik ovqatxona menyusi' })
  getWeekMenu(
    @CurrentUser() currentUser: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.canteenService.getWeekMenu(currentUser, from, to);
  }

  /** Bugungi menyu */
  @Get('today')
  @ApiOperation({ summary: 'Bugungi menyu' })
  getTodayMenu(@CurrentUser() currentUser: JwtPayload) {
    return this.canteenService.getTodayMenu(currentUser);
  }

  /** Bitta kun menyusi */
  @Get('day/:date')
  @ApiOperation({ summary: 'Belgilangan kun menyusi (YYYY-MM-DD)' })
  getDayMenu(
    @Param('date') date: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.canteenService.getDayMenu(date, currentUser);
  }

  /** Menyu yaratish / yangilash — faqat admin */
  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Menyu yaratish yoki yangilash' })
  upsert(
    @Body() dto: CreateMenuDayDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.canteenService.upsert(dto, currentUser);
  }

  /** Menyu o'chirish — faqat admin */
  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Menyu o\'chirish' })
  remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.canteenService.remove(id, currentUser);
  }
}
