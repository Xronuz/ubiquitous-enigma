import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard }  from '@/common/guards/jwt-auth.guard';
import { RolesGuard }    from '@/common/guards/roles.guard';
import { Roles }         from '@/common/decorators/roles.decorator';
import { CurrentUser }   from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { RoomsService, CreateRoomDto, UpdateRoomDto } from './rooms.service';

const ROOM_READERS = [
  UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR,
  UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
];

const ROOM_MANAGERS = [
  UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR,
  UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
];

@ApiTags('rooms')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'rooms', version: '1' })
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Roles(...ROOM_READERS)
  @ApiOperation({ summary: 'Xonalar ro\'yxati' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.roomsService.findAll(user, branchId);
  }

  @Get(':id')
  @Roles(...ROOM_READERS)
  @ApiOperation({ summary: 'Xona tafsilotlari (jadval bilan)' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.findOne(id, user);
  }

  @Post()
  @Roles(...ROOM_MANAGERS)
  @ApiOperation({ summary: 'Yangi xona yaratish' })
  create(@Body() dto: CreateRoomDto, @CurrentUser() user: JwtPayload) {
    return this.roomsService.create(dto, user);
  }

  @Put(':id')
  @Roles(...ROOM_MANAGERS)
  @ApiOperation({ summary: 'Xonani yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...ROOM_MANAGERS)
  @ApiOperation({ summary: 'Xonani o\'chirish (jadval yo\'q bo\'lsa hard delete, aks holda deactivate)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.roomsService.remove(id, user);
  }
}
