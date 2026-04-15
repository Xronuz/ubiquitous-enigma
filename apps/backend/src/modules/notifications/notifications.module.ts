import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationQueueService } from './notification-queue.service';
import { EventsModule } from '@/modules/gateway/events.module';

@Module({
  imports: [EventsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    MailService,
    SmsService,
    NotificationProcessor,
    NotificationQueueService,
  ],
  exports: [NotificationsService, NotificationQueueService, MailService, SmsService, EventsModule],
})
export class NotificationsModule {}
