import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { EventsModule } from '@/modules/gateway/events.module';
import { TreasuryModule } from '@/modules/treasury/treasury.module';
import { FinancialShiftsModule } from '@/modules/financial-shifts/financial-shifts.module';

@Module({
  imports: [PrismaModule, EventsModule, TreasuryModule, FinancialShiftsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
