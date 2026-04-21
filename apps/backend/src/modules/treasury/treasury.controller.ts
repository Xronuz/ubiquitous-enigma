import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TreasuryService } from './treasury.service';
import { CreateTreasuryDto, UpdateTreasuryDto } from './dto/treasury.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SetFinanceTypeDto {
  @ApiProperty({ enum: ['CENTRALIZED', 'DECENTRALIZED'] })
  @IsEnum(['CENTRALIZED', 'DECENTRALIZED'])
  financeType: 'CENTRALIZED' | 'DECENTRALIZED';
}

const MANAGERS = [UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR];
const VIEWERS  = [UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.ACCOUNTANT];

@ApiTags('treasury')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'treasury', version: '1' })
export class TreasuryController {
  constructor(private readonly svc: TreasuryService) {}

  @Get()
  @Roles(...VIEWERS)
  @ApiOperation({ summary: "Barcha g'aznalar ro'yxati" })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.svc.findAll(user);
  }

  @Get('summary')
  @Roles(...VIEWERS)
  @ApiOperation({ summary: "G'azna xulosasi (moliya rejimi + jami balanslar)" })
  getSummary(@CurrentUser() user: JwtPayload) {
    return this.svc.getFinanceSummary(user);
  }

  @Get(':id')
  @Roles(...VIEWERS)
  @ApiOperation({ summary: "Bitta g'azna tafsilotlari" })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(id, user);
  }

  @Post()
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "Yangi g'azna yaratish" })
  create(@Body() dto: CreateTreasuryDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user);
  }

  @Put(':id')
  @Roles(...MANAGERS)
  @ApiOperation({ summary: "G'azna ma'lumotlarini yangilash" })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTreasuryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "G'aznani o'chirish (bo'sh → to'liq, balance bor → xato)" })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.remove(id, user);
  }

  @Patch('finance-type')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Maktab moliya rejimini o\'zgartirish (CENTRALIZED/DECENTRALIZED)' })
  setFinanceType(@Body() dto: SetFinanceTypeDto, @CurrentUser() user: JwtPayload) {
    return this.svc.setFinanceType(user.schoolId!, dto.financeType, user);
  }
}
