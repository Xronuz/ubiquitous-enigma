import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClubsService } from './clubs.service';
import { CreateClubDto, UpdateClubDto, ClubJoinRequestDto } from './dto/clubs.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BranchContext } from '@/common/decorators/branch-context.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

const ALL_SCHOOL = [
  UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
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
    @BranchContext() branchCtx: string | null,
    @Query('category') category?: string,
  ) {
    return this.clubsService.findAll(user, branchCtx, category);
  }

  @Get('my-clubs')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Mening to\'garaklarim (student)' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.clubsService.findMine(user);
  }

  @Get('my-requests')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Mening arizalarim (student)' })
  findMyRequests(@CurrentUser() user: JwtPayload) {
    return this.clubsService.findMyRequests(user);
  }

  @Get('led')
  @Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
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
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Yangi to\'garak yaratish' })
  create(
    @Body() dto: CreateClubDto,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.clubsService.create(dto, user, branchCtx);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'To\'garakni yangilash (admin yoki rahbar)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClubDto,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.clubsService.update(id, dto, user, branchCtx);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'To\'garakni o\'chirish' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.clubsService.remove(id, user, branchCtx);
  }

  // ─── Join Request Flow ────────────────────────────────────────────────────

  @Post(':id/join')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'To\'garakka qo\'shilish arizasi yuborish (PENDING)' })
  requestJoin(
    @Param('id') id: string,
    @Body() dto: ClubJoinRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clubsService.requestJoin(id, dto, user);
  }

  @Get(':id/requests')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'To\'garakka qo\'shilish arizalari ro\'yxati' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  getJoinRequests(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.clubsService.getJoinRequests(id, user, status);
  }

  @Patch(':id/requests/:requestId/approve')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Arizani tasdiqlash (rahbar yoki admin)' })
  approveRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clubsService.approveRequest(id, requestId, user);
  }

  @Patch(':id/requests/:requestId/reject')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'Arizani rad etish (rahbar yoki admin)' })
  rejectRequest(
    @Param('id') id: string,
    @Param('requestId') requestId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clubsService.rejectRequest(id, requestId, user);
  }

  // ─── Membership Management ────────────────────────────────────────────────

  @Delete(':id/leave')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'To\'garakdan chiqish' })
  leave(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.clubsService.leave(id, user);
  }

  @Get(':id/members')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @ApiOperation({ summary: 'To\'garak a\'zolari ro\'yxati' })
  getMembers(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.clubsService.getMembers(id, user, branchCtx);
  }

  @Delete(':id/members/:studentId')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.TEACHER, UserRole.CLASS_TEACHER)
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
