import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SMS Service — Adapter pattern
 * Hozir: Infobip / SMS.uz / stub (dev)
 * Kelajakda: PlayMobile, Eskiz yoki boshqa provider qo'shilishi mumkin
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private provider: 'infobip' | 'smsdotuz' | 'stub';
  private apiKey: string;
  private baseUrl: string;
  private from: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get('INFOBIP_API_KEY', '');
    this.baseUrl = config.get('INFOBIP_BASE_URL', '');
    this.from = config.get('SMS_FROM', 'EduPlatform');

    if (this.apiKey && this.baseUrl) {
      this.provider = 'infobip';
      this.logger.log('SMS xizmati: Infobip');
    } else {
      this.provider = 'stub';
      this.logger.warn('SMS provider sozlanmagan — xabarlar log ga yoziladi (stub rejim)');
    }
  }

  /**
   * SMS yuborish
   */
  async send(to: string, message: string): Promise<boolean> {
    const formattedTo = this.formatPhone(to);

    if (this.provider === 'stub') {
      this.logger.log(`[SMS STUB] To: ${formattedTo} | Msg: ${message}`);
      return true;
    }

    if (this.provider === 'infobip') {
      return this.sendViaInfobip(formattedTo, message);
    }

    return false;
  }

  /**
   * Davomat xabarnomasi SMS
   */
  async sendAttendanceAlert(opts: {
    parentPhone: string;
    studentName: string;
    date: string;
    status: string;
    schoolName: string;
  }): Promise<boolean> {
    const statusText = opts.status === 'absent' ? 'kelmadi' : 'kechikdi';
    const message =
      `${opts.schoolName}: ${opts.studentName} bugun (${opts.date}) darsga ${statusText}. ` +
      `EduPlatform.uz`;
    return this.send(opts.parentPhone, message);
  }

  /**
   * To'lov eslatmasi SMS
   */
  async sendPaymentReminder(opts: {
    parentPhone: string;
    studentName: string;
    amount: number;
    dueDate: string;
  }): Promise<boolean> {
    const message =
      `EduPlatform: ${opts.studentName} uchun ${opts.amount.toLocaleString()} so'm to'lov ` +
      `${opts.dueDate} gacha amalga oshirilishi kerak. eduplatform.uz`;
    return this.send(opts.parentPhone, message);
  }

  /**
   * Yangi parol yoki OTP yuborish
   */
  async sendOtp(phone: string, code: string): Promise<boolean> {
    const message = `EduPlatform tasdiqlash kodi: ${code}. 5 daqiqa ichida foydalaning.`;
    return this.send(phone, message);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private formatPhone(phone: string): string {
    // O'zbekiston raqamlarini +998xxxxxxxxx formatiga keltirish
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('998')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+998${cleaned.slice(1)}`;
    if (cleaned.length === 9) return `+998${cleaned}`;
    return phone; // qaytadan format qilinmadi
  }

  private async sendViaInfobip(to: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              from: this.from,
              destinations: [{ to }],
              text: message,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        this.logger.error(`Infobip SMS xatosi: ${response.status} — ${err}`);
        return false;
      }

      const data = await response.json() as any;
      const msgId = data?.messages?.[0]?.messageId;
      this.logger.log(`SMS yuborildi: ${to} — ID: ${msgId}`);
      return true;
    } catch (err) {
      this.logger.error(`SMS yuborishda tarmoq xatosi: ${to}`, err);
      return false;
    }
  }
}
