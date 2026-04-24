import { Module } from '@nestjs/common';
import { DisciplineController } from './discipline.controller';
import { DisciplineService } from './discipline.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { CoinsModule } from '@/modules/coins/coins.module';

@Module({
  imports: [PrismaModule, CoinsModule],
  controllers: [DisciplineController],
  providers: [DisciplineService],
  exports: [DisciplineService],
})
export class DisciplineModule {}
