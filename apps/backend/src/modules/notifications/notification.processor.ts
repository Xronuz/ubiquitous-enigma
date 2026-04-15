import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';
import {
  NOTIFICATION_QUEUE,
  NotificationJobType,
  EmailJobData,
  SmsJobData,
  AttendanceAlertData,
  PaymentReminderData,
  GradeNotificationData,
} from '@/common/queue/queue.constants';

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationProcessor.name);
  private worker: Worker | null = null;

  constructor(
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.worker = new Worker(
      NOTIFICATION_QUEUE,
      async (job: Job) => this.processJob(job),
      {
        connection: {
          host: this.config.get('REDIS_HOST', 'localhost'),
          port: this.config.get<number>('REDIS_PORT', 6379),
          password: this.config.get('REDIS_PASSWORD') || undefined,
          db: this.config.get<number>('REDIS_DB', 0),
        },
        concurrency: 5,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Job bajarildi: [${job.name}] ID=${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job xato: [${job?.name}] ID=${job?.id} — ${err.message}`);
    });

    this.logger.log('Notification Worker ishga tushdi');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async processJob(job: Job): Promise<void> {
    switch (job.name as NotificationJobType) {
      case NotificationJobType.SEND_EMAIL: {
        const data = job.data as EmailJobData;
        await this.mailService.sendEmail(data);
        break;
      }

      case NotificationJobType.SEND_SMS: {
        const data = job.data as SmsJobData;
        await this.smsService.send(data.to, data.message);
        break;
      }

      case NotificationJobType.ATTENDANCE_ALERT: {
        const data = job.data as AttendanceAlertData;
        const promises: Promise<boolean>[] = [
          this.smsService.sendAttendanceAlert({
            parentPhone: data.parentPhone,
            studentName: data.studentName,
            date: data.date,
            status: data.status,
            schoolName: data.schoolName,
          }),
        ];
        if (data.parentEmail) {
          promises.push(
            this.mailService.sendAttendanceAlert({
              parentEmail: data.parentEmail,
              studentName: data.studentName,
              date: data.date,
              status: data.status,
              schoolName: data.schoolName,
            }),
          );
        }
        await Promise.allSettled(promises);
        break;
      }

      case NotificationJobType.PAYMENT_REMINDER: {
        const data = job.data as PaymentReminderData;
        const promises: Promise<boolean>[] = [
          this.smsService.sendPaymentReminder({
            parentPhone: data.parentPhone,
            studentName: data.studentName,
            amount: data.amount,
            dueDate: data.dueDate,
          }),
        ];
        if (data.parentEmail) {
          promises.push(
            this.mailService.sendPaymentReminder({
              parentEmail: data.parentEmail,
              studentName: data.studentName,
              amount: data.amount,
              dueDate: data.dueDate,
              schoolName: data.schoolName,
            }),
          );
        }
        await Promise.allSettled(promises);
        break;
      }

      case NotificationJobType.GRADE_NOTIFICATION: {
        const data = job.data as GradeNotificationData;
        const pct = data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0;
        const gradeTypeLabel = data.gradeType === 'exam' ? 'Imtihon' : data.gradeType === 'homework' ? 'Uy vazifasi' : 'Baho';
        const message = `${data.schoolName}: ${data.studentName}ning ${data.subject} fanidan ${gradeTypeLabel} natijasi — ${data.score}/${data.maxScore} (${pct}%)`;
        const promises: Promise<boolean>[] = [
          this.smsService.send(data.parentPhone, message),
        ];
        if (data.parentEmail) {
          promises.push(
            this.mailService.sendEmail({
              to: data.parentEmail,
              subject: `${gradeTypeLabel} natijasi — ${data.subject}`,
              html: `<p>${message}</p>`,
              text: message,
            }),
          );
        }
        await Promise.allSettled(promises);
        break;
      }

      default:
        this.logger.warn(`Noma'lum job turi: ${job.name}`);
    }
  }
}
