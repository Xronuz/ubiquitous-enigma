import { Module } from '@nestjs/common';
import { LearningCenterController } from './learning-center.controller';
import { LearningCenterService } from './learning-center.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LearningCenterController],
  providers: [LearningCenterService],
  exports: [LearningCenterService],
})
export class LearningCenterModule {}
