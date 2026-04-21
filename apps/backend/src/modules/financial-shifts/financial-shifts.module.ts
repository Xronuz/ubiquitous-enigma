import { Module } from '@nestjs/common';
import { FinancialShiftsController } from './financial-shifts.controller';
import { FinancialShiftsService } from './financial-shifts.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinancialShiftsController],
  providers: [FinancialShiftsService],
  exports: [FinancialShiftsService],  // PaymentsModule shift guard uchun
})
export class FinancialShiftsModule {}
