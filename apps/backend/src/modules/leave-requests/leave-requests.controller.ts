import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { LeaveRequestsService, CreateLeaveRequestDto, ReviewLeaveDto } from './leave-requests.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BranchContext } from '@/common/decorators/branch-context.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('leave-requests')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'leave-requests', version: '1' })
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  @Post()
  @Roles(
    UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
    UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: "Ta'til so'rovi yuborish" })
  create(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.service.create(dto, user, branchCtx);
  }

  @Get()
  @Roles(
    UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
    UserRole.LIBRARIAN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL, UserRole.STUDENT, UserRole.PARENT,
  )
  @ApiOperation({ summary: "Ta'til so'rovlari ro'yxati" })
  findAll(
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(user, branchCtx, { status });
  }

  @Get(':id')
  @Roles(
    UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
    UserRole.LIBRARIAN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL, UserRole.STUDENT, UserRole.PARENT,
  )
  @ApiOperation({ summary: "So'rov tafsiloti" })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @BranchContext() branchCtx: string | null,
  ) {
    return this.service.findOne(id, user, branchCtx);
  }

  @Put(':id/review')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: "So'rovni tasdiqlash yoki rad etish" })
  review(
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.review(id, dto, user);
  }

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
    UserRole.LIBRARIAN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
    UserRole.VICE_PRINCIPAL, UserRole.STUDENT,
  )
  @ApiOperation({ summary: "So'rovni bekor qilish" })
  cancel(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.cancel(id, user);
  }
}
