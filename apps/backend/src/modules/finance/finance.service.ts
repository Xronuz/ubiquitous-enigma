import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { TreasuryService } from '@/modules/treasury/treasury.service';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly treasuryService: TreasuryService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private getMonthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // ── Dashboard stats ───────────────────────────────────────────────────────

  async getDashboardStats(currentUser: JwtPayload) {
    const filter = buildTenantWhere(currentUser);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      pendingPayments,
      overduePayments,
      totalStudents,
      lastPayments,
      approvedPayrolls,
    ] = await this.prisma.$transaction([
      // Total paid ever
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'paid' },
        _sum: { amount: true },
        _count: true,
      }),
      // This month paid
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'paid', paidAt: { gte: thisMonthStart, lte: thisMonthEnd } },
        _sum: { amount: true },
        _count: true,
      }),
      // Last month paid
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'paid', paidAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
        _count: true,
      }),
      // Pending
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'pending' },
        _sum: { amount: true },
        _count: true,
      }),
      // Overdue
      this.prisma.payment.aggregate({
        where: { ...filter, status: 'overdue' },
        _sum: { amount: true },
        _count: true,
      }),
      // Total students
      this.prisma.user.count({ where: { ...filter, role: 'student', isActive: true } }),
      // Last 10 payments
      this.prisma.payment.findMany({
        where: { ...filter },
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Latest approved payroll total (school-level, not branch-filtered)
      this.prisma.monthlyPayroll.findFirst({
        where: { schoolId: currentUser.schoolId!, status: 'paid' },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { id: true, year: true, month: true, totalNet: true, status: true },
      }),
    ]);

    const thisMonthAmt = thisMonthRevenue._sum.amount ?? 0;
    const lastMonthAmt = lastMonthRevenue._sum.amount ?? 0;
    const revenueGrowth = lastMonthAmt > 0
      ? Math.round(((thisMonthAmt - lastMonthAmt) / lastMonthAmt) * 100)
      : thisMonthAmt > 0 ? 100 : 0;

    // G'azna balanslari (director uchun umumiy ko'rinish)
    const treasurySummary = await this.treasuryService.getFinanceSummary(currentUser);

    return {
      totalRevenue: totalRevenue._sum.amount ?? 0,
      totalPayments: totalRevenue._count,
      thisMonthRevenue: thisMonthAmt,
      lastMonthRevenue: lastMonthAmt,
      revenueGrowth,
      pendingAmount: pendingPayments._sum.amount ?? 0,
      pendingCount: pendingPayments._count,
      overdueAmount: overduePayments._sum.amount ?? 0,
      overdueCount: overduePayments._count,
      totalStudents,
      latestPayroll: approvedPayrolls,
      recentPayments: lastPayments,
      // Phase 3: G'azna
      treasury: treasurySummary,
    };
  }

  // ── Monthly revenue chart (12 months) ────────────────────────────────────

  async getMonthlyRevenue(currentUser: JwtPayload, months = 12) {
    const filter = buildTenantWhere(currentUser);
    const now = new Date();
    const result: { year: number; month: number; label: string; revenue: number; count: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const { start, end } = this.getMonthRange(year, month);

      const agg = await this.prisma.payment.aggregate({
        where: { ...filter, status: 'paid', paidAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      });

      const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
      result.push({
        year,
        month,
        label: `${MONTHS_UZ[month - 1]} ${year}`,
        revenue: agg._sum.amount ?? 0,
        count: agg._count,
      });
    }

    return result;
  }

  // ── Debtors list (overdue / pending past due date) ────────────────────────

  async getDebtors(currentUser: JwtPayload) {
    const filter = buildTenantWhere(currentUser);
    const now = new Date();

    const overduePayments = await this.prisma.payment.findMany({
      where: {
        ...filter,
        status: { in: ['overdue', 'pending'] },
        dueDate: { lt: now },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            studentClasses: {
              include: { class: { select: { name: true } } },
              take: 1,
            },
          },
        },
      },
      orderBy: { amount: 'desc' },
      take: 50,
    });

    // Group by student
    const grouped: Record<string, {
      student: any;
      totalDebt: number;
      payments: any[];
      oldestDue: Date;
    }> = {};

    for (const p of overduePayments) {
      const sid = p.studentId;
      if (!grouped[sid]) {
        grouped[sid] = {
          student: p.student,
          totalDebt: 0,
          payments: [],
          oldestDue: p.dueDate ?? now,
        };
      }
      grouped[sid].totalDebt += p.amount;
      grouped[sid].payments.push(p);
      if (p.dueDate && p.dueDate < grouped[sid].oldestDue) {
        grouped[sid].oldestDue = p.dueDate;
      }
    }

    return Object.values(grouped).sort((a, b) => b.totalDebt - a.totalDebt);
  }

  // ── Fee structure summary ─────────────────────────────────────────────────

  async getFeeStructureSummary(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    const feeStructures = await this.prisma.feeStructure.findMany({
      where: { schoolId, isActive: true },
      orderBy: { amount: 'desc' },
    });

    const totalExpected = feeStructures.reduce((sum, f) => sum + f.amount, 0);

    return { feeStructures, totalExpected };
  }
}
