import { Module } from '@nestjs/common';
import { CanteenController } from './canteen.controller';
import { CanteenService } from './canteen.service';

@Module({
  controllers: [CanteenController],
  providers: [CanteenService],
  exports: [CanteenService],
})
export class CanteenModule {}
