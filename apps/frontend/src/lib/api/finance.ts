import { apiClient } from './client';
import type { TreasurySummary } from './treasury';

export interface FinanceDashboardStats {
  totalRevenue: number;
  totalPayments: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  pendingAmount: number;
  pendingCount: number;
  overdueAmount: number;
  overdueCount: number;
  totalStudents: number;
  latestPayroll: {
    id: string;
    year: number;
    month: number;
    totalNet: number;
    status: string;
  } | null;
  recentPayments: {
    id: string;
    amount: number;
    status: string;
    description?: string;
    paidAt?: string;
    createdAt: string;
    student: { id: string; firstName: string; lastName: string };
  }[];
  // Phase 3: G'azna
  treasury?: TreasurySummary;
}

export interface MonthlyRevenueItem {
  year: number;
  month: number;
  label: string;
  revenue: number;
  count: number;
}

export interface DebtorItem {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    studentClasses: { class: { name: string } }[];
  };
  totalDebt: number;
  payments: any[];
  oldestDue: string;
}

export const financeApi = {
  getDashboard: (): Promise<FinanceDashboardStats> =>
    apiClient.get('/finance/dashboard').then(r => r.data),

  getMonthlyRevenue: (months = 12): Promise<MonthlyRevenueItem[]> =>
    apiClient.get('/finance/monthly-revenue', { params: { months } }).then(r => r.data),

  getDebtors: (): Promise<DebtorItem[]> =>
    apiClient.get('/finance/debtors').then(r => r.data),

  getFeeSummary: (): Promise<{ feeStructures: any[]; totalExpected: number }> =>
    apiClient.get('/finance/fee-summary').then(r => r.data),
};
