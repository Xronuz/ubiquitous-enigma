import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private from: string;
  private enabled: boolean = false;

  constructor(private readonly config: ConfigService) {
    const host = config.get('SMTP_HOST', '');
    const port = config.get<number>('SMTP_PORT', 587);
    const user = config.get('SMTP_USER', '');
    const pass = config.get('SMTP_PASS', '');
    this.from = config.get('SMTP_FROM', 'EduPlatform <noreply@eduplatform.uz>');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
      this.enabled = true;
      this.logger.log(`Email xizmati sozlandi: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP sozlanmagan — emaillar yuborilmaydi (test rejimi)');
    }
  }

  /**
   * Email yuborish
   */
  async sendEmail(opts: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
  }): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`[EMAIL STUB] To: ${opts.to} | Subject: ${opts.subject}`);
      return true; // Dev rejimda muvaffaqiyatli
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        replyTo: opts.replyTo,
      });
      this.logger.log(`Email yuborildi: ${opts.to} — ${info.messageId}`);
      return true;
    } catch (err) {
      this.logger.error(`Email yuborishda xato: ${opts.to}`, err);
      return false;
    }
  }

  /**
   * Attachment bilan email yuborish (maosh varaqasi va h.k.)
   */
  async sendEmailWithAttachment(opts: {
    to: string;
    subject: string;
    html: string;
    attachments: { filename: string; content: Buffer; contentType: string }[];
  }): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`[EMAIL STUB] To: ${opts.to} | Subject: ${opts.subject} | Attachments: ${opts.attachments.map(a => a.filename).join(', ')}`);
      return true;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      this.logger.log(`Attachment bilan email: ${opts.to} — ${opts.subject}`);
      return true;
    } catch (err) {
      this.logger.error(`Attachment email xatosi: ${opts.to}`, err);
      return false;
    }
  }

  /**
   * Davomat haqida ota-onaga email
   */
  async sendAttendanceAlert(opts: {
    parentEmail: string;
    studentName: string;
    date: string;
    status: string;
    schoolName: string;
  }): Promise<boolean> {
    const statusText = opts.status === 'absent' ? 'darsga kelmadi' : 'darsga kechikdi';
    return this.sendEmail({
      to: opts.parentEmail,
      subject: `📋 ${opts.studentName} — davomat xabarnomasi`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">EduPlatform</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <p>Hurmatli ota-ona,</p>
            <p>
              <strong>${opts.studentName}</strong> bugun
              <strong style="color: ${opts.status === 'absent' ? '#ef4444' : '#f59e0b'};">
                ${statusText}
              </strong>.
            </p>
            <p><strong>Sana:</strong> ${opts.date}</p>
            <p><strong>Maktab:</strong> ${opts.schoolName}</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
            Bu xabar avtomatik yuborildi — EduPlatform.uz
          </p>
        </div>
      `,
    });
  }

  /**
   * To'lov eslatmasi ota-onaga email
   */
  async sendPaymentReminder(opts: {
    parentEmail: string;
    studentName: string;
    amount: number;
    dueDate: string;
    schoolName: string;
  }): Promise<boolean> {
    return this.sendEmail({
      to: opts.parentEmail,
      subject: `💳 To'lov eslatmasi — ${opts.studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">EduPlatform</h2>
          <div style="background: #fff7ed; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <p>Hurmatli ota-ona,</p>
            <p>
              <strong>${opts.studentName}</strong> uchun o'qish to'lovi
              <strong style="color: #ef4444;">${opts.dueDate}</strong> sanasida amalga oshirilishi kerak.
            </p>
            <p style="font-size: 18px;">
              <strong>Summa:</strong>
              <span style="color: #6366f1;">${opts.amount.toLocaleString()} so'm</span>
            </p>
            <p><strong>Maktab:</strong> ${opts.schoolName}</p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
            Bu xabar avtomatik yuborildi — EduPlatform.uz
          </p>
        </div>
      `,
    });
  }
}
