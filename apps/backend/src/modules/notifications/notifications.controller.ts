import { Controller, Get, Post, Put, Body, Param, Query, Patch, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { NotificationsService, SendNotificationDto } from './notifications.service';
import { NotificationQueueService } from './notification-queue.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly queueService: NotificationQueueService,
  ) {}

  @Post('send')
  @Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'Bildirishnoma yuborish' })
  send(@Body() dto: SendNotificationDto, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.send(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'O\'z bildirishnomalar' })
  getMyNotifications(
    @CurrentUser('sub') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getMyNotifications(userId, +page, +limit);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'O\'qildi deb belgilash' })
  markAsRead(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Hammasini o\'qildi deb belgilash' })
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Bildirishnoma sozlamalarini olish' })
  getPreferences(@CurrentUser('sub') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Bildirishnoma sozlamalarini yangilash' })
  updatePreferences(
    @CurrentUser('sub') userId: string,
    @Body() body: Record<string, boolean>,
  ) {
    return this.notificationsService.updatePreferences(userId, body);
  }

  @Get('queue-stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Notification queue statistikasi (super_admin/school_admin)' })
  getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Barcha o\'z bildirishnomalarni o\'chirish' })
  deleteAll(@CurrentUser('sub') userId: string) {
    return this.notificationsService.deleteAll(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bitta bildirishnomani o\'chirish' })
  deleteOne(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.notificationsService.deleteOne(id, userId);
  }

  @Delete('queue-failed')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Failed queue joblarni tozalash (super_admin)' })
  async cleanFailedJobs() {
    const count = await this.queueService.cleanFailedJobs();
    return { cleaned: count, message: `${count} ta failed job tozalandi` };
  }
}
