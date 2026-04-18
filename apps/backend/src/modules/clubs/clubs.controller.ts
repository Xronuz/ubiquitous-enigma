import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClubsService } from './clubs.service';
import { CreateClubDto, UpdateClubDto } from './dto/clubs.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

const ALL_SCHOOL = [
  UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
  UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
  UserRole.STUDENT,
];

@ApiTags('clubs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'clubs', version: '1' })
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  @Get()
  @Roles(...ALL_SCHOOL)
  @ApiOperation({ summary: 'Barcha to\'garaklar ro\'yxati' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
  ) {
    return this.clubsService.findAll(user, category);
  }

  @Get('my-clubs')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Mening to\'garaklarim (student)' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.clubsService.findMine(user);
  }

  @Get('led')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Men rahbar bo\'lgan to\'garaklar' })
  findLed(@CurrentUser() user: JwtPayload) {
    return this.clubsService.findLed(user);
  }

  @Get(':id')
  @Roles(...ALL_SCHOOL)
  @ApiOperation({ summary: 'To\'garak tafsiloti' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clubsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Yangi to\'garak yaratish' })
  create(@Body() dto: CreateClubDto, @CurrentUser() user: JwtPayload) {
    return this.clubsService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'To\'garakni yangilash (admin yoki rahbar)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClubDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clubsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'To\'garakni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clubsService.remove(id, user);
  }

  @Post(':id/join')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'To\'garakka a\'zo bo\'lish' })
  join(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clubsService.join(id, user);
  }

  @Delete(':id/leave')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'To\'garakdan chiqish' })
  leave(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clubsService.leave(id, user);
  }

  @Get(':id/members')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'To\'garak a\'zolari ro\'yxati' })
  getMembers(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clubsService.getMembers(id, user);
  }

  @Delete(':id/members/:studentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'A\'zoni to\'garakdan chiqarish' })
  removeMember(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clubsService.removeMember(id, studentId, user);
  }
}
