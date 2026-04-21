import { Module } from '@nestjs/common';
import { TreasuryController } from './treasury.controller';
import { TreasuryService } from './treasury.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TreasuryController],
  providers: [TreasuryService],
  exports: [TreasuryService],  // PaymentsModule import qiladi
})
export class TreasuryModule {}
