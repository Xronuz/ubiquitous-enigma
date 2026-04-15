import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { TariffCalculatorService } from './tariff-calculator.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SystemConfigModule } from '@/modules/system-config/system-config.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';

@Module({
  imports: [PrismaModule, SystemConfigModule, NotificationsModule],
  controllers: [PayrollController],
  providers: [PayrollService, TariffCalculatorService],
  exports: [PayrollService, TariffCalculatorService],
})
export class PayrollModule {}
