import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { TreasuryModule } from '@/modules/treasury/treasury.module';

@Module({
  imports: [PrismaModule, TreasuryModule],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
