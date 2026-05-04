import { Module } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiAnalyticsController } from './ai-analytics.controller';

@Module({
  controllers: [AiAnalyticsController],
  providers: [AiAnalyticsService],
  exports: [AiAnalyticsService],
})
export class AiAnalyticsModule {}
