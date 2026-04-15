import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [CronService],
})
export class AppCronModule {}
