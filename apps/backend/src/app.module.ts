import { MiddlewareConsumer, NestModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { pinoConfig } from './common/logger/logger.config';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ScheduleModule as SchoolScheduleModule } from './modules/schedule/schedule.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GradesModule } from './modules/grades/grades.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ParentModule } from './modules/parent/parent.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { HealthModule } from './modules/health/health.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EventsModule } from './modules/gateway/events.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ExamsModule } from './modules/exams/exams.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { LibraryModule } from './modules/library/library.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { UploadModule } from './modules/upload/upload.module';
import { AuditModule } from './common/audit/audit.module';
import { QueueModule } from './common/queue/queue.module';
import { DisplayModule } from './modules/display/display.module';
import { AppCronModule } from './common/cron/cron.module';
import { CanteenModule } from './modules/canteen/canteen.module';
import { TransportModule } from './modules/transport/transport.module';
import { LearningCenterModule } from './modules/learning-center/learning-center.module';
import { AcademicCalendarModule } from './modules/academic-calendar/academic-calendar.module';
import { FeeStructuresModule } from './modules/fee-structures/fee-structures.module';
import { ImportModule } from './modules/import/import.module';
import { OnlineExamModule } from './modules/online-exam/online-exam.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { DisciplineModule } from './modules/discipline/discipline.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { BranchesModule } from './modules/branches/branches.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { FinancialShiftsModule } from './modules/financial-shifts/financial-shifts.module';
import { RoomsModule }  from './modules/rooms/rooms.module';
import { LeadsModule }  from './modules/leads/leads.module';
import { CoinsModule }  from './modules/coins/coins.module';
import { KpiModule }  from './modules/kpi/kpi.module';
import { AiAnalyticsModule } from './modules/ai-analytics/ai-analytics.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { envValidationSchema } from './common/config/env.validation';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    LoggerModule.forRoot(pinoConfig),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get('THROTTLE_TTL', 60000),
            limit: config.get('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // Cron jobs
    ScheduleModule.forRoot(),

    // Core infrastructure
    PrismaModule,
    RedisModule,
    AuditModule,    // Global — barcha modulda AuditService inject qilinadi
    QueueModule,    // Global — barcha modulda NOTIFICATION_QUEUE inject qilinadi
    AppCronModule,  // Cron jobs — scheduled tasks

    // Feature modules
    AuthModule,
    UsersModule,
    ClassesModule,
    SubjectsModule,
    SchoolScheduleModule,
    AttendanceModule,
    GradesModule,
    PaymentsModule,
    NotificationsModule,
    ParentModule,
    SuperAdminModule,
    ReportsModule,
    HealthModule,
    EventsModule,
    MessagingModule,
    ExamsModule,
    HomeworkModule,
    LibraryModule,
    LeaveRequestsModule,
    PayrollModule,
    UploadModule,   // Fayl yuklash moduli
    DisplayModule,  // Public zal monitoru (auth talab qilinmaydi)
    CanteenModule,           // Ovqatxona menyusi (Phase 3)
    TransportModule,         // Transport marshrut stub (Phase 3)
    LearningCenterModule,    // O'quv markazi moduli stub (Phase 2)
    AcademicCalendarModule,  // Akademik kalendar
    FeeStructuresModule,     // To'lov tartiblari
    ImportModule,            // Excel import (students, users, schedule, grades)
    OnlineExamModule,        // Online imtihon platformasi
    SystemConfigModule,      // Maktab konfiguratsiyasi (BHM, akademik yil)
    DisciplineModule,        // Intizom jurnali
    MeetingsModule,          // Ota-ona uchrashuvlari
    FinanceModule,           // Moliyaviy dashboard (Phase 2)
    ClubsModule,             // To'garaklar (extracurricular)
    BranchesModule,          // Filiallar CRUD (multi-branch)
    TreasuryModule,          // G'azna / kassa boshqaruvi (Phase 3)
    FinancialShiftsModule,   // Kassir smenalari (Phase 3)
    RoomsModule,             // Xonalar CRUD (Phase 4 — conflict detection uchun)
    LeadsModule,             // CRM Lead boshqaruvi (Phase 5)
    CoinsModule,
    KpiModule,
    AiAnalyticsModule,
    MarketingModule,             // Gamification — Coin & Reward system (Phase 7)
  ],
  providers: [
    // Global rate limiting — barcha endpointlarga qo'llaniladi
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
