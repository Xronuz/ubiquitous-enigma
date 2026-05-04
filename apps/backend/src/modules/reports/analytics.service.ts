/**
 * AnalyticsService — Global Reporting & Cross-branch Analytics.
 *
 * Barcha metodlar Prisma _sum / _avg / _count aggregate funksiyalaridan foydalanadi.
 * Hech qachon `findMany` + JS loop orqali hisoblash qilinmaydi — DB ga yuk tushmasin.
 *
 * Metodlar:
 *  getGlobalFinanceReport()  — oyma-oy kirim/chiqim, barcha filiallar bo'yicha
 *  getBranchComparison()     — filiallarni talabalar/ball/davomat bo'yicha solishtirish
 *  getMarketingROI()         — Lead source → conversion rate → estimated revenue
 *  getSchoolPulse()          — "Pulse of the school": bugungi real-vaqt snapshot
 *  getSmartAlerts()          — Avtomatik ogohlantirish (treasury farq, teacher gap, ...)
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import ExcelJS from 'exceljs';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Date helpers ──────────────────────────────────────────────────────────

  private monthRange(year: number, month: number) {
    return {
      gte: new Date(year, month - 1, 1),
      lt:  new Date(year, month, 1),
    };
  }

  private lastNMonths(n: number): { year: number; month: number; label: string }[] {
    const result: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    const MONTH_UZ = ['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({
        year:  d.getFullYear(),
        month: d.getMonth() + 1,
        label: `${MONTH_UZ[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return result;
  }

  // ── Money helper: JS floating-point artifact'larini tozalash ─────────────
  // PostgreSQL Float/_sum natijasida 0.1+0.2 kabi artifact bo'lishi mumkin.
  // Tiyin (×100) precisionga yaxlashtirib qaytaradi: 1_234_567.89 → saqlanadi.
  private money(v: number | null | undefined): number {
    return Math.round((v ?? 0) * 100) / 100;
  }

  // ── 1. Global Finance Report ──────────────────────────────────────────────

  /**
   * Barcha filiallar bo'yicha so'nggi N oy moliyaviy ko'rsatkichlari.
   * DB aggregate: _sum(amount) + _count grouped by month + branchId.
   */
  async getGlobalFinanceReport(
    currentUser: JwtPayload,
    months = 12,
    branchId?: string,
  ) {
    const schoolId = currentUser.schoolId!;
    const months_  = this.lastNMonths(months);
    const start    = new Date(months_[0].year, months_[0].month - 1, 1);
    const end      = new Date();

    // ─ Branch list ─────────────────────────────────────────────────────────
    const branches = await this.prisma.branch.findMany({
      where: { schoolId, isActive: true, ...(branchId ? { id: branchId } : {}) },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    // ─ Paid payments by month + branch — single aggregate query ───────────
    const paidRows = await this.prisma.payment.groupBy({
      by:    ['branchId'],
      where: {
        schoolId,
        status:   'paid',
        paidAt:   { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      _sum:   { amount: true },
      _count: { _all: true },
    });

    // ── Monthly breakdown — N+1 fix ──────────────────────────────────────────
    // Before: 3 queries × 12 months = 36 DB round-trips inside Promise.all
    // After:  3 parallel findMany across the whole period → aggregate in JS
    const [allPaid, allPending, allOverdue] = await Promise.all([
      this.prisma.payment.findMany({
        where: { schoolId, status: 'paid',    paidAt:    { gte: start, lte: end }, ...(branchId ? { branchId } : {}) },
        select: { paidAt: true, amount: true },
      }),
      this.prisma.payment.findMany({
        where: { schoolId, status: 'pending', createdAt: { gte: start, lte: end }, ...(branchId ? { branchId } : {}) },
        select: { createdAt: true, amount: true },
      }),
      this.prisma.payment.findMany({
        where: { schoolId, status: 'overdue', dueDate:   { gte: start, lte: end }, ...(branchId ? { branchId } : {}) },
        select: { dueDate: true, amount: true },
      }),
    ]);

    // Aggregate into per-month maps (O(n) — single pass per array)
    const paidByMonth    = new Map<string, { total: number; count: number }>();
    const pendingByMonth = new Map<string, { total: number; count: number }>();
    const overdueByMonth = new Map<string, { total: number; count: number }>();

    for (const p of allPaid) {
      if (!p.paidAt) continue;
      const key = `${p.paidAt.getFullYear()}-${p.paidAt.getMonth() + 1}`;
      const cur = paidByMonth.get(key) ?? { total: 0, count: 0 };
      paidByMonth.set(key, { total: cur.total + p.amount, count: cur.count + 1 });
    }
    for (const p of allPending) {
      const key = `${p.createdAt.getFullYear()}-${p.createdAt.getMonth() + 1}`;
      const cur = pendingByMonth.get(key) ?? { total: 0, count: 0 };
      pendingByMonth.set(key, { total: cur.total + p.amount, count: cur.count + 1 });
    }
    for (const p of allOverdue) {
      if (!p.dueDate) continue;
      const key = `${p.dueDate.getFullYear()}-${p.dueDate.getMonth() + 1}`;
      const cur = overdueByMonth.get(key) ?? { total: 0, count: 0 };
      overdueByMonth.set(key, { total: cur.total + p.amount, count: cur.count + 1 });
    }

    const monthlyData = months_.map(({ year, month, label }) => {
      const key     = `${year}-${month}`;
      const paid    = paidByMonth.get(key)    ?? { total: 0, count: 0 };
      const pending = pendingByMonth.get(key) ?? { total: 0, count: 0 };
      const overdue = overdueByMonth.get(key) ?? { total: 0, count: 0 };
      return {
        label, year, month,
        paid:         this.money(paid.total),
        pending:      this.money(pending.total),
        overdue:      this.money(overdue.total),
        paidCount:    paid.count,
        pendingCount: pending.count,
        overdueCount: overdue.count,
      };
    });

    // ─ Treasury balances ────────────────────────────────────────────────────
    const treasurySummary = await this.prisma.treasury.groupBy({
      by:    ['branchId', 'type'],
      where: { schoolId, isActive: true, ...(branchId ? { branchId } : {}) },
      _sum:  { balance: true },
    });

    const totalBalance = this.money(treasurySummary.reduce((s, r) => s + (r._sum.balance ?? 0), 0));
    const cashBalance  = this.money(treasurySummary.filter(r => r.type === 'CASH').reduce((s, r) => s + (r._sum.balance ?? 0), 0));
    const bankBalance  = this.money(treasurySummary.filter(r => r.type === 'BANK').reduce((s, r) => s + (r._sum.balance ?? 0), 0));

    // ─ Per-branch revenue — N+1 fix ──────────────────────────────────────
    // Before: 1 aggregate query per branch → O(branches) round-trips
    // After:  1 groupBy query for all branches → single round-trip
    const branchRevenueRaw = await this.prisma.payment.groupBy({
      by:    ['branchId'],
      where: { schoolId, status: 'paid', paidAt: { gte: start, lte: end }, ...(branchId ? { branchId } : {}) },
      _sum:   { amount: true },
      _count: { _all: true },
      _avg:   { amount: true },
    });
    const revenueByBranch = new Map(branchRevenueRaw.map(r => [r.branchId, r]));

    const branchRevenue = branches.map((b) => {
      // Cast: Prisma v6 + TS5 narrows Map<K, GroupByResult>.get() to {} | undefined
      const stats = revenueByBranch.get(b.id) as
        | { _sum: { amount: number | null }; _count: { _all: number }; _avg: { amount: number | null } }
        | undefined;
      return {
        branchId:   b.id,
        branchName: b.name,
        code:       b.code,
        totalPaid:  stats?._sum.amount  ?? 0,
        txCount:    stats?._count._all  ?? 0,
        avgPayment: Math.round(stats?._avg.amount ?? 0),
      };
    });

    return {
      monthly:       monthlyData,
      branches:      branchRevenue,
      totalBalance,
      cashBalance,
      bankBalance,
      paidRows:      paidRows.map(r => ({
        branchId: r.branchId,
        total:    r._sum.amount ?? 0,
        count:    r._count._all,
      })),
    };
  }

  // ── 2. Branch Academic Comparison ────────────────────────────────────────

  /**
   * Har bir filialda: talabalar soni, o'rtacha ball, davomat foizi, dars soni.
   * Barcha hisob DB aggregate — JS loop yo'q.
   */
  async getBranchComparison(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const branches = await this.prisma.branch.findMany({
      where: {
        schoolId,
        isActive: true,
        id: currentUser.branchId!,
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    // ── N+1 fix: replace N×5 per-branch queries with 5 school-wide groupBys ─
    // Before: branches.length × 5 queries (e.g. 10 branches = 50 DB round-trips)
    // After:  5 parallel groupBy queries for the entire school → 5 round-trips
    const [
      studentCounts,
      gradeStats,
      attendanceStats,
      scheduleCounts,
      leadStats,
    ] = await Promise.all([
      // Student counts per branch
      this.prisma.user.groupBy({
        by:    ['branchId'],
        where: { schoolId, role: 'student' as any, isActive: true },
        _count: { _all: true },
      }),
      // Average grade per branch (branchId is denormalized on Grade model)
      this.prisma.grade.groupBy({
        by:    ['branchId'],
        where: { schoolId },
        _avg:  { score: true },
        _count: { _all: true },
      }),
      // Attendance status counts per branch
      this.prisma.attendance.groupBy({
        by:    ['branchId', 'status'],
        where: { schoolId },
        _count: { _all: true },
      }),
      // Schedule slot counts per branch
      this.prisma.schedule.groupBy({
        by:    ['branchId'],
        where: { schoolId },
        _count: { _all: true },
      }),
      // Lead status counts per branch
      this.prisma.lead.groupBy({
        by:    ['branchId', 'status'],
        where: { schoolId },
        _count: { _all: true },
      }),
    ]);

    // Build O(1) lookup maps
    const studentMap  = new Map(studentCounts.map(r => [r.branchId, r._count._all]));
    const gradeMap    = new Map(gradeStats.map(r => [r.branchId, r]));
    const scheduleMap = new Map(scheduleCounts.map(r => [r.branchId, r._count._all]));

    // Attendance: branchId → { total, present }
    const attMap = new Map<string | null, { total: number; present: number }>();
    for (const r of attendanceStats) {
      const cur = attMap.get(r.branchId) ?? { total: 0, present: 0 };
      cur.total += r._count._all;
      if (r.status === 'present') cur.present += r._count._all;
      attMap.set(r.branchId, cur);
    }

    // Lead: branchId → { total, converted }
    const leadMap = new Map<string | null, { total: number; converted: number }>();
    for (const r of leadStats) {
      const cur = leadMap.get(r.branchId) ?? { total: 0, converted: 0 };
      cur.total += r._count._all;
      if (r.status === 'CONVERTED') cur.converted += r._count._all;
      leadMap.set(r.branchId, cur);
    }

    // Assemble per-branch results using maps (no DB calls in loop)
    const results = branches.map((b) => {
      const att   = attMap.get(b.id)  ?? { total: 0, present: 0 };
      const lead  = leadMap.get(b.id) ?? { total: 0, converted: 0 };
      // Cast: Prisma v6 + TS5 widens Map<K, GroupByResult>.get() to {} | undefined.
      const grade = gradeMap.get(b.id) as
        | { _avg: { score: number | null }; _count: { _all: number } }
        | undefined;

      const attendancePct  = att.total  > 0 ? Math.round((att.present  / att.total)  * 100) : 0;
      const conversionRate = lead.total > 0 ? Math.round((lead.converted / lead.total) * 100) : 0;

      return {
        branchId:      b.id,
        branchName:    b.name,
        code:          b.code ?? b.name.slice(0, 3).toUpperCase(),
        studentCount:  studentMap.get(b.id)  ?? 0,
        avgGrade:      Math.round((grade?._avg.score ?? 0) * 10) / 10,
        gradeCount:    grade?._count._all    ?? 0,
        attendancePct,
        scheduleCount: scheduleMap.get(b.id) ?? 0,
        totalLeads:    lead.total,
        convertedLeads: lead.converted,
        conversionRate,
      };
    });

    // Ranking: 1-best average grade
    const ranked = [...results].sort((a, b) => b.avgGrade - a.avgGrade);
    return ranked.map((r, i) => ({ ...r, gradeRank: i + 1 }));
  }

  // ── 3. Marketing ROI ──────────────────────────────────────────────────────

  /**
   * Lead source → funnel → estimated revenue.
   * CONVERTED lead → o'quvchi → avg payment amount.
   */
  async getMarketingROI(currentUser: JwtPayload, branchId?: string) {
    const schoolId = currentUser.schoolId!;
    const where: any = { schoolId, ...(branchId ? { branchId } : {}) };

    // Lead source × status cross-tab
    const sourceStatusData = await this.prisma.lead.groupBy({
      by:    ['source', 'status'],
      where,
      _count: { _all: true },
    });

    // Avg payment per student in school (proxy for "value per conversion")
    const paymentStats = await this.prisma.payment.aggregate({
      where: { schoolId, status: 'paid', ...(branchId ? { branchId } : {}) },
      _avg: { amount: true },
      _sum: { amount: true },
    });
    const avgPaymentPerStudent = Math.round(paymentStats._avg.amount ?? 0);

    // Build per-source funnel
    const sources = ['INSTAGRAM', 'TELEGRAM', 'FACEBOOK', 'WEBSITE', 'REFERRAL', 'CALL', 'WALK_IN', 'OTHER'];
    const funnelBySource = sources.map(source => {
      const rows = sourceStatusData.filter(r => r.source === source);
      const total     = rows.reduce((s, r) => s + r._count._all, 0);
      const converted = rows.find(r => r.status === 'CONVERTED')?._count._all ?? 0;
      const contacted = rows.find(r => r.status === 'CONTACTED')?._count._all ?? 0;
      const testLesson = rows.find(r => r.status === 'TEST_LESSON')?._count._all ?? 0;
      const convRate  = total > 0 ? Math.round((converted / total) * 100) : 0;
      const estRevenue = converted * avgPaymentPerStudent;
      return {
        source, total, converted, contacted, testLesson,
        conversionRate: convRate,
        estimatedRevenue: estRevenue,
      };
    }).filter(r => r.total > 0)
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

    return {
      funnelBySource,
      avgPaymentPerStudent,
      totalPaid: this.money(paymentStats._sum.amount),
    };
  }

  // ── 4. School Pulse (Real-time snapshot) ─────────────────────────────────

  /**
   * Dashboard "Pulse" widget uchun: bugungi real vaqt ma'lumotlari.
   * Barcha hisob parallel — $transaction orqali.
   */
  async getSchoolPulse(currentUser: JwtPayload) {
    const filter = buildTenantWhere(currentUser);
    const today    = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalStudents,
      totalTeachers,
      todayPresent,
      todayAbsent,
      todayLate,
      monthlyRevenue,
      newLeadsThisWeek,
      pendingPayments,
      openAlerts,
      activeBranches,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({
        where: { ...filter, role: 'student' as any, isActive: true },
      }),
      this.prisma.user.count({
        where: { ...filter, role: { in: ['teacher', 'class_teacher'] as any }, isActive: true },
      }),
      this.prisma.attendance.count({
        where: { ...filter, status: 'present', date: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.attendance.count({
        where: { ...filter, status: 'absent', date: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.attendance.count({
        where: { ...filter, status: 'late', date: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'paid', paidAt: { gte: monthStart, lte: today } },
        _sum: { amount: true },
      }),
      this.prisma.lead.count({
        where: {
          ...filter,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.payment.aggregate({
        where: { ...filter, status: { in: ['pending', 'overdue'] } },
        _sum:   { amount: true },
        _count: { _all: true },
      }),
      // Financial shifts with discrepancy
      this.prisma.financialShift.count({
        where: {
          ...filter,
          status:      'CLOSED',
          discrepancy: { not: 0 },
          endTime:     { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.branch.count({
        where: { schoolId: currentUser.schoolId!, isActive: true },
      }),
    ]);

    const todayTotalAtt = todayPresent + todayAbsent + todayLate;
    const attendanceRate = todayTotalAtt > 0
      ? Math.round((todayPresent / todayTotalAtt) * 100) : null;

    return {
      totalStudents,
      totalTeachers,
      activeBranches,
      today: {
        present:        todayPresent,
        absent:         todayAbsent,
        late:           todayLate,
        total:          todayTotalAtt,
        attendanceRate,
      },
      monthlyRevenue:   monthlyRevenue._sum.amount ?? 0,
      newLeadsThisWeek,
      pendingDebt: {
        amount: pendingPayments._sum.amount ?? 0,
        count:  pendingPayments._count._all,
      },
      openAlerts,  // treasury discrepancy count
    };
  }

  // ── 5. Smart Alerts ───────────────────────────────────────────────────────

  /**
   * Avto-ogohlantirish:
   *   - Treasury discrepancy > 0 (smena yopilganda farq)
   *   - Overdue payments > 10 ta
   *   - Davomat bugun < 70%
   *   - Ochiq smena > 24 soat
   *   - Konversiya rate < 10%
   */
  async getSmartAlerts(currentUser: JwtPayload) {
    const filter = buildTenantWhere(currentUser);
    const alerts: {
      type:     'warning' | 'danger' | 'info';
      category: string;
      title:    string;
      message:  string;
      branchId?: string | null;
      branchName?: string;
      value?:   number;
    }[] = [];

    const today      = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // ─ 1. Treasury discrepancies (so'nggi 7 kun) ─────────────────────────
    const discrepancyShifts = await this.prisma.financialShift.findMany({
      where: {
        ...filter,
        status:      'CLOSED',
        discrepancy: { not: 0 },
        endTime:     { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { discrepancy: 'desc' },
      take: 5,
    });

    for (const shift of discrepancyShifts) {
      const abs = Math.abs(shift.discrepancy ?? 0);
      alerts.push({
        type:      abs > 100_000 ? 'danger' : 'warning',
        category:  'treasury',
        title:     'Kassa farqi aniqlandi',
        message:   `${shift.branch?.name ?? 'Filial'}: smena yopilganda ${abs.toLocaleString('uz-UZ')} UZS farq`,
        branchId:  shift.branchId,
        branchName: shift.branch?.name,
        value:     abs,
      });
    }

    // ─ 2. Overdue payments ────────────────────────────────────────────────
    const overdueStats = await this.prisma.payment.aggregate({
      where: { ...filter, status: 'overdue' },
      _count: { _all: true },
      _sum:   { amount: true },
    });
    if (overdueStats._count._all > 10) {
      alerts.push({
        type:     overdueStats._count._all > 50 ? 'danger' : 'warning',
        category: 'finance',
        title:    "Muddati o'tgan to'lovlar",
        message:  `${overdueStats._count._all} ta to'lov muddati o'tdi — jami ${(overdueStats._sum.amount ?? 0).toLocaleString('uz-UZ')} UZS`,
        value:    overdueStats._count._all,
      });
    }

    // ─ 3. Today attendance < 70% (per branch) — N+1 fix ─────────────────
    // Before: N branches × 2 serial queries = O(branches) DB round-trips
    // After:  1 groupBy query → aggregate in JS
    // If user has a specific branch, only check that branch. Otherwise check all branches.
    const branches = currentUser.branchId
      ? await this.prisma.branch.findMany({
          where: { id: currentUser.branchId, schoolId: currentUser.schoolId!, isActive: true },
          select: { id: true, name: true },
        })
      : await this.prisma.branch.findMany({
          where: { schoolId: currentUser.schoolId!, isActive: true },
          select: { id: true, name: true },
        });

    const todayAttGroups = await this.prisma.attendance.groupBy({
      by:    ['branchId', 'status'],
      where: { ...filter, date: { gte: todayStart, lt: todayEnd } },
      _count: { _all: true },
    });

    // Build per-branch attendance map
    const branchAttMap = new Map<string, { present: number; total: number }>();
    for (const row of todayAttGroups) {
      const bid = row.branchId ?? '';
      const cur = branchAttMap.get(bid) ?? { present: 0, total: 0 };
      cur.total += row._count._all;
      if (row.status === 'present') cur.present += row._count._all;
      branchAttMap.set(bid, cur);
    }

    for (const branch of branches) {
      const att = branchAttMap.get(branch.id) ?? { present: 0, total: 0 };
      if (att.total > 5) {
        const pct = Math.round((att.present / att.total) * 100);
        if (pct < 70) {
          alerts.push({
            type:      pct < 50 ? 'danger' : 'warning',
            category:  'attendance',
            title:     'Davomat past',
            message:   `${branch.name}: bugun davomat ${pct}% (${att.present}/${att.total})`,
            branchId:  branch.id,
            branchName: branch.name,
            value:     pct,
          });
        }
      }
    }

    // ─ 4. Open shifts > 24 hours ─────────────────────────────────────────
    const staleShifts = await this.prisma.financialShift.findMany({
      where: {
        ...filter,
        status:    'OPEN',
        startTime: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: { branch: { select: { id: true, name: true } }, treasury: { select: { name: true } } },
    });

    for (const shift of staleShifts) {
      const hrs = Math.round((Date.now() - shift.startTime.getTime()) / (1000 * 60 * 60));
      alerts.push({
        type:      'warning',
        category:  'shift',
        title:     'Smena yopilmagan',
        message:   `${shift.branch?.name ?? 'Filial'} — "${shift.treasury.name}" kassasi ${hrs} soatdan beri ochiq`,
        branchId:  shift.branchId,
        branchName: shift.branch?.name,
        value:     hrs,
      });
    }

    // ─ 5. Low CRM conversion (< 10% bu oy) ───────────────────────────────
    const crmStats = await this.prisma.lead.groupBy({
      by:    ['status'],
      where: { ...filter, createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) } },
      _count: { _all: true },
    });
    const crmTotal     = crmStats.reduce((s, r) => s + r._count._all, 0);
    const crmConverted = crmStats.find(r => r.status === 'CONVERTED')?._count._all ?? 0;
    if (crmTotal > 10) {
      const rate = Math.round((crmConverted / crmTotal) * 100);
      if (rate < 10) {
        alerts.push({
          type:     'info',
          category: 'crm',
          title:    "CRM konversiya past",
          message:  `Bu oy ${crmTotal} ta lead dan faqat ${crmConverted} ta (${rate}%) o'quvchiga aylandi`,
          value:    rate,
        });
      }
    }

    // Sort: danger first, then warning, then info
    const order = { danger: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => order[a.type] - order[b.type]);
  }

  // ── 6. Excel Export ───────────────────────────────────────────────────────

  /**
   * Uch turdagi Excel eksport:
   *   students   — barcha aktiv o'quvchilar ro'yxati
   *   payments   — so'nggi 3 oylik to'lovlar
   *   attendance — bu oylik davomat xulosasi (sinf × kun)
   */
  async exportToExcel(
    currentUser: JwtPayload,
    type: 'students' | 'payments' | 'attendance',
    branchId?: string,
  ): Promise<Buffer> {
    const schoolId = currentUser.schoolId!;
    const wb       = new ExcelJS.Workbook();

    wb.creator  = 'EduPlatform Analytics';
    wb.created  = new Date();
    wb.modified = new Date();

    // ── Shared header style ─────────────────────────────────────────────────
    const applyHeader = (ws: ExcelJS.Worksheet, cols: string[]) => {
      ws.addRow(cols);
      const headerRow = ws.getRow(1);
      headerRow.font      = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height    = 22;
    };

    // ── A: Students ─────────────────────────────────────────────────────────
    if (type === 'students') {
      const students = await this.prisma.user.findMany({
        where: {
          schoolId,
          role: 'student' as any,
          isActive: true,
          ...(branchId ? { branchId } : {}),
        },
        include: {
          branch:         { select: { name: true } },
          studentClasses: {
            take: 1,
            include: { class: { select: { name: true, gradeLevel: true } } },
          },
        },
        orderBy: [{ branch: { name: 'asc' } }, { lastName: 'asc' }],
      });

      const ws = wb.addWorksheet("O'quvchilar");
      ws.columns = [
        { key: 'no',         width: 6  },
        { key: 'lastName',   width: 18 },
        { key: 'firstName',  width: 18 },
        { key: 'phone',      width: 16 },
        { key: 'email',      width: 24 },
        { key: 'branch',     width: 18 },
        { key: 'class',      width: 14 },
        { key: 'grade',      width: 10 },
        { key: 'createdAt',  width: 14 },
      ];

      applyHeader(ws, ['#', 'Familiya', 'Ism', 'Telefon', 'Email', 'Filial', 'Sinf', 'Daraja', "Ro'yxatga olingan"]);

      students.forEach((s, i) => {
        const cls = s.studentClasses[0]?.class;
        ws.addRow({
          no:        i + 1,
          lastName:  s.lastName,
          firstName: s.firstName,
          phone:     s.phone ?? '',
          email:     s.email ?? '',
          branch:    s.branch?.name ?? '',
          class:     cls?.name ?? '',
          grade:     cls?.gradeLevel ?? '',
          createdAt: s.createdAt.toISOString().slice(0, 10),
        });
      });

      // Alternating rows
      ws.eachRow((row, rn) => {
        if (rn > 1 && rn % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
        }
        row.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    }

    // ── B: Payments ─────────────────────────────────────────────────────────
    if (type === 'payments') {
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const payments = await this.prisma.payment.findMany({
        where: {
          schoolId,
          createdAt: { gte: threeMonthsAgo },
          ...(branchId ? { branchId } : {}),
        },
        include: {
          student: { select: { firstName: true, lastName: true, phone: true } },
          branch:  { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      const ws = wb.addWorksheet("To'lovlar");
      ws.columns = [
        { key: 'no',        width: 6  },
        { key: 'student',   width: 24 },
        { key: 'amount',    width: 14 },
        { key: 'status',    width: 14 },
        { key: 'method',    width: 14 },
        { key: 'branch',    width: 18 },
        { key: 'dueDate',   width: 14 },
        { key: 'paidAt',    width: 14 },
      ];

      applyHeader(ws, ['#', "O'quvchi", "Summa (UZS)", 'Holat', "To'lov usuli", 'Filial', 'Muddat', "To'langan sana"]);

      const STATUS_LABEL: Record<string, string> = {
        paid: "To'langan", pending: 'Kutilmoqda', overdue: "Muddati o'tgan", cancelled: 'Bekor',
      };
      const statusColor: Record<string, string> = {
        paid: 'FF16A34A', pending: 'FFD97706', overdue: 'FFDC2626', cancelled: 'FF6B7280',
      };

      payments.forEach((p, i) => {
        const row = ws.addRow({
          no:      i + 1,
          student: `${p.student?.lastName ?? ''} ${p.student?.firstName ?? ''}`.trim(),
          amount:  p.amount,
          status:  STATUS_LABEL[p.status] ?? p.status,
          method:  p.provider ?? '',
          branch:  p.branch?.name ?? '',
          dueDate: p.dueDate?.toISOString().slice(0, 10) ?? '',
          paidAt:  p.paidAt?.toISOString().slice(0, 10) ?? '',
        });

        // Color-code status cell
        const statusCell = row.getCell('status');
        statusCell.font = { color: { argb: statusColor[p.status] ?? 'FF000000' }, bold: true };

        // Amount: number format
        row.getCell('amount').numFmt = '#,##0';
        if (i % 2 === 1) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
        }
      });

      // Summary row
      const totalPaid    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
      ws.addRow([]);
      const sumRow = ws.addRow({ no: '', student: 'JAMI TO\'LANGAN', amount: totalPaid, status: "To'langan" });
      sumRow.font = { bold: true };
      sumRow.getCell('amount').numFmt = '#,##0';
      const sumRow2 = ws.addRow({ no: '', student: 'JAMI KUTILMOQDA', amount: totalPending, status: 'Kutilmoqda' });
      sumRow2.font  = { bold: true };
      sumRow2.getCell('amount').numFmt = '#,##0';
    }

    // ── C: Attendance ────────────────────────────────────────────────────────
    if (type === 'attendance') {
      const now        = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const records = await this.prisma.attendance.findMany({
        where: {
          schoolId,
          date: { gte: monthStart, lt: monthEnd },
          ...(branchId ? { branchId } : {}),
        },
        include: {
          student: { select: { firstName: true, lastName: true } },
          class:   { select: { name: true } },
        },
        orderBy: [{ class: { name: 'asc' } }, { student: { lastName: 'asc' } }, { date: 'asc' }],
      });

      // Group by student
      const map = new Map<string, {
        name: string; className: string;
        present: number; absent: number; late: number; excused: number;
      }>();

      for (const r of records) {
        const key  = r.studentId;
        const name = `${r.student?.lastName ?? ''} ${r.student?.firstName ?? ''}`.trim();
        const cls  = r.class?.name ?? '';
        const cur  = map.get(key) ?? { name, className: cls, present: 0, absent: 0, late: 0, excused: 0 };
        if (r.status === 'present')  cur.present++;
        if (r.status === 'absent')   cur.absent++;
        if (r.status === 'late')     cur.late++;
        if (r.status === 'excused')  cur.excused++;
        map.set(key, cur);
      }

      const ws = wb.addWorksheet('Davomat');
      ws.columns = [
        { key: 'no',        width: 6  },
        { key: 'name',      width: 24 },
        { key: 'className', width: 14 },
        { key: 'present',   width: 12 },
        { key: 'absent',    width: 12 },
        { key: 'late',      width: 12 },
        { key: 'excused',   width: 12 },
        { key: 'total',     width: 12 },
        { key: 'pct',       width: 12 },
      ];

      const MONTH_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
      ws.addRow([`${MONTH_UZ[now.getMonth()]} ${now.getFullYear()} — Davomat xulosasi`]);
      ws.mergeCells(1, 1, 1, 9);
      const titleRow = ws.getRow(1);
      titleRow.font      = { bold: true, size: 13, color: { argb: 'FF6366F1' } };
      titleRow.alignment = { horizontal: 'center' };
      titleRow.height    = 26;
      ws.addRow([]);

      applyHeader(ws, ['#', 'Ism Familiya', 'Sinf', 'Keldi', 'Kelmadi', 'Kechikdi', 'Uzrli', 'Jami', 'Davomat %']);

      let idx = 1;
      for (const [, v] of map) {
        const total = v.present + v.absent + v.late + v.excused;
        const pct   = total > 0 ? Math.round((v.present / total) * 100) : 0;
        const row   = ws.addRow({
          no: idx++, name: v.name, className: v.className,
          present: v.present, absent: v.absent, late: v.late, excused: v.excused,
          total, pct,
        });
        const pctCell = row.getCell('pct');
        pctCell.numFmt = '0"%"';
        pctCell.font   = {
          color: { argb: pct >= 80 ? 'FF16A34A' : pct >= 60 ? 'FFD97706' : 'FFDC2626' },
          bold: true,
        };
        if (idx % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      }
    }

    // ── Write to buffer ──────────────────────────────────────────────────────
    const arrayBuffer = await wb.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
