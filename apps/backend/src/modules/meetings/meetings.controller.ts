import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { MeetingsService, CreateMeetingDto, UpdateMeetingDto } from './meetings.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

const MANAGERS = [UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL];
const TEACHERS  = [UserRole.TEACHER, UserRole.CLASS_TEACHER];
const ALL_RELEVANT = [...MANAGERS, ...TEACHERS, UserRole.PARENT];

@ApiTags('meetings')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'meetings', version: '1' })
export class MeetingsController {
  constructor(private readonly service: MeetingsService) {}

  @Get('stats')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: 'Uchrashuvlar statistikasi' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.service.getStats(user);
  }

  @Get('my')
  @Roles(...ALL_RELEVANT)
  @ApiOperation({ summary: 'O\'zim tegishli uchrashuvlar (o\'qituvchi / ota-ona)' })
  getMyMeetings(@CurrentUser() user: JwtPayload) {
    return this.service.getMyMeetings(user);
  }

  @Get()
  @Roles(...MANAGERS, ...TEACHERS)
  @ApiOperation({ summary: 'Barcha uchrashuvlar ro\'yxati' })
  @ApiQuery({ name: 'status',    required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'from',      required: false })
  @ApiQuery({ name: 'to',        required: false })
  @ApiQuery({ name: 'page',      required: false, type: Number })
  @ApiQuery({ name: 'limit',     required: false, type: Number })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status')    status?: string,
    @Query('teacherId') teacherId?: string,
    @Query('from')      from?: string,
    @Query('to')        to?: string,
    @Query('page')      page?: number,
    @Query('limit')     limit?: number,
  ) {
    return this.service.findAll(user, {
      status, teacherId, from, to,
      page:  page  ? +page  : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Post()
  @Roles(...MANAGERS, ...TEACHERS)
  @ApiOperation({ summary: 'Uchrashuv yaratish' })
  create(@Body() dto: CreateMeetingDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @Roles(...ALL_RELEVANT)
  @ApiOperation({ summary: 'Uchrashuvni yangilash (holat, izoh, vaqt)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Uchrashuvni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
