import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { SmsService } from '@/modules/notifications/sms.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Har kuni soat 07:30 (dush-juma) — Bugungi dars jadvali eslatmasi
   * O'qituvchilarga email/SMS yuborish
   */
  @Cron('30 7 * * 1-6', { name: 'daily-schedule-reminder', timeZone: 'Asia/Tashkent' })
  async sendDailyScheduleReminders() {
    this.logger.log('🕐 Cron: Bugungi jadval eslatmasi');
    try {
      const dayMap: Record<number, string> = {
        1: 'monday', 2: 'tuesday', 3: 'wednesday',
        4: 'thursday', 5: 'friday', 6: 'saturday',
      };
      const today = dayMap[new Date().getDay()];
      if (!today) return;

      // Bugun darsi bo'lgan o'qituvchilar
      const schedules = await this.prisma.schedule.findMany({
        where: { dayOfWeek: today as any },
        include: {
          subject: {
            include: {
              teacher: { select: { id: true, email: true, phone: true, firstName: true, lastName: true } },
            },
          },
          class: { select: { name: true } },
          school: { select: { name: true } },
        },
        distinct: ['subjectId'],
      });

      const teacherMap = new Map<string, { teacher: any; lessons: string[]; school: any }>();
      for (const s of schedules) {
        const teacher = s.subject?.teacher;
        if (!teacher) continue;
        const existing = teacherMap.get(teacher.id) ?? { teacher, lessons: [], school: s.school };
        existing.lessons.push(`${s.startTime}-${s.endTime} ${s.class.name} (${s.subject.name})`);
        teacherMap.set(teacher.id, existing);
      }

      for (const { teacher, lessons, school } of teacherMap.values()) {
        if (!teacher.email) continue;
        await this.notificationQueue.queueEmail({
          to: teacher.email,
          subject: `📚 Bugungi darslar — ${school.name}`,
          html: `
            <p>Hurmatli ${teacher.firstName} ${teacher.lastName},</p>
            <p>Bugungi darslaringiz:</p>
            <ul>${lessons.map(l => `<li>${l}</li>`).join('')}</ul>
            <p>Omad tilaymiz!</p>
            <p><em>${school.name}</em></p>
          `,
        });
      }
      this.logger.log(`✅ ${teacherMap.size} ta o'qituvchiga jadval eslatmasi yuborildi`);
    } catch (err) {
      this.logger.error('Jadval eslatmasi cronida xato:', err);
    }
  }

  /**
   * Har kuni soat 21:00 — Davomatsizlar SMS alert (ota-onaga)
   * Bugun absent/late bo'lgan o'quvchilarning ota-onalariga SMS
   */
  @Cron('0 21 * * *', { name: 'daily-absence-summary', timeZone: 'Asia/Tashkent' })
  async sendDailyAbsenceSummary() {
    this.logger.log('🕘 Cron: Kunlik davomatsizlar xulosasi');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const absentRecords = await this.prisma.attendance.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          status: { in: ['absent', 'late'] as any },
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              childParents: {
                include: {
                  parent: { select: { phone: true, email: true } },
                },
              },
            },
          },
          school: { select: { name: true } },
        },
      });

      let sent = 0;
      for (const record of absentRecords) {
        const parents = record.student.childParents;
        if (!parents.length) continue;
        const statusText = record.status === 'absent' ? 'darsga kelmadi' : 'darsga kech qoldi';
        const msg = `${record.school.name}: Farzandingiz ${record.student.firstName} ${record.student.lastName} bugun ${statusText}. EduPlatform`;
        for (const rel of parents) {
          if (rel.parent.phone) {
            await this.notificationQueue.queueSms({ to: rel.parent.phone, message: msg });
            sent++;
          }
        }
      }
      this.logger.log(`✅ ${sent} ta SMS yuborildi (${absentRecords.length} ta davomatsiz)`);
    } catch (err) {
      this.logger.error('Davomatsizlar cron xatosi:', err);
    }
  }

  /**
   * Har oy 25-sanasi soat 09:00 — Qarzdorlik eslatmasi
   */
  @Cron('0 9 25 * *', { name: 'monthly-payment-reminder', timeZone: 'Asia/Tashkent' })
  async sendMonthlyPaymentReminders() {
    this.logger.log('💳 Cron: Oylik to\'lov eslatmasi');
    try {
      const overduePayments = await this.prisma.payment.findMany({
        where: { status: { in: ['pending', 'overdue'] as any } },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              childParents: {
                include: {
                  parent: { select: { phone: true, email: true } },
                },
              },
            },
          },
          school: { select: { name: true } },
        },
      });

      let sent = 0;
      for (const payment of overduePayments) {
        const parents = payment.student.childParents;
        const amount = payment.amount.toLocaleString('uz-UZ');
        const dueDate = payment.dueDate
          ? new Date(payment.dueDate).toLocaleDateString('uz-UZ')
          : 'Muddatsiz';

        for (const rel of parents) {
          if (rel.parent.phone) {
            await this.notificationQueue.queuePaymentReminder({
              parentPhone: rel.parent.phone,
              parentEmail: rel.parent.email ?? undefined,
              studentName: `${payment.student.firstName} ${payment.student.lastName}`,
              amount: payment.amount,
              dueDate,
              schoolName: payment.school.name,
            });
            sent++;
          }
        }
      }
      this.logger.log(`✅ ${sent} ta to'lov eslatmasi yuborildi`);
    } catch (err) {
      this.logger.error('To\'lov eslatmasi cron xatosi:', err);
    }
  }

  /**
   * Har dushanba soat 08:00 — Haftalik xulosani adminlarga yuborish
   */
  @Cron('0 8 * * 1', { name: 'weekly-summary', timeZone: 'Asia/Tashkent' })
  async sendWeeklySummaryToAdmins() {
    this.logger.log('📊 Cron: Haftalik xulosa');
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const schools = await this.prisma.school.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const school of schools) {
        const [attendanceCount, gradeCount, paymentTotal, admins] = await this.prisma.$transaction([
          this.prisma.attendance.count({
            where: { schoolId: school.id, date: { gte: weekAgo }, status: 'absent' as any },
          }),
          this.prisma.grade.count({
            where: { schoolId: school.id, createdAt: { gte: weekAgo } },
          }),
          this.prisma.payment.aggregate({
            where: { schoolId: school.id, status: 'paid' as any, paidAt: { gte: weekAgo } },
            _sum: { amount: true },
          }),
          this.prisma.user.findMany({
            where: { schoolId: school.id, role: 'school_admin' as any, isActive: true },
            select: { email: true, firstName: true },
          }),
        ]);

        for (const admin of admins) {
          if (!admin.email) continue;
          await this.notificationQueue.queueEmail({
            to: admin.email,
            subject: `📊 Haftalik xulosa — ${school.name}`,
            html: `
              <h2>${school.name} — Haftalik Xulosa</h2>
              <ul>
                <li>❌ Davomatsizlar: <strong>${attendanceCount}</strong> ta</li>
                <li>📝 Kiritilgan baholar: <strong>${gradeCount}</strong> ta</li>
                <li>💰 To'langan summa: <strong>${(paymentTotal._sum.amount ?? 0).toLocaleString('uz-UZ')} UZS</strong></li>
              </ul>
              <p><em>EduPlatform — Maktab boshqaruv tizimi</em></p>
            `,
          });
        }
      }
      this.logger.log(`✅ ${schools.length} ta maktabga haftalik xulosa yuborildi`);
    } catch (err) {
      this.logger.error('Haftalik xulosa cron xatosi:', err);
    }
  }

  /**
   * Har kuni soat 08:00 — Ertangi va etti kunlik akademik tadbir eslatmasi
   * Barcha xodimlarga 1 kun oldin va 7 kun oldin eslatma yuboriladi
   */
  @Cron('0 8 * * *', { name: 'academic-event-reminder', timeZone: 'Asia/Tashkent' })
  async sendAcademicEventReminders() {
    this.logger.log('📅 Cron: Akademik tadbir eslatmasi');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Ertangi tadbir (1 kun oldin)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // 7 kun keyin
      const sevenDays = new Date(today);
      sevenDays.setDate(sevenDays.getDate() + 7);
      const sevenDaysEnd = new Date(sevenDays);
      sevenDaysEnd.setDate(sevenDaysEnd.getDate() + 1);

      const upcomingEvents = await this.prisma.academicEvent.findMany({
        where: {
          OR: [
            { startDate: { gte: tomorrow, lt: dayAfterTomorrow } }, // ertaga
            { startDate: { gte: sevenDays, lt: sevenDaysEnd } },    // 7 kundan keyin
          ],
        },
        include: { school: { select: { id: true, name: true } } },
      });

      if (!upcomingEvents.length) return;

      // Group by school
      const bySchool = new Map<string, { schoolName: string; events: typeof upcomingEvents }>();
      for (const ev of upcomingEvents) {
        const entry = bySchool.get(ev.schoolId) ?? { schoolName: ev.school.name, events: [] };
        entry.events.push(ev);
        bySchool.set(ev.schoolId, entry);
      }

      let sent = 0;
      for (const [schoolId, { schoolName, events }] of bySchool.entries()) {
        // Get all active staff in this school
        const staff = await this.prisma.user.findMany({
          where: {
            schoolId,
            isActive: true,
            role: { in: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] as any },
            email: { not: undefined },
          },
          select: { email: true, firstName: true },
        });

        const eventLines = events.map(ev => {
          const date = new Date(ev.startDate).toLocaleDateString('uz-UZ', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          });
          const isTomorrow = new Date(ev.startDate).toDateString() === tomorrow.toDateString();
          const daysLabel = isTomorrow ? '(Ertaga!)' : '(7 kundan keyin)';
          return `<li><strong>${ev.title}</strong> — ${date} ${daysLabel}${ev.description ? `<br/><em>${ev.description}</em>` : ''}</li>`;
        }).join('');

        for (const member of staff) {
          if (!member.email) continue;
          await this.notificationQueue.queueEmail({
            to: member.email,
            subject: `📅 Yaqinlashayotgan tadbirlar — ${schoolName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #6366f1;">${schoolName}</h2>
                <p>Hurmatli ${member.firstName},</p>
                <p>Quyidagi akademik tadbirlar yaqinlashmoqda:</p>
                <ul style="line-height: 2;">${eventLines}</ul>
                <p><em>EduPlatform — Akademik Kalendar</em></p>
              </div>
            `,
          });
          sent++;
        }
      }
      this.logger.log(`✅ ${sent} ta akademik tadbir eslatmasi yuborildi`);
    } catch (err) {
      this.logger.error('Akademik tadbir eslatmasi cron xatosi:', err);
    }
  }

  /**
   * Har 30 daqiqada — Queue sog'lig'ini monitoring
   * Agar failed jobs 10 dan oshsa yoki queue stuck bo'lsa super adminlarga alert yuboradi
   */
  @Cron('*/30 * * * *', { name: 'queue-health-monitor' })
  async monitorQueueHealth() {
    this.logger.debug('🔍 Queue health monitor ishlamoqda...');
    try {
      const stats = await this.notificationQueue.getQueueStats();
      if (!stats) return; // Queue disabled (no Redis)

      const FAILED_THRESHOLD  = 10;  // 10 dan ko'p failed job — alert
      const WAITING_THRESHOLD = 100; // 100 dan ko'p waiting — backlog alert

      const issues: string[] = [];
      if (stats.failed >= FAILED_THRESHOLD) {
        issues.push(`❌ ${stats.failed} ta failed job (limit: ${FAILED_THRESHOLD})`);
      }
      if (stats.waiting >= WAITING_THRESHOLD) {
        issues.push(`⏳ ${stats.waiting} ta waiting job — backlog katta (limit: ${WAITING_THRESHOLD})`);
      }

      if (!issues.length) return;

      this.logger.warn(`⚠️ Queue alert: ${issues.join(', ')}`);

      // Super adminlarga email yuborish
      const superAdmins = await this.prisma.user.findMany({
        where: { role: 'super_admin' as any, isActive: true, email: { not: undefined } },
        select: { email: true, firstName: true },
      });

      for (const admin of superAdmins) {
        if (!admin.email) continue;
        await this.notificationQueue.queueEmail({
          to: admin.email,
          subject: `🚨 EduPlatform — Notification Queue Xatosi`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">⚠️ Notification Queue Alert</h2>
              <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p><strong>Muammo(lar):</strong></p>
                <ul>
                  ${issues.map(i => `<li>${i}</li>`).join('')}
                </ul>
                <p><strong>Queue holati:</strong></p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td>Waiting:</td><td><strong>${stats.waiting}</strong></td></tr>
                  <tr><td>Active:</td><td><strong>${stats.active}</strong></td></tr>
                  <tr><td>Completed:</td><td><strong>${stats.completed}</strong></td></tr>
                  <tr><td>Failed:</td><td style="color: #ef4444;"><strong>${stats.failed}</strong></td></tr>
                </table>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 12px;">
                Vaqt: ${new Date().toLocaleString('uz-UZ')} — EduPlatform Monitoring
              </p>
            </div>
          `,
        });
      }

      if (superAdmins.length > 0) {
        this.logger.log(`📧 ${superAdmins.length} ta super adminga queue alert yuborildi`);
      }
    } catch (err) {
      this.logger.error('Queue monitoring cron xatosi:', err);
    }
  }

  /**
   * Har kuni soat 06:00 — Bugun muddati tugaydigan uy vazifalari eslatmasi
   */
  @Cron('0 6 * * *', { name: 'homework-deadline-reminder', timeZone: 'Asia/Tashkent' })
  async sendHomeworkDeadlineReminders() {
    this.logger.log('📚 Cron: Uy vazifasi deadline eslatmasi');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dueHomeworks = await this.prisma.homework.findMany({
        where: { dueDate: { gte: today, lt: tomorrow } },
        include: {
          class: {
            include: {
              students: {
                include: {
                  student: { select: { id: true, firstName: true, lastName: true, phone: true } },
                },
              },
            },
          },
          subject: { select: { name: true } },
          school: { select: { name: true } },
          submissions: { select: { studentId: true } },
        },
      });

      let sent = 0;
      for (const hw of dueHomeworks) {
        const submittedIds = new Set(hw.submissions.map((s: any) => s.studentId));
        for (const cs of hw.class.students) {
          const student = cs.student;
          if (submittedIds.has(student.id) || !student.phone) continue;
          const msg = `${hw.school.name}: Bugun "${hw.subject.name}" fanidan "${hw.title}" uy vazifasi topshirish muddati. EduPlatform`;
          await this.notificationQueue.queueSms({ to: student.phone, message: msg });
          sent++;
        }
      }
      this.logger.log(`✅ ${sent} ta uy vazifasi deadline eslatmasi yuborildi`);
    } catch (err) {
      this.logger.error('Homework deadline cron xatosi:', err);
    }
  }

  /**
   * H-3: Har kuni soat 08:30 — Muddati o'tgan kitob qaytarish SMS eslatmasi
   * Qaytarish muddati o'tgan (returnDate = null, dueDate < bugun) ijarachilarga SMS
   */
  @Cron('30 8 * * *', { name: 'overdue-library-reminder', timeZone: 'Asia/Tashkent' })
  async sendOverdueLibraryReminders() {
    this.logger.log('📖 Cron: Kech kitob eslatmasi');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueLoans = await this.prisma.libraryLoan.findMany({
        where: {
          returnDate: null,
          dueDate: { lt: today },
        },
        include: {
          book: { select: { title: true } },
          school: { select: { name: true } },
        },
      });

      if (!overdueLoans.length) {
        this.logger.log('Muddati o\'tgan kitoblar yo\'q');
        return;
      }

      // Enrich with student info
      const studentIds = [...new Set(overdueLoans.map(l => l.studentId))];
      const students = await this.prisma.user.findMany({
        where: { id: { in: studentIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          childParents: {
            include: { parent: { select: { phone: true } } },
          },
        },
      });
      const studentMap = Object.fromEntries(students.map(s => [s.id, s]));

      let sent = 0;
      for (const loan of overdueLoans) {
        const student = studentMap[loan.studentId];
        if (!student) continue;

        const daysOverdue = Math.floor((Date.now() - new Date(loan.dueDate).getTime()) / 86_400_000);
        const dueStr = new Date(loan.dueDate).toLocaleDateString('uz-UZ');
        const msg = `${loan.school.name}: "${loan.book.title}" kitobini qaytarish muddati ${daysOverdue} kun o'tdi (muddati: ${dueStr}). Iltimos, tezda qaytaring. EduPlatform`;

        // SMS to student directly
        if (student.phone) {
          await this.notificationQueue.queueSms({ to: student.phone, message: msg });
          sent++;
        }

        // Also notify parents
        for (const rel of student.childParents ?? []) {
          if (rel.parent.phone) {
            const parentMsg = `${loan.school.name}: Farzandingiz ${student.firstName} ${student.lastName} "${loan.book.title}" kitobini ${daysOverdue} kun kech qaytarmoqda. EduPlatform`;
            await this.notificationQueue.queueSms({ to: rel.parent.phone, message: parentMsg });
            sent++;
          }
        }
      }
      this.logger.log(`✅ ${sent} ta kech kitob SMS yuborildi (${overdueLoans.length} ta ijara)`);
    } catch (err) {
      this.logger.error('Kech kitob cron xatosi:', err);
    }
  }

  /**
   * Har oyning 1-kuni soat 07:00 — Oylik to'lov yozuvlarini avtomatik yaratish
   * Aktiv FeeStructure lar bo'yicha har bir o'quvchi uchun payment generate qiladi
   */
  @Cron('0 7 1 * *', { name: 'monthly-payment-generation', timeZone: 'Asia/Tashkent' })
  async generateMonthlyPayments() {
    this.logger.log('💰 Cron: Oylik to\'lovlar yaratilmoqda...');
    try {
      const now = new Date();
      const year  = now.getFullYear();
      const month = now.getMonth() + 1; // 1-12
      const monthLabel = `${year}-${String(month).padStart(2, '0')}`;
      const dueDate = new Date(year, month - 1, 25); // Har oy 25-sanasi deadline

      // Aktiv FeeStructure lar
      const feeStructures = await this.prisma.feeStructure.findMany({
        where: { isActive: true, frequency: 'monthly' },
        include: { school: { select: { id: true, name: true } } },
      });

      if (!feeStructures.length) {
        this.logger.log('Aktiv fee structure topilmadi');
        return;
      }

      let created = 0;
      let skipped = 0;

      for (const fee of feeStructures) {
        const schoolId = fee.schoolId;

        // O'quvchilar: gradeLevel bo'yicha filtr (agar belgilangan bo'lsa)
        const studentWhere: any = { schoolId, role: 'student', isActive: true };
        if (fee.gradeLevel) {
          studentWhere.classes = {
            some: { class: { gradeLevel: fee.gradeLevel } },
          };
        }

        const students = await this.prisma.user.findMany({
          where: studentWhere,
          select: { id: true },
        });

        if (!students.length) continue;

        for (const student of students) {
          // Bu oy uchun allaqachon payment yaratilganmi?
          const exists = await this.prisma.payment.findFirst({
            where: {
              schoolId,
              studentId: student.id,
              description: { contains: monthLabel },
            },
          });

          if (exists) { skipped++; continue; }

          await this.prisma.payment.create({
            data: {
              schoolId,
              studentId: student.id,
              amount: fee.amount,
              currency: fee.currency,
              description: `${fee.name} — ${monthLabel}`,
              dueDate,
              status: 'pending',
            },
          });
          created++;
        }
      }

      this.logger.log(`✅ Oylik to'lovlar: ${created} ta yaratildi, ${skipped} ta mavjud edi`);

      // Hisobchilarga email xabarnoma
      const accountants = await this.prisma.user.findMany({
        where: { role: 'accountant' as any, isActive: true },
        select: { email: true, firstName: true, schoolId: true },
      });

      for (const acc of accountants) {
        if (!acc.email || !acc.schoolId) continue;
        const schoolCreated = await this.prisma.payment.count({
          where: { schoolId: acc.schoolId, status: 'pending' as any, createdAt: { gte: new Date(year, month - 1, 1) } },
        });
        await this.notificationQueue.queueEmail({
          to: acc.email,
          subject: `💰 ${monthLabel} — Oylik to'lovlar yaratildi`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #6366f1;">Oylik To'lovlar Yaratildi</h2>
              <p>Hurmatli ${acc.firstName},</p>
              <p><strong>${monthLabel}</strong> uchun <strong>${schoolCreated}</strong> ta to'lov yozuvi avtomatik yaratildi.</p>
              <p>To'lovlar muddati: <strong>${dueDate.toLocaleDateString('uz-UZ')}</strong></p>
              <p><a href="/dashboard/payments" style="color: #6366f1;">To'lovlarni ko'rish →</a></p>
              <p><em>EduPlatform — Moliya tizimi</em></p>
            </div>
          `,
        });
      }
    } catch (err) {
      this.logger.error('Oylik to\'lov generation cron xatosi:', err);
    }
  }
}
