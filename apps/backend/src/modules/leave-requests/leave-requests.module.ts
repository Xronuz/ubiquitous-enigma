import { Module } from '@nestjs/common';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { EventsModule } from '@/modules/gateway/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [LeaveRequestsController],
  providers: [LeaveRequestsService],
})
export class LeaveRequestsModule {}
