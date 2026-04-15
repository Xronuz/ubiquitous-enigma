import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { OnlineExamService } from './online-exam.service';
import { OnlineExamController } from './online-exam.controller';
import { EventsModule } from '@/modules/gateway/events.module';

@Module({
  imports: [
    EventsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [OnlineExamController],
  providers: [OnlineExamService],
  exports: [OnlineExamService],
})
export class OnlineExamModule {}
