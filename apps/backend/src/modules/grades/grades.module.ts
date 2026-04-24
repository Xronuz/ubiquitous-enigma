import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { CoinsModule } from '@/modules/coins/coins.module';

@Module({
  imports: [NotificationsModule, CoinsModule],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
