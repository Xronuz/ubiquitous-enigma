import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { EventsModule } from '@/modules/gateway/events.module';
import { ConflictDetectorService } from '@/common/utils/conflict-detector';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, ConflictDetectorService],
  exports: [ScheduleService, ConflictDetectorService],
})
export class ScheduleModule {}
