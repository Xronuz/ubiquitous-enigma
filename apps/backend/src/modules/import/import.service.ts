import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

// ─── Natija tipi ───────────────────────────────────────────────────────────────

export interface ImportRow {
  row: number;
  data: Record<string, any>;
  errors: string[];
  valid: boolean;
}

export interface ImportResult {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportRow[];
}

export interface CommitResult {
  created: number;
  skipped: number;
  errors: string[];
}

// ─── Servis ───────────────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // STUDENTS IMPORT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Excel ustunlari (namuna):
   * A: firstName | B: lastName | C: email | D: phone | E: password (ixtiyoriy) | F: classId (ixtiyoriy)
   */
  async parseStudents(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const rows: ImportRow[] = [];
    let rowNum = 0;

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return; // header
      rowNum++;
      const cells = row.values as any[];
      const firstName  = String(cells[1] ?? '').trim();
      const lastName   = String(cells[2] ?? '').trim();
      const email      = String(cells[3] ?? '').trim().toLowerCase();
      const phone      = String(cells[4] ?? '').trim() || undefined;
      const password   = String(cells[5] ?? '').trim() || undefined;
      const classId    = String(cells[6] ?? '').trim() || undefined;

      const errors: string[] = [];
      if (!firstName) errors.push('Ism kiritilmagan');
      if (!lastName)  errors.push('Familiya kiritilmagan');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email noto\'g\'ri');

      rows.push({
        row: rowIndex,
        data: { firstName, lastName, email, phone, password, classId },
        errors,
        valid: errors.length === 0,
      });
    });

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitStudents(rows: ImportRow[], currentUser: JwtPayload): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        const existing = await this.prisma.user.findUnique({ where: { email: row.data.email } });
        if (existing) { skipped++; continue; }

        const passwordHash = await bcrypt.hash(row.data.password ?? 'Student@123', 10);
        const student = await this.prisma.user.create({
          data: {
            schoolId,
            role: UserRole.STUDENT,
            firstName: row.data.firstName,
            lastName:  row.data.lastName,
            email:     row.data.email,
            phone:     row.data.phone,
            passwordHash,
          },
        });

        // Sinfga biriktirish
        if (row.data.classId) {
          const cls = await this.prisma.class.findFirst({ where: { id: row.data.classId, schoolId } });
          if (cls) {
            await this.prisma.classStudent.upsert({
              where: { classId_studentId: { classId: cls.id, studentId: student.id } },
              create: { classId: cls.id, studentId: student.id },
              update: {},
            });
          }
        }
        created++;
      } catch (e: any) {
        errors.push(`Qator ${row.row}: ${e.message}`);
      }
    }
    return { created, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // USERS IMPORT (umumiy xodimlar)
  // ─────────────────────────────────────────────────────────────────────────────
  // A: firstName | B: lastName | C: email | D: phone | E: role | F: password

  async parseUsers(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const VALID_ROLES = ['teacher', 'class_teacher', 'accountant', 'librarian', 'vice_principal'];
    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return;
      const cells = row.values as any[];
      const firstName = String(cells[1] ?? '').trim();
      const lastName  = String(cells[2] ?? '').trim();
      const email     = String(cells[3] ?? '').trim().toLowerCase();
      const phone     = String(cells[4] ?? '').trim() || undefined;
      const role      = String(cells[5] ?? '').trim().toLowerCase();
      const password  = String(cells[6] ?? '').trim() || undefined;

      const errors: string[] = [];
      if (!firstName) errors.push('Ism kiritilmagan');
      if (!lastName)  errors.push('Familiya kiritilmagan');
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email noto\'g\'ri');
      if (!VALID_ROLES.includes(role)) errors.push(`Rol noto'g'ri: ${role}. To'g'ri: ${VALID_ROLES.join(', ')}`);

      rows.push({
        row: rowIndex,
        data: { firstName, lastName, email, phone, role, password },
        errors,
        valid: errors.length === 0,
      });
    });

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitUsers(rows: ImportRow[], currentUser: JwtPayload): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0; let skipped = 0; const errors: string[] = [];

    for (const row of validRows) {
      try {
        const existing = await this.prisma.user.findUnique({ where: { email: row.data.email } });
        if (existing) { skipped++; continue; }
        const passwordHash = await bcrypt.hash(row.data.password ?? 'Staff@123', 10);
        await this.prisma.user.create({
          data: {
            schoolId,
            role: row.data.role as any,
            firstName: row.data.firstName,
            lastName:  row.data.lastName,
            email:     row.data.email,
            phone:     row.data.phone,
            passwordHash,
          },
        });
        created++;
      } catch (e: any) {
        errors.push(`Qator ${row.row}: ${e.message}`);
      }
    }
    return { created, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEDULE IMPORT
  // ─────────────────────────────────────────────────────────────────────────────
  // A: classId | B: subjectId | C: teacherId | D: dayOfWeek | E: timeSlot
  // F: startTime (HH:MM) | G: endTime (HH:MM) | H: roomNumber (ixtiyoriy)

  async parseSchedule(buffer: Buffer, currentUser: JwtPayload): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const schoolId = currentUser.schoolId!;
    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return;
      const cells = row.values as any[];
      const classId    = String(cells[1] ?? '').trim();
      const subjectId  = String(cells[2] ?? '').trim();
      const teacherId  = String(cells[3] ?? '').trim();
      const dayOfWeek  = String(cells[4] ?? '').trim().toLowerCase();
      const timeSlot   = Number(cells[5]);
      const startTime  = String(cells[6] ?? '').trim();
      const endTime    = String(cells[7] ?? '').trim();
      const roomNumber = String(cells[8] ?? '').trim() || undefined;

      const errors: string[] = [];
      if (!classId)   errors.push('classId yo\'q');
      if (!subjectId) errors.push('subjectId yo\'q');
      if (!teacherId) errors.push('teacherId yo\'q');
      if (!DAYS.includes(dayOfWeek)) errors.push(`Kun noto'g'ri: ${dayOfWeek}`);
      if (isNaN(timeSlot) || timeSlot < 1 || timeSlot > 12) errors.push('timeSlot 1-12 oralig\'ida bo\'lishi kerak');
      if (!/^\d{2}:\d{2}$/.test(startTime)) errors.push('startTime HH:MM formatida bo\'lishi kerak');
      if (!/^\d{2}:\d{2}$/.test(endTime))   errors.push('endTime HH:MM formatida bo\'lishi kerak');

      rows.push({
        row: rowIndex,
        data: { classId, subjectId, teacherId, dayOfWeek, timeSlot, startTime, endTime, roomNumber, schoolId },
        errors,
        valid: errors.length === 0,
      });
    });

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitSchedule(rows: ImportRow[], currentUser: JwtPayload): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0; let skipped = 0; const errors: string[] = [];

    for (const row of validRows) {
      try {
        // Konflikt tekshirish
        const conflict = await this.prisma.schedule.findFirst({
          where: {
            schoolId,
            dayOfWeek: row.data.dayOfWeek as any,
            timeSlot: row.data.timeSlot,
            classId: row.data.classId,
          },
        });
        if (conflict) { skipped++; continue; }

        await this.prisma.schedule.create({
          data: {
            schoolId,
            classId:    row.data.classId,
            subjectId:  row.data.subjectId,
            teacherId:  row.data.teacherId,
            dayOfWeek:  row.data.dayOfWeek as any,
            timeSlot:   row.data.timeSlot,
            startTime:  row.data.startTime,
            endTime:    row.data.endTime,
            roomNumber: row.data.roomNumber,
          },
        });
        created++;
      } catch (e: any) {
        errors.push(`Qator ${row.row}: ${e.message}`);
      }
    }
    return { created, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GRADES IMPORT
  // ─────────────────────────────────────────────────────────────────────────────
  // A: studentId | B: subjectId | C: classId | D: type | E: score | F: maxScore | G: date | H: comment

  async parseGrades(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const VALID_TYPES = ['homework','classwork','test','exam','quarterly','final'];
    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return;
      const cells = row.values as any[];
      const studentId = String(cells[1] ?? '').trim();
      const subjectId = String(cells[2] ?? '').trim();
      const classId   = String(cells[3] ?? '').trim();
      const type      = String(cells[4] ?? '').trim().toLowerCase();
      const score     = Number(cells[5]);
      const maxScore  = cells[6] ? Number(cells[6]) : 100;
      const date      = String(cells[7] ?? '').trim();
      const comment   = String(cells[8] ?? '').trim() || undefined;

      const errors: string[] = [];
      if (!studentId) errors.push('studentId yo\'q');
      if (!subjectId) errors.push('subjectId yo\'q');
      if (!classId)   errors.push('classId yo\'q');
      if (!VALID_TYPES.includes(type)) errors.push(`Tur noto'g'ri: ${type}`);
      if (isNaN(score) || score < 0)  errors.push('Baho noto\'g\'ri');
      if (isNaN(Date.parse(date)))    errors.push('Sana noto\'g\'ri (YYYY-MM-DD kerak)');

      rows.push({
        row: rowIndex,
        data: { studentId, subjectId, classId, type, score, maxScore, date, comment },
        errors,
        valid: errors.length === 0,
      });
    });

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitGrades(rows: ImportRow[], currentUser: JwtPayload): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0; const errors: string[] = [];

    // Transaction ichida batch insert
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          await tx.grade.create({
            data: {
              schoolId,
              studentId: row.data.studentId,
              subjectId: row.data.subjectId,
              classId:   row.data.classId,
              type:      row.data.type as any,
              score:     row.data.score,
              maxScore:  row.data.maxScore,
              date:      new Date(row.data.date),
              comment:   row.data.comment,
            },
          });
          created++;
        }
      });
    } catch (e: any) {
      errors.push(e.message);
    }

    return { created, skipped: 0, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTENDANCE IMPORT
  // ─────────────────────────────────────────────────────────────────────────────
  // A: studentId | B: date (YYYY-MM-DD) | C: status (present/absent/late/excused) | D: note (ixtiyoriy)

  async parseAttendance(buffer: Buffer): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('Excel faylda varaq topilmadi');

    const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];
    const rows: ImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return; // header
      const cells = row.values as any[];
      const studentId = String(cells[1] ?? '').trim();
      const date      = String(cells[2] ?? '').trim();
      const status    = String(cells[3] ?? '').trim().toLowerCase();
      const note      = String(cells[4] ?? '').trim() || undefined;

      const errors: string[] = [];
      if (!studentId)                   errors.push('studentId yo\'q');
      if (isNaN(Date.parse(date)))      errors.push('Sana noto\'g\'ri (YYYY-MM-DD kerak)');
      if (!VALID_STATUSES.includes(status)) errors.push(`Status noto'g'ri: ${status}. Mumkin: ${VALID_STATUSES.join(', ')}`);

      rows.push({
        row: rowIndex,
        data: { studentId, date, status, note },
        errors,
        valid: errors.length === 0,
      });
    });

    return {
      total: rows.length,
      valid: rows.filter(r => r.valid).length,
      invalid: rows.filter(r => !r.valid).length,
      rows,
    };
  }

  async commitAttendance(rows: ImportRow[], currentUser: JwtPayload): Promise<CommitResult> {
    const schoolId = currentUser.schoolId!;
    const validRows = rows.filter(r => r.valid);
    let created = 0; let skipped = 0; const errors: string[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of validRows) {
          const dateObj = new Date(row.data.date + 'T00:00:00');
          // Upsert: bir xil (studentId + date) bo'lsa, yangilash
          const existing = await tx.attendance.findFirst({
            where: { studentId: row.data.studentId, date: dateObj, schoolId },
          });
          if (existing) {
            await tx.attendance.update({
              where: { id: existing.id },
              data: { status: row.data.status as any, note: row.data.note },
            });
            skipped++;
          } else {
            const enrollment = await tx.classStudent.findFirst({
              where: { studentId: row.data.studentId },
              select: { classId: true },
            });
            await tx.attendance.create({
              data: {
                schoolId,
                classId: enrollment?.classId ?? '',
                studentId: row.data.studentId,
                date: dateObj,
                status: row.data.status as any,
                note: row.data.note,
              },
            });
            created++;
          }
        }
      });
    } catch (e: any) {
      errors.push(e.message);
    }

    return { created, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE GENERATION — namuna Excel fayllar
  // ─────────────────────────────────────────────────────────────────────────────

  async generateTemplate(type: 'students' | 'users' | 'schedule' | 'grades' | 'attendance'): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ma\'lumotlar');

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
      alignment: { horizontal: 'center' },
    };

    const addHeaders = (headers: string[]) => {
      const row = sheet.addRow(headers);
      row.eachCell(cell => { Object.assign(cell, headerStyle); });
      sheet.columns = headers.map((h, i) => ({ width: 20, key: String(i + 1) }));
    };

    if (type === 'students') {
      addHeaders(['Ism', 'Familiya', 'Email', 'Telefon', 'Parol (ixtiyoriy)', 'Sinf ID (ixtiyoriy)']);
      sheet.addRow(['Ali', 'Valiyev', 'ali@example.com', '+998901234567', 'Student@123', '']);
      sheet.addRow(['Nodira', 'Karimova', 'nodira@example.com', '+998901234568', '', '']);
    } else if (type === 'users') {
      addHeaders(['Ism', 'Familiya', 'Email', 'Telefon', 'Rol (teacher/accountant/...)', 'Parol']);
      sheet.addRow(['Jasur', 'Toshmatov', 'jasur@example.com', '+998901234567', 'teacher', 'Staff@123']);
    } else if (type === 'schedule') {
      addHeaders(['Sinf ID', 'Fan ID', "O'qituvchi ID", 'Kun (monday-sunday)', 'Slot (1-12)', 'Boshlanish (HH:MM)', 'Tugash (HH:MM)', 'Xona (ixtiyoriy)']);
      sheet.addRow(['class-uuid', 'subject-uuid', 'teacher-uuid', 'monday', '1', '08:00', '08:45', '101']);
    } else if (type === 'grades') {
      addHeaders(["O'quvchi ID", 'Fan ID', 'Sinf ID', 'Tur (homework/test/exam/...)', 'Baho', 'Maks baho', 'Sana (YYYY-MM-DD)', 'Izoh']);
      sheet.addRow(['student-uuid', 'subject-uuid', 'class-uuid', 'test', '85', '100', '2026-03-15', '']);
    } else if (type === 'attendance') {
      addHeaders(["O'quvchi ID", 'Sana (YYYY-MM-DD)', 'Holat (present/absent/late/excused)', 'Izoh (ixtiyoriy)']);
      sheet.addRow(['student-uuid', '2026-04-06', 'present', '']);
      sheet.addRow(['student-uuid-2', '2026-04-06', 'absent', 'Kasal']);
      sheet.addRow(['student-uuid-3', '2026-04-06', 'late', '5 daqiqa kechikdi']);
    }

    // Excel buffer sifatida qaytarish
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
