import { Controller, Get, Post, Put, Body, Param, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PaymentsService, CreatePaymentDto } from './payments.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('payments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'To\'lov yaratish' })
  create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.create(dto, user);
  }

  @Get('history')
  @Roles(UserRole.ACCOUNTANT, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'To\'lovlar tarixi' })
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.paymentsService.getHistory(user, studentId, classId, status, from, to, +page, +limit);
  }

  @Get('report')
  @Roles(UserRole.ACCOUNTANT, UserRole.BRANCH_ADMIN, UserRole.DIRECTOR)
  @ApiOperation({ summary: 'Moliyaviy hisobot (dashboard uchun)' })
  getReport(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.getReport(user);
  }

  @Put(':id/paid')
  @Roles(UserRole.ACCOUNTANT, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'To\'langan deb belgilash' })
  markAsPaid(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.markAsPaid(id, user);
  }

  @Public()
  @Post('webhook/payme')
  @ApiOperation({ summary: 'Payme webhook (JSON-RPC 2.0)' })
  paymeWebhook(
    @Headers('authorization') auth: string,
    @Body() body: any,
  ) {
    return this.paymentsService.paymeWebhook(auth, body);
  }

  @Public()
  @Post('webhook/click')
  @ApiOperation({ summary: 'Click webhook' })
  clickWebhook(@Body() body: any) {
    return this.paymentsService.clickWebhook(body);
  }
}
