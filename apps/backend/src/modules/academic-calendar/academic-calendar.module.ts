import { Module } from '@nestjs/common';
import { AcademicCalendarController } from './academic-calendar.controller';
import { AcademicCalendarService } from './academic-calendar.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicCalendarController],
  providers: [AcademicCalendarService],
  exports: [AcademicCalendarService],
})
export class AcademicCalendarModule {}
