import { apiClient } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchoolPulse {
  totalStudents:   number;
  totalTeachers:   number;
  activeBranches:  number;
  today: {
    present:        number;
    absent:         number;
    late:           number;
    total:          number;
    attendanceRate: number | null;
  };
  monthlyRevenue:   number;
  newLeadsThisWeek: number;
  pendingDebt: {
    amount: number;
    count:  number;
  };
  openAlerts: number;
}

export interface MonthlyFinanceRow {
  label:        string;
  year:         number;
  month:        number;
  paid:         number;
  pending:      number;
  overdue:      number;
  paidCount:    number;
  pendingCount: number;
  overdueCount: number;
}

export interface BranchRevenueRow {
  branchId:   string;
  branchName: string;
  code?:      string | null;
  totalPaid:  number;
  txCount:    number;
  avgPayment: number;
}

export interface GlobalFinanceReport {
  monthly:      MonthlyFinanceRow[];
  branches:     BranchRevenueRow[];
  totalBalance: number;
  cashBalance:  number;
  bankBalance:  number;
  paidRows:     { branchId: string | null; total: number; count: number }[];
}

export interface BranchComparisonRow {
  branchId:      string;
  branchName:    string;
  code:          string;
  studentCount:  number;
  avgGrade:      number;
  gradeCount:    number;
  attendancePct: number;
  scheduleCount: number;
  totalLeads:    number;
  convertedLeads: number;
  conversionRate: number;
  gradeRank:     number;
}

export interface MarketingFunnelRow {
  source:           string;
  total:            number;
  converted:        number;
  contacted:        number;
  testLesson:       number;
  conversionRate:   number;
  estimatedRevenue: number;
}

export interface MarketingROI {
  funnelBySource:       MarketingFunnelRow[];
  avgPaymentPerStudent: number;
  totalPaid:            number;
}

export interface SmartAlert {
  type:        'danger' | 'warning' | 'info';
  category:    string;
  title:       string;
  message:     string;
  branchId?:   string | null;
  branchName?: string;
  value?:      number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const analyticsApi = {
  getPulse: async (): Promise<SchoolPulse> => {
    const { data } = await apiClient.get('/reports/analytics/pulse');
    return data;
  },

  getFinance: async (params?: { months?: number; branchId?: string }): Promise<GlobalFinanceReport> => {
    const { data } = await apiClient.get('/reports/analytics/finance', { params });
    return data;
  },

  getBranchComparison: async (): Promise<BranchComparisonRow[]> => {
    const { data } = await apiClient.get('/reports/analytics/branch-comparison');
    return data;
  },

  getMarketingROI: async (branchId?: string): Promise<MarketingROI> => {
    const { data } = await apiClient.get('/reports/analytics/marketing-roi', {
      params: branchId ? { branchId } : {},
    });
    return data;
  },

  getAlerts: async (): Promise<SmartAlert[]> => {
    const { data } = await apiClient.get('/reports/analytics/alerts');
    return data;
  },

  downloadExcel: async (
    type: 'students' | 'payments' | 'attendance',
    branchId?: string,
  ): Promise<void> => {
    const response = await apiClient.get('/reports/export/excel', {
      params: { type, ...(branchId ? { branchId } : {}) },
      responseType: 'blob',
    });
    const names: Record<string, string> = {
      students:   "o'quvchilar",
      payments:   "to'lovlar",
      attendance: 'davomat',
    };
    const url  = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href  = url;
    link.setAttribute('download', `${names[type]}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

// ─── UI Helpers ───────────────────────────────────────────────────────────────

export const ALERT_CONFIG = {
  danger:  { bg: 'bg-red-50 dark:bg-red-950/30',    border: 'border-red-200 dark:border-red-800',    icon: '🔴', text: 'text-red-700 dark:text-red-300'    },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: '🟡', text: 'text-amber-700 dark:text-amber-300' },
  info:    { bg: 'bg-blue-50 dark:bg-blue-950/30',   border: 'border-blue-200 dark:border-blue-800',   icon: '🔵', text: 'text-blue-700 dark:text-blue-300'   },
} as const;

export const SOURCE_LABELS: Record<string, { label: string; emoji: string }> = {
  INSTAGRAM: { label: 'Instagram', emoji: '📸' },
  TELEGRAM:  { label: 'Telegram',  emoji: '✈️' },
  FACEBOOK:  { label: 'Facebook',  emoji: '👥' },
  WEBSITE:   { label: 'Sayt',      emoji: '🌐' },
  REFERRAL:  { label: 'Tavsiya',   emoji: '🤝' },
  CALL:      { label: "Qo'ng'iroq", emoji: '📞' },
  WALK_IN:   { label: 'Shaxsan',   emoji: '🚶' },
  OTHER:     { label: 'Boshqa',    emoji: '📋' },
};
