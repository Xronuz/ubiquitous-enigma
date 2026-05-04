import {
  Controller, Get, Post, Put, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branches.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

/** Filialga kirish huquqi bor barcha rollar */
const BRANCH_READERS = [
  UserRole.DIRECTOR,
  UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.ACCOUNTANT,
];

/** Filialni yaratish / tahrirlash / o'chirish — faqat school-wide */
const BRANCH_MANAGERS = [
  UserRole.DIRECTOR,
];

@ApiTags('branches')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'branches', version: '1' })
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles(...BRANCH_READERS)
  @ApiOperation({ summary: 'Maktab filiallarini ro\'yxati (director/admin uchun)' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.branchesService.findAll(user);
  }

  @Get(':id')
  @Roles(...BRANCH_READERS)
  @ApiOperation({ summary: 'Bitta filial tafsilotlari' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.branchesService.findOne(id, user);
  }

  @Post()
  @Roles(...BRANCH_MANAGERS)
  @ApiOperation({ summary: 'Yangi filial yaratish' })
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: JwtPayload) {
    return this.branchesService.create(dto, user);
  }

  @Put(':id')
  @Roles(...BRANCH_MANAGERS)
  @ApiOperation({ summary: 'Filial ma\'lumotlarini yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.branchesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...BRANCH_MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Filialni o\'chirish (bo\'sh bo\'lsa — to\'liq, aks holda deaktivatsiya)' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.branchesService.remove(id, user);
  }
}
