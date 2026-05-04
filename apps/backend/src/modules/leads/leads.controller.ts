import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard }  from '@/common/guards/jwt-auth.guard';
import { RolesGuard }    from '@/common/guards/roles.guard';
import { Roles }         from '@/common/decorators/roles.decorator';
import { CurrentUser }   from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import {
  LeadsService, CreateLeadDto, UpdateLeadDto,
  AddCommentDto, ConvertToStudentDto,
} from './leads.service';

// Rollar:
//   CRM_READ:    barcha CRM rollar — leads ro'yxati + tafsilot
//   CRM_WRITE:   branch_admin va undan yuqori — lead yaratish/tahrirlash/izoh
//   CRM_CONVERT: director / branch_admin — konvertatsiya
const CRM_READ: UserRole[] = [
  UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
  UserRole.VICE_PRINCIPAL, UserRole.ACCOUNTANT,
];

const CRM_WRITE: UserRole[] = [
  UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
  UserRole.VICE_PRINCIPAL, UserRole.ACCOUNTANT,
];

const CRM_CONVERT: UserRole[] = [
  UserRole.DIRECTOR, UserRole.BRANCH_ADMIN,
];

@ApiTags('leads')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'leads', version: '1' })
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ── Analytics (oldin e'lon qilamiz — Express routing bug oldini olamiz) ──

  @Get('analytics')
  @Roles(...CRM_READ)
  @ApiOperation({ summary: 'CRM statistika: source/status bo\'yicha tahlil' })
  @ApiQuery({ name: 'branchId', required: false })
  getAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.leadsService.getAnalytics(user, branchId);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles(...CRM_READ)
  @ApiOperation({ summary: 'Leadlar ro\'yxati (filial + status + qidiruv filter)' })
  @ApiQuery({ name: 'status',       required: false })
  @ApiQuery({ name: 'source',       required: false })
  @ApiQuery({ name: 'search',       required: false })
  @ApiQuery({ name: 'branchId',     required: false })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'page',         required: false, type: Number })
  @ApiQuery({ name: 'limit',        required: false, type: Number })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status')       status?: string,
    @Query('source')       source?: string,
    @Query('search')       search?: string,
    @Query('branchId')     branchId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number = 50,
  ) {
    return this.leadsService.findAll(user, { status, source, search, branchId, assignedToId, page, limit });
  }

  @Get(':id')
  @Roles(...CRM_READ)
  @ApiOperation({ summary: 'Lead tafsilotlari (izohlar bilan)' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.leadsService.findOne(id, user);
  }

  @Post()
  @Roles(...CRM_WRITE)
  @ApiOperation({ summary: 'Yangi lead yaratish (duplicate tekshiruvi bilan)' })
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: JwtPayload) {
    return this.leadsService.create(dto, user);
  }

  @Put(':id')
  @Roles(...CRM_WRITE)
  @ApiOperation({ summary: 'Leadni tahrirlash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...CRM_CONVERT)
  @ApiOperation({ summary: "Leadni o'chirish (converted bo'lsa taqiqlangan)" })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.leadsService.remove(id, user);
  }

  // ── Status quick-update ───────────────────────────────────────────────────

  @Patch(':id/status')
  @Roles(...CRM_WRITE)
  @ApiOperation({ summary: 'Lead statusini tezkor yangilash (voronka bosqichi)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.update(id, { status: status as any }, user);
  }

  // ── Assignment ────────────────────────────────────────────────────────────

  @Patch(':id/assign')
  @Roles(...CRM_CONVERT)
  @ApiOperation({ summary: "Lead uchun mas'ul xodim biriktirish" })
  assign(
    @Param('id') id: string,
    @Body('assignedToId') assignedToId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.update(id, { assignedToId }, user);
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  @Post(':id/comments')
  @Roles(...CRM_WRITE)
  @ApiOperation({ summary: 'Leadga muloqot izohi qo\'shish' })
  addComment(
    @Param('id') leadId: string,
    @Body() dto: AddCommentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.addComment(leadId, dto, user);
  }

  @Delete(':id/comments/:commentId')
  @Roles(...CRM_WRITE)
  @ApiOperation({ summary: "Izohni o'chirish (muallif yoki admin)" })
  removeComment(
    @Param('id') leadId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.removeComment(leadId, commentId, user);
  }

  // ── THE BIG CONVERSION ────────────────────────────────────────────────────

  @Post(':id/convert')
  @Roles(...CRM_CONVERT)
  @ApiOperation({
    summary: 'Lead → O\'quvchi konvertatsiyasi',
    description:
      'Prisma.$transaction ichida: User(student) yaratish + ClassStudent + Lead.status=CONVERTED. ' +
      'Natijada yangi o\'quvchi ma\'lumotlari va vaqtinchalik parol qaytariladi.',
  })
  convertToStudent(
    @Param('id') leadId: string,
    @Body() dto: ConvertToStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.leadsService.convertToStudent(leadId, dto, user);
  }
}
