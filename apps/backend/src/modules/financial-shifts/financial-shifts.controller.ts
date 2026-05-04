import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinancialShiftsService } from './financial-shifts.service';
import { OpenShiftDto, CloseShiftDto } from './dto/shifts.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

const SHIFT_ROLES = [
  UserRole.DIRECTOR,
  UserRole.BRANCH_ADMIN, UserRole.ACCOUNTANT,
];

@ApiTags('financial-shifts')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'financial-shifts', version: '1' })
export class FinancialShiftsController {
  constructor(private readonly svc: FinancialShiftsService) {}

  @Get()
  @Roles(...SHIFT_ROLES)
  @ApiOperation({ summary: 'Smena tarixi' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll(user, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('active')
  @Roles(...SHIFT_ROLES)
  @ApiOperation({ summary: "Joriy foydalanuvchi uchun ochiq smena (yo'q bo'lsa null)" })
  getActive(@CurrentUser() user: JwtPayload) {
    return this.svc.getActiveShift(user.schoolId!, user.branchId!);
  }

  @Get(':id')
  @Roles(...SHIFT_ROLES)
  @ApiOperation({ summary: 'Smena tafsiloti + to\'lovlar ro\'yxati' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(id, user);
  }

  @Post('open')
  @Roles(...SHIFT_ROLES)
  @ApiOperation({ summary: 'Yangi smena ochish' })
  open(@Body() dto: OpenShiftDto, @CurrentUser() user: JwtPayload) {
    return this.svc.openShift(dto, user);
  }

  @Patch(':id/close')
  @Roles(...SHIFT_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Smenani yopish (kunlik hisob-kitob)' })
  close(
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.closeShift(id, dto, user);
  }
}
