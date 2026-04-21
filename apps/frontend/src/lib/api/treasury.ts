import { apiClient } from './client';

export type TreasuryType = 'CASH' | 'BANK';
export type FinanceType  = 'CENTRALIZED' | 'DECENTRALIZED';
export type ShiftStatus  = 'OPEN' | 'CLOSED';

export interface Treasury {
  id: string;
  schoolId: string;
  branchId: string | null;
  name: string;
  type: TreasuryType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string; code?: string | null } | null;
  _count?: { payments: number; financialShifts?: number };
}

export interface TreasurySummary {
  financeType: FinanceType;
  treasuries: Treasury[];
  totalCash: number;
  totalBank: number;
  totalBalance: number;
}

export interface CreateTreasuryDto {
  name: string;
  type?: TreasuryType;
  branchId?: string | null;
  currency?: string;
}

export interface FinancialShift {
  id: string;
  schoolId: string;
  branchId: string | null;
  treasuryId: string;
  openerId: string;
  closerId: string | null;
  startTime: string;
  endTime: string | null;
  startingBalance: number;
  expectedBalance: number | null;
  actualBalance: number | null;
  discrepancy: number | null;
  status: ShiftStatus;
  notes: string | null;
  createdAt: string;
  treasury?: { id: string; name: string; type: TreasuryType; balance: number };
  opener?: { id: string; firstName: string; lastName: string };
  closer?: { id: string; firstName: string; lastName: string } | null;
  _count?: { payments: number };
}

// ── Treasury API ──────────────────────────────────────────────────────────────

export const treasuryApi = {
  getSummary: (): Promise<TreasurySummary> =>
    apiClient.get('/treasury/summary').then((r) => r.data),

  getAll: (): Promise<Treasury[]> =>
    apiClient.get('/treasury').then((r) => r.data),

  getOne: (id: string): Promise<Treasury> =>
    apiClient.get(`/treasury/${id}`).then((r) => r.data),

  create: (dto: CreateTreasuryDto): Promise<Treasury> =>
    apiClient.post('/treasury', dto).then((r) => r.data),

  update: (id: string, dto: Partial<CreateTreasuryDto>): Promise<Treasury> =>
    apiClient.put(`/treasury/${id}`, dto).then((r) => r.data),

  remove: (id: string): Promise<{ message: string; softDeleted: boolean }> =>
    apiClient.delete(`/treasury/${id}`).then((r) => r.data),

  setFinanceType: (financeType: FinanceType): Promise<{ id: string; financeType: FinanceType }> =>
    apiClient.patch('/treasury/finance-type', { financeType }).then((r) => r.data),
};

// ── Financial Shifts API ──────────────────────────────────────────────────────

export const shiftsApi = {
  getAll: (page = 1, limit = 20): Promise<{ data: FinancialShift[]; meta: any }> =>
    apiClient.get('/financial-shifts', { params: { page, limit } }).then((r) => r.data),

  getActive: (): Promise<FinancialShift | null> =>
    apiClient.get('/financial-shifts/active').then((r) => r.data),

  getOne: (id: string): Promise<FinancialShift & { payments: any[] }> =>
    apiClient.get(`/financial-shifts/${id}`).then((r) => r.data),

  open: (dto: { treasuryId: string; startingBalance: number }): Promise<FinancialShift> =>
    apiClient.post('/financial-shifts/open', dto).then((r) => r.data),

  close: (
    id: string,
    dto: { actualBalance: number; notes?: string },
  ): Promise<FinancialShift> =>
    apiClient.patch(`/financial-shifts/${id}/close`, dto).then((r) => r.data),
};
