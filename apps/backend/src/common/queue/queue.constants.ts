export const NOTIFICATION_QUEUE = 'notification_queue';

export enum NotificationJobType {
  SEND_EMAIL = 'send_email',
  SEND_SMS = 'send_sms',
  SEND_PUSH = 'send_push',
  ATTENDANCE_ALERT = 'attendance_alert',
  PAYMENT_REMINDER = 'payment_reminder',
  GRADE_NOTIFICATION = 'grade_notification',
}

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SmsJobData {
  to: string;        // tel raqam: +998901234567
  message: string;
  from?: string;
}

export interface AttendanceAlertData {
  parentPhone: string;
  parentEmail?: string;
  studentName: string;
  date: string;
  status: string;   // 'absent' | 'late'
  schoolName: string;
}

export interface PaymentReminderData {
  parentPhone: string;
  parentEmail?: string;
  studentName: string;
  amount: number;
  dueDate: string;
  schoolName: string;
}

export interface GradeNotificationData {
  parentPhone: string;
  parentEmail?: string;
  studentName: string;
  subject: string;
  score: number;
  maxScore: number;
  gradeType: string;   // 'exam' | 'homework' | 'quiz' | etc.
  schoolName: string;
}
