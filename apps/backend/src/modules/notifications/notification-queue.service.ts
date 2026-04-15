import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  NOTIFICATION_QUEUE,
  NotificationJobType,
  EmailJobData,
  SmsJobData,
  AttendanceAlertData,
  PaymentReminderData,
} from '@/common/queue/queue.constants';

/**
 * NotificationQueueService
 *
 * Boshqa modullar shu servis orqali bildirishnomalarni queue ga qo'shadi.
 * Worker ularni background da qayta ishlaydi.
 */
@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @Optional() @Inject(NOTIFICATION_QUEUE) private readonly queue: Queue | null,
  ) {}

  private async addJob(name: NotificationJobType, data: any, opts?: any): Promise<void> {
    if (!this.queue) {
      this.logger.warn(`Queue mavjud emas — job tashlab ketildi: ${name}`);
      return;
    }
    try {
      await this.queue.add(name, data, opts);
    } catch (err) {
      this.logger.error(`Queue ga job qo'shishda xato: ${name}`, err);
    }
  }

  /** Bitta email yuborish */
  async queueEmail(data: EmailJobData): Promise<void> {
    await this.addJob(NotificationJobType.SEND_EMAIL, data);
  }

  /** Bitta SMS yuborish */
  async queueSms(data: SmsJobData): Promise<void> {
    await this.addJob(NotificationJobType.SEND_SMS, data);
  }

  /** Davomat xabarnomasi (SMS + Email) */
  async queueAttendanceAlert(data: AttendanceAlertData): Promise<void> {
    await this.addJob(NotificationJobType.ATTENDANCE_ALERT, data, {
      delay: 0,
      priority: 2, // Yuqori priority
    });
  }

  /** To'lov eslatmasi (SMS + Email) */
  async queuePaymentReminder(data: PaymentReminderData): Promise<void> {
    await this.addJob(NotificationJobType.PAYMENT_REMINDER, data, {
      delay: 0,
      priority: 3,
    });
  }

  /** Queue holati */
  async getQueueStats() {
    if (!this.queue) return null;
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);
    const isHealthy = failed < 10 && waiting < 100;
    return { waiting, active, completed, failed, delayed, isHealthy };
  }

  /** Failed joblarni tozalash (super admin uchun) */
  async cleanFailedJobs(): Promise<number> {
    if (!this.queue) return 0;
    const failed = await this.queue.getFailed();
    await Promise.all(failed.map(j => j.remove()));
    return failed.length;
  }
}
