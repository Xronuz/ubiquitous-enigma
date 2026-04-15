import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('messaging')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SCHOOL_ADMIN,
  UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER,
  UserRole.CLASS_TEACHER,
  UserRole.STUDENT,
  UserRole.PARENT,
)
@Controller({ path: 'messaging', version: '1' })
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Suhbatlar ro\'yxati' })
  getConversations(@CurrentUser() user: JwtPayload) {
    return this.messagingService.getConversations(user);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'O\'qilmagan xabarlar soni' })
  getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.messagingService.getUnreadCount(user);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Foydalanuvchi bilan xabarlar' })
  getMessages(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.messagingService.getMessages(userId, user, page, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Xabar yuborish' })
  sendMessage(@Body() dto: SendMessageDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.sendMessage(dto, user);
  }

  @Put(':userId/read')
  @ApiOperation({ summary: 'Xabarlarni o\'qilgan deb belgilash' })
  markAsRead(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.messagingService.markAsRead(userId, user);
  }

  @Delete('message/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bitta xabarni o\'chirish (faqat yuboruvchi)' })
  deleteMessage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.messagingService.deleteMessage(id, user);
  }

  @Delete(':userId/conversation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Foydalanuvchi bilan suhbatni o\'chirish (faqat o\'z xabarlari)' })
  deleteConversation(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return this.messagingService.deleteConversation(userId, user);
  }
}
