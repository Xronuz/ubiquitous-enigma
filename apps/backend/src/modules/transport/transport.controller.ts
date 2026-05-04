import {
  Controller, Get, Post, Put, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  TransportService, CreateRouteDto, UpdateRouteDto, AssignStudentDto,
} from './transport.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('transport')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'transport', version: '1' })
export class TransportController {
  constructor(private readonly transportService: TransportService) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Transport statistikasi' })
  getStats(@CurrentUser() user: JwtPayload) {
    return this.transportService.getStats(user);
  }

  // ── My route (student / parent) ───────────────────────────────────────────

  @Get('my-route')
  @Roles(
    UserRole.STUDENT, UserRole.PARENT,
    UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
  )
  @ApiOperation({ summary: 'Mening marshrutim (o\'quvchi/ota-ona)' })
  getMyRoute(@CurrentUser() user: JwtPayload) {
    return this.transportService.getMyRoute(user);
  }

  // ── Routes ────────────────────────────────────────────────────────────────

  @Get('routes')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Barcha marshrutlar ro\'yxati' })
  getRoutes(@CurrentUser() user: JwtPayload) {
    return this.transportService.getRoutes(user);
  }

  @Get('routes/:id')
  @Roles(
    UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: 'Marshrut tafsiloti (o\'quvchilar bilan)' })
  getRoute(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.transportService.getRoute(id, user);
  }

  @Post('routes')
  @Roles(UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Yangi marshrut yaratish' })
  createRoute(@Body() dto: CreateRouteDto, @CurrentUser() user: JwtPayload) {
    return this.transportService.createRoute(dto, user);
  }

  @Put('routes/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Marshrutni yangilash' })
  updateRoute(
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transportService.updateRoute(id, dto, user);
  }

  @Delete('routes/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Marshrutni o\'chirish' })
  removeRoute(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.transportService.removeRoute(id, user);
  }

  // ── Student assignment ────────────────────────────────────────────────────

  @Get('routes/:id/students')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Marshrutga biriktirilgan o\'quvchilar' })
  getStudentsByRoute(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.transportService.getStudentsByRoute(id, user);
  }

  @Post('routes/:id/students')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'O\'quvchini marshrutga biriktirish' })
  assignStudent(
    @Param('id') routeId: string,
    @Body() dto: AssignStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transportService.assignStudent(routeId, dto, user);
  }

  @Delete('routes/:id/students/:studentId')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'O\'quvchini marshrutdan olib tashlash' })
  removeStudentFromRoute(
    @Param('id') routeId: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.transportService.removeStudentFromRoute(routeId, studentId, user);
  }
}
