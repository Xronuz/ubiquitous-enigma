import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
