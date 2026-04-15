import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeeStructuresService, CreateFeeStructureDto, UpdateFeeStructureDto } from './fee-structures.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('fee-structures')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'fee-structures', version: '1' })
export class FeeStructuresController {
  constructor(private readonly feeStructuresService: FeeStructuresService) {}

  @Get()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'To\'lov tartiblari ro\'yxati' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.feeStructuresService.findAll(user, academicYear);
  }

  @Get(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'To\'lov tartibi ma\'lumoti' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.feeStructuresService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Yangi to\'lov tartibi yaratish' })
  create(@Body() dto: CreateFeeStructureDto, @CurrentUser() user: JwtPayload) {
    return this.feeStructuresService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'To\'lov tartibini yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFeeStructureDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.feeStructuresService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'To\'lov tartibini o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.feeStructuresService.remove(id, user);
  }

  @Post(':id/generate-payments')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'To\'lov tartibidan payment yozuvlari yaratish' })
  generatePayments(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.feeStructuresService.generatePayments(id, user);
  }
}
