import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, AnalyticsService],
  exports: [AnalyticsService],
})
export class ReportsModule {}
