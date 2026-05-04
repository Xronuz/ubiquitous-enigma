import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Attendance Summary ──────────────────────────────────────────────────
  async getAttendanceSummary(
    currentUser: JwtPayload,
    classId?: string,
    month?: string,
  ) {
    const where: any = { ...buildTenantWhere(currentUser) };
    if (classId) where.classId = classId;
    if (month) {
      const [year, m] = month.split('-').map(Number);
      where.date = {
        gte: new Date(year, m - 1, 1),
        lt:  new Date(year, m, 1),
      };
    }

    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      // Safety cap: prevents OOM on schools with years of attendance data.
      // For unbounded exports, use the Excel export endpoint instead.
      take: 10_000,
    });

    const summary = new Map<string, {
      name: string; present: number; absent: number; late: number; excused: number;
    }>();
    for (const r of records) {
      if (!summary.has(r.studentId)) {
        summary.set(r.studentId, {
          name: `${r.student.firstName} ${r.student.lastName}`,
          present: 0, absent: 0, late: 0, excused: 0,
        });
      }
      const s = summary.get(r.studentId)!;
      if (r.status === 'present')       s.present++;
      else if (r.status === 'absent')   s.absent++;
      else if (r.status === 'late')     s.late++;
      else if (r.status === 'excused')  s.excused++;
    }
    return Array.from(summary.values());
  }

  // ─── Grades Summary ──────────────────────────────────────────────────────
  async getGradesSummary(
    currentUser: JwtPayload,
    classId?: string,
    subjectId?: string,
  ) {
    const where: any = { ...buildTenantWhere(currentUser) };
    if (classId)   where.classId   = classId;
    if (subjectId) where.subjectId = subjectId;

    return this.prisma.grade.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 500,
    });
  }

  // ─── Finance Summary ─────────────────────────────────────────────────────
  async getFinanceSummary(currentUser: JwtPayload) {
    const filter = buildTenantWhere(currentUser);
    const [debtors, totalPaid, totalPending, totalOverdue] = await Promise.all([
      this.prisma.payment.findMany({
        where: { ...filter, status: { in: ['pending', 'overdue'] } },
        include: { student: { select: { firstName: true, lastName: true } } },
        orderBy: { dueDate: 'asc' },
        take: 50,
      }),
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'paid' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'pending' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'overdue' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPaid:    totalPaid._sum.amount    ?? 0,
      totalPending: totalPending._sum.amount ?? 0,
      totalOverdue: totalOverdue._sum.amount ?? 0,
      debtors,
    };
  }

  // ─── PDF: Davomat hisoboti ────────────────────────────────────────────────
  async generateAttendancePdf(
    currentUser: JwtPayload,
    classId?: string,
    month?: string,
  ): Promise<Buffer> {
    const rows = await this.getAttendanceSummary(currentUser, classId, month);
    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(16).font('Helvetica-Bold')
         .text(school?.name ?? 'EduPlatform', { align: 'center' });
      doc.fontSize(12).font('Helvetica')
         .text('Davomat hisoboti', { align: 'center' });
      if (month) {
        doc.fontSize(10).fillColor('#666')
           .text(`Oy: ${month}`, { align: 'center' });
      }
      doc.fontSize(8).fillColor('#999')
         .text(`Yaratildi: ${new Date().toLocaleString('uz-UZ')}`, { align: 'right' });
      doc.moveDown(1);

      // Table header
      const C = { num: 35, name: 60, present: 310, absent: 365, late: 415, pct: 465 };
      const rowH = 20;
      let y = doc.y;

      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9);
      doc.text('#',            C.num,     y, { width: 20 });
      doc.text('Ism-familiya', C.name,    y, { width: 245 });
      doc.text('Keldi',        C.present, y, { width: 50, align: 'center' });
      doc.text('Kelmadi',      C.absent,  y, { width: 45, align: 'center' });
      doc.text('Kechikdi',     C.late,    y, { width: 45, align: 'center' });
      doc.text('%',            C.pct,     y, { width: 50, align: 'right' });

      y += rowH;
      doc.moveTo(35, y - 4).lineTo(550, y - 4).strokeColor('#cbd5e1').stroke();

      rows.forEach((row, i) => {
        if (y > 750) { doc.addPage(); y = 40; }
        const total = row.present + row.absent + row.late + row.excused;
        const pct   = total > 0 ? Math.round((row.present / total) * 100) : 0;

        doc.fillColor(i % 2 === 0 ? '#f8fafc' : '#ffffff')
           .rect(35, y - 3, 515, rowH - 2).fill();

        doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5);
        doc.text(String(i + 1), C.num,     y, { width: 20 });
        doc.text(row.name,      C.name,    y, { width: 245, ellipsis: true });
        doc.fillColor('#16a34a')
           .text(String(row.present), C.present, y, { width: 50, align: 'center' });
        doc.fillColor('#dc2626')
           .text(String(row.absent),  C.absent,  y, { width: 45, align: 'center' });
        doc.fillColor('#d97706')
           .text(String(row.late),    C.late,    y, { width: 45, align: 'center' });
        doc.fillColor(pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626')
           .font('Helvetica-Bold')
           .text(`${pct}%`, C.pct, y, { width: 50, align: 'right' });
        y += rowH;
      });

      doc.fillColor('#64748b').font('Helvetica').fontSize(8)
         .text(`\nJami: ${rows.length} ta o'quvchi`, 35);
      doc.end();
    });
  }

  // ─── PDF: Baholar hisoboti ────────────────────────────────────────────────
  async generateGradesPdf(
    currentUser: JwtPayload,
    classId?: string,
    subjectId?: string,
  ): Promise<Buffer> {
    const grades = await this.getGradesSummary(currentUser, classId, subjectId);
    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    const TYPE_UZ: Record<string, string> = {
      homework: 'Uy vazifa', classwork: 'Sinf ishi',
      test: 'Test', exam: 'Imtihon',
      quarterly: 'Chorak', final: 'Yakuniy',
    };

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).font('Helvetica-Bold')
         .text(school?.name ?? 'EduPlatform', { align: 'center' });
      doc.fontSize(12).font('Helvetica')
         .text('Baholar hisoboti', { align: 'center' });
      doc.fontSize(8).fillColor('#999')
         .text(`Yaratildi: ${new Date().toLocaleString('uz-UZ')}`, { align: 'right' });
      doc.moveDown(1);

      const C = { student: 35, subject: 195, type: 315, score: 420, date: 470 };
      const rowH = 20;
      let y = doc.y;

      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9);
      doc.text('O\'quvchi', C.student, y, { width: 155 });
      doc.text('Fan',       C.subject, y, { width: 115 });
      doc.text('Tur',       C.type,    y, { width: 100 });
      doc.text('Ball',      C.score,   y, { width: 45, align: 'center' });
      doc.text('Sana',      C.date,    y, { width: 75, align: 'right' });

      y += rowH;
      doc.moveTo(35, y - 4).lineTo(550, y - 4).strokeColor('#cbd5e1').stroke();

      grades.forEach((g, i) => {
        if (y > 750) { doc.addPage(); y = 40; }
        const pct = g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0;

        doc.fillColor(i % 2 === 0 ? '#f8fafc' : '#ffffff')
           .rect(35, y - 3, 515, rowH - 2).fill();

        doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5);
        doc.text(`${g.student.firstName} ${g.student.lastName}`, C.student, y, { width: 155, ellipsis: true });
        doc.text(g.subject.name, C.subject, y, { width: 115, ellipsis: true });
        doc.text(TYPE_UZ[g.type] ?? g.type,  C.type, y, { width: 100 });
        doc.fillColor(pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626')
           .font('Helvetica-Bold')
           .text(`${g.score}/${g.maxScore}`, C.score, y, { width: 45, align: 'center' });
        doc.fillColor('#64748b').font('Helvetica')
           .text(new Date(g.date).toLocaleDateString('uz-UZ'), C.date, y, { width: 75, align: 'right' });
        y += rowH;
      });

      doc.fillColor('#64748b').font('Helvetica').fontSize(8)
         .text(`\nJami: ${grades.length} ta baho`, 35);
      doc.end();
    });
  }

  // ─── PDF: Moliya hisoboti ─────────────────────────────────────────────────
  async generateFinancePdf(currentUser: JwtPayload): Promise<Buffer> {
    const fin = await this.getFinanceSummary(currentUser);
    const school = await this.prisma.school.findUnique({
      where: { id: currentUser.schoolId! },
      select: { name: true },
    });

    const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(n) + ' UZS';

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({ margin: 40, size: 'A4' });

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).font('Helvetica-Bold')
         .text(school?.name ?? 'EduPlatform', { align: 'center' });
      doc.fontSize(12).font('Helvetica')
         .text('Moliyaviy hisobot', { align: 'center' });
      doc.fontSize(8).fillColor('#999')
         .text(`Yaratildi: ${new Date().toLocaleString('uz-UZ')}`, { align: 'right' });
      doc.moveDown(1.5);

      // KPI summary
      const kpiY  = doc.y;
      const kpis = [
        { label: "To'langan",  value: fmt(fin.totalPaid),    color: '#16a34a' },
        { label: 'Kutilmoqda', value: fmt(fin.totalPending), color: '#d97706' },
        { label: 'Kechikkan',  value: fmt(fin.totalOverdue), color: '#dc2626' },
      ];
      kpis.forEach((kpi, i) => {
        const x = 35 + i * 175;
        doc.fillColor('#f8fafc').rect(x, kpiY, 160, 50).fill();
        doc.fillColor('#64748b').font('Helvetica').fontSize(9)
           .text(kpi.label, x + 10, kpiY + 8, { width: 140 });
        doc.fillColor(kpi.color).font('Helvetica-Bold').fontSize(10)
           .text(kpi.value, x + 10, kpiY + 26, { width: 140 });
      });

      doc.moveDown(4);

      // Debtors table
      if (fin.debtors.length > 0) {
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(11)
           .text('Qarzdorlar ro\'yxati');
        doc.moveDown(0.5);

        const C = { num: 35, name: 60, amount: 360, status: 460 };
        const rowH = 20;
        let y = doc.y;

        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9);
        doc.text('#',          C.num,    y, { width: 20 });
        doc.text('O\'quvchi', C.name,   y, { width: 295 });
        doc.text('Summa',     C.amount, y, { width: 95,  align: 'right' });
        doc.text('Holat',     C.status, y, { width: 65,  align: 'center' });

        y += rowH;
        doc.moveTo(35, y - 4).lineTo(550, y - 4).strokeColor('#cbd5e1').stroke();

        fin.debtors.forEach((d, i) => {
          if (y > 750) { doc.addPage(); y = 40; }
          const isOverdue = d.status === 'overdue';
          const name = `${(d as any).student?.firstName ?? ''} ${(d as any).student?.lastName ?? ''}`.trim();

          doc.fillColor(i % 2 === 0 ? '#f8fafc' : '#ffffff')
             .rect(35, y - 3, 515, rowH - 2).fill();

          doc.fillColor('#0f172a').font('Helvetica').fontSize(8.5);
          doc.text(String(i + 1), C.num,   y, { width: 20 });
          doc.text(name,          C.name,  y, { width: 295 });
          doc.fillColor(isOverdue ? '#dc2626' : '#d97706').font('Helvetica-Bold')
             .text(fmt(d.amount), C.amount, y, { width: 95, align: 'right' });
          doc.font('Helvetica')
             .text(isOverdue ? 'Kechikkan' : 'Kutilmoqda', C.status, y, { width: 65, align: 'center' });
          y += rowH;
        });

        doc.fillColor('#64748b').font('Helvetica').fontSize(8)
           .text(`\nJami qarzdorlar: ${fin.debtors.length} ta`, 35);
      }

      doc.end();
    });
  }

  // ─── Report Card JSON ────────────────────────────────────────────────────────
  async getReportCardData(
    currentUser: JwtPayload,
    studentId: string,
    quarter: number,
  ) {
    const schoolId = currentUser.schoolId!;
    const now = new Date();
    const year = now.getFullYear();
    const QUARTER_RANGES: Record<number, [number, number]> = {
      1: [8, 10], 2: [11, 1], 3: [2, 4], 4: [5, 7],
    };
    const [startM, endM] = QUARTER_RANGES[quarter] ?? [0, 2];
    const startDate = new Date(year, startM, 1);
    const endDate   = new Date(year, endM + 1, 0, 23, 59, 59);

    const [student, grades, attendance] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: studentId, schoolId },
        include: {
          studentClasses: { include: { class: { select: { name: true } } }, take: 1 },
        },
      }),
      this.prisma.grade.findMany({
        where: { studentId, schoolId, date: { gte: startDate, lte: endDate } },
        include: { subject: { select: { name: true } } },
      }),
      this.prisma.attendance.findMany({
        where: { studentId, schoolId, date: { gte: startDate, lte: endDate } },
        select: { status: true },
      }),
    ]);

    if (!student) throw new Error('O\'quvchi topilmadi');

    const subjectMap = new Map<string, { total: number; count: number; maxTotal: number }>();
    for (const g of grades) {
      const name = g.subject.name;
      const cur = subjectMap.get(name) ?? { total: 0, count: 0, maxTotal: 0 };
      subjectMap.set(name, { total: cur.total + g.score, count: cur.count + 1, maxTotal: cur.maxTotal + g.maxScore });
    }
    const subjects = Array.from(subjectMap.entries())
      .map(([name, s]) => ({ name, avgScore: s.maxTotal > 0 ? Math.round((s.total / s.maxTotal) * 100) : 0, count: s.count }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const attCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const a of attendance) {
      if (a.status in attCounts) attCounts[a.status as keyof typeof attCounts]++;
    }
    const totalDays = attendance.length;
    const attPct = totalDays > 0 ? Math.round((attCounts.present / totalDays) * 100) : 0;
    const gpa = subjects.length > 0 ? Math.round(subjects.reduce((s, r) => s + r.avgScore, 0) / subjects.length) : 0;

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        className: student.studentClasses?.[0]?.class?.name ?? '—',
      },
      quarter,
      year: String(year),
      subjects,
      gpa,
      attendanceRate: attPct,
      totalPresent: attCounts.present,
      totalAbsent: attCounts.absent,
    };
  }

  // ─── At-risk student detection ────────────────────────────────────────────────
  async getAtRiskStudents(
    currentUser: JwtPayload,
    attendanceThreshold = 75,
    gradeThreshold = 60,
    classId?: string,
  ) {
    const schoolId = currentUser.schoolId!;
    const branchFilterWhere = buildTenantWhere(currentUser);

    // Get all active students (with optional class filter)
    const classWhere: any = { class: { ...branchFilterWhere } };
    if (classId) classWhere.classId = classId;

    const classStudents = await this.prisma.classStudent.findMany({
      where: classWhere,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        class: { select: { id: true, name: true } },
      },
    });

    // ── Batch N+1 fix ───────────────────────────────────────────────────────
    // Before: 2 DB queries per student → O(students×2) round-trips
    // After:  2 groupBy queries for ALL students → always 2 round-trips total
    const studentIds = classStudents.map(cs => cs.student.id);

    if (studentIds.length === 0) {
      return { students: [], total: 0, thresholds: { attendance: attendanceThreshold, grade: gradeThreshold } };
    }

    const [attendanceGroups, gradeGroups] = await Promise.all([
      // Attendance: group by (studentId, status) → count per status per student
      this.prisma.attendance.groupBy({
        by:    ['studentId', 'status'],
        where: { studentId: { in: studentIds }, schoolId },
        _count: { _all: true },
      }),
      // Grades: group by studentId → sum(score) + sum(maxScore) per student
      this.prisma.grade.groupBy({
        by:    ['studentId'],
        where: { studentId: { in: studentIds }, schoolId },
        _sum:  { score: true, maxScore: true },
      }),
    ]);

    // Build O(1) lookup maps
    const attMap = new Map<string, { total: number; present: number }>();
    for (const row of attendanceGroups) {
      const cur = attMap.get(row.studentId) ?? { total: 0, present: 0 };
      cur.total += row._count._all;
      if (row.status === 'present') cur.present += row._count._all;
      attMap.set(row.studentId, cur);
    }

    const gradeMap = new Map<string, { score: number; maxScore: number }>();
    for (const row of gradeGroups) {
      gradeMap.set(row.studentId, {
        score:    row._sum.score    ?? 0,
        maxScore: row._sum.maxScore ?? 0,
      });
    }

    // Evaluate risk using the pre-fetched maps (no DB calls inside loop)
    const results: any[] = [];
    for (const cs of classStudents) {
      const studentId = cs.student.id;
      const att   = attMap.get(studentId)   ?? { total: 0, present: 0 };
      const grade = gradeMap.get(studentId) ?? { score: 0, maxScore: 0 };

      const attPct   = att.total   > 0 ? Math.round((att.present / att.total) * 100) : 100;
      const gradePct = grade.maxScore > 0 ? Math.round((grade.score / grade.maxScore) * 100) : 100;

      const isAtRisk = attPct < attendanceThreshold || gradePct < gradeThreshold;
      if (!isAtRisk) continue;

      results.push({
        studentId,
        studentName: `${cs.student.firstName} ${cs.student.lastName}`,
        className: cs.class.name,
        attendanceRate: attPct,
        gradeAverage: gradePct,
        risks: [
          ...(attPct < attendanceThreshold ? [`Davomat past: ${attPct}%`] : []),
          ...(gradePct < gradeThreshold ? [`O'rtacha ball past: ${gradePct}%`] : []),
        ],
      });
    }

    // Sort by severity (lowest attendance first)
    results.sort((a, b) => a.attendanceRate - b.attendanceRate);
    return { students: results, total: results.length, thresholds: { attendance: attendanceThreshold, grade: gradeThreshold } };
  }

  // ─── PDF: Choraklik guvohnoma (Report Card) ───────────────────────────────
  /**
   * Generates a quarterly report card for one student.
   * quarter: 1-4
   */
  async generateReportCard(
    currentUser: JwtPayload,
    studentId: string,
    quarter: number,
  ): Promise<Buffer> {
    const schoolId = currentUser.schoolId!;

    // Determine date range for the quarter (Sep-Nov, Dec-Feb, Mar-May, Jun-Aug)
    const now = new Date();
    const year = now.getFullYear();
    const QUARTER_RANGES: Record<number, [number, number]> = {
      1: [8, 10],  // Sep–Nov (months 8,9,10 — 0-indexed)
      2: [11, 1],  // Dec–Feb
      3: [2, 4],   // Mar–May
      4: [5, 7],   // Jun–Aug
    };
    const [startM, endM] = QUARTER_RANGES[quarter] ?? [0, 2];
    const startDate = new Date(year, startM, 1);
    const endDate   = new Date(year, endM + 1, 0, 23, 59, 59);

    const [student, school, grades, attendance] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: studentId, ...buildTenantWhere(currentUser) },
        include: {
          studentClasses: {
            include: { class: { select: { name: true, gradeLevel: true } } },
            take: 1,
          },
        },
      }),
      this.prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
      this.prisma.grade.findMany({
        where: { studentId, schoolId, date: { gte: startDate, lte: endDate } },
        include: { subject: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.attendance.findMany({
        where: { studentId, schoolId, date: { gte: startDate, lte: endDate } },
        select: { status: true },
      }),
    ]);

    if (!student) throw new Error('O\'quvchi topilmadi');

    // Aggregate grades by subject
    const subjectMap = new Map<string, { total: number; count: number; maxTotal: number }>();
    for (const g of grades) {
      const name = g.subject.name;
      const cur  = subjectMap.get(name) ?? { total: 0, count: 0, maxTotal: 0 };
      subjectMap.set(name, {
        total:    cur.total + g.score,
        count:    cur.count + 1,
        maxTotal: cur.maxTotal + g.maxScore,
      });
    }

    const subjectRows = Array.from(subjectMap.entries()).map(([name, s]) => ({
      name,
      avg: s.maxTotal > 0 ? Math.round((s.total / s.maxTotal) * 100) : 0,
      count: s.count,
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Attendance counts
    const attCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const a of attendance) {
      if (a.status in attCounts) attCounts[a.status as keyof typeof attCounts]++;
    }
    const totalDays = attendance.length;
    const attPct = totalDays > 0 ? Math.round((attCounts.present / totalDays) * 100) : 0;

    const className = student.studentClasses?.[0]?.class?.name ?? '—';
    const studentName = `${student.firstName} ${student.lastName}`;
    const overallGpa = subjectRows.length > 0
      ? Math.round(subjectRows.reduce((s, r) => s + r.avg, 0) / subjectRows.length)
      : 0;

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new (PDFDocument as any)({ margin: 50, size: 'A4' });

      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Header ────────────────────────────────────────────────────────────
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b')
         .text(school?.name ?? 'EduPlatform', { align: 'center' });
      doc.fontSize(13).font('Helvetica').fillColor('#475569')
         .text(`${quarter}-chorak guvohnomasi`, { align: 'center' });
      doc.fontSize(9).fillColor('#94a3b8')
         .text(`Sana: ${new Date().toLocaleDateString('uz-UZ')}`, { align: 'right' });
      doc.moveDown(0.5);

      // Decorative line
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.moveDown(0.8);

      // ── Student info ──────────────────────────────────────────────────────
      const infoY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a')
         .text('O\'quvchi ma\'lumotlari', 50, infoY);
      doc.moveDown(0.3);

      const INFO: [string, string][] = [
        ['Ismi',    studentName],
        ['Sinf',    className],
        ['Chorak',  `${quarter}-chorak`],
        ['GPA',     `${overallGpa}%`],
      ];
      for (const [label, value] of INFO) {
        const y = doc.y;
        doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(label + ':', 50, y, { width: 80 });
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text(value, 140, y, { width: 200 });
        doc.moveDown(0.2);
      }
      doc.moveDown(0.8);

      // ── Grades table ──────────────────────────────────────────────────────
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Fanlar bo\'yicha baholar');
      doc.moveDown(0.4);

      const C = { num: 50, name: 75, count: 360, avg: 430 };
      const rowH = 20;
      let y = doc.y;

      // Table header
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9);
      doc.text('#',       C.num,   y, { width: 20 });
      doc.text('Fan',     C.name,  y, { width: 280 });
      doc.text('Baholar', C.count, y, { width: 65, align: 'center' });
      doc.text('%',       C.avg,   y, { width: 65, align: 'right' });

      y += rowH;
      doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      for (let i = 0; i < subjectRows.length; i++) {
        if (y > 720) { doc.addPage(); y = 50; }
        const row = subjectRows[i];
        const isEven = i % 2 === 0;

        doc.fillColor(isEven ? '#f8fafc' : '#ffffff')
           .rect(50, y - 3, 495, rowH - 2).fill();

        doc.fillColor('#0f172a').font('Helvetica').fontSize(9);
        doc.text(String(i + 1), C.num, y, { width: 20 });
        doc.text(row.name,      C.name, y, { width: 280 });
        doc.text(String(row.count), C.count, y, { width: 65, align: 'center' });

        const avgColor = row.avg >= 80 ? '#16a34a' : row.avg >= 60 ? '#d97706' : '#dc2626';
        doc.fillColor(avgColor).font('Helvetica-Bold')
           .text(`${row.avg}%`, C.avg, y, { width: 65, align: 'right' });

        y += rowH;
      }

      // ── Attendance summary ────────────────────────────────────────────────
      doc.moveDown(1);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Davomat xulosasi');
      doc.moveDown(0.4);

      const ATT: [string, string | number, string][] = [
        ['Keldi',    attCounts.present, '#16a34a'],
        ['Kelmadi',  attCounts.absent,  '#dc2626'],
        ['Kechikdi', attCounts.late,    '#d97706'],
        ['Uzrli',    attCounts.excused, '#64748b'],
        ["Jami kun", totalDays,         '#1e293b'],
        ["Davomat",  `${attPct}%`,      attPct >= 80 ? '#16a34a' : '#dc2626'],
      ];
      const attY = doc.y;
      ATT.forEach(([label, val, color], i) => {
        const x = 50 + (i % 3) * 165;
        const rowY = attY + Math.floor(i / 3) * 40;
        doc.fillColor('#f8fafc').rect(x, rowY, 150, 34).fill();
        doc.fillColor('#64748b').font('Helvetica').fontSize(8).text(label, x + 8, rowY + 6, { width: 130 });
        doc.fillColor(color).font('Helvetica-Bold').fontSize(13).text(String(val), x + 8, rowY + 17, { width: 130 });
      });

      doc.moveDown(4);

      // ── Signature ─────────────────────────────────────────────────────────
      const sigY = doc.y + 20;
      doc.moveTo(50, sigY + 40).lineTo(200, sigY + 40).strokeColor('#94a3b8').stroke();
      doc.moveTo(345, sigY + 40).lineTo(545, sigY + 40).strokeColor('#94a3b8').stroke();
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
         .text('Sinf rahbari imzosi', 50, sigY + 44, { width: 150 })
         .text('Direktor imzosi', 345, sigY + 44, { width: 200 });

      doc.end();
    });
  }
}
