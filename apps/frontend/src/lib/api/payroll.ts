import { apiClient } from './client';

export interface LanguageCert {
  type: string;
  level?: string;
  score?: string;
  expiry?: string;
}

export interface TariffPayload {
  calculationType?: 'fixed' | 'tariff_based';
  qualificationGrade?: 'none' | 'second' | 'first' | 'highest';
  educationLevel?: 'secondary_specialized' | 'higher' | 'master' | 'doctoral';
  workExperienceYears?: number;
  academicDegree?: 'none' | 'candidate' | 'doctor';
  honorificTitle?: 'none' | 'methodist' | 'teacher_of_teachers';
  languageCerts?: LanguageCert[];
  weeklyLessonHours?: number;
}

export const payrollApi = {
  // ── Tariff Reference ───────────────────────────────────────────────────────
  getTariffReference: async () => {
    const { data } = await apiClient.get('/payroll/tariff-reference');
    return data;
  },

  previewTariff: async (payload: TariffPayload) => {
    const { data } = await apiClient.post('/payroll/tariff-preview', payload);
    return data;
  },

  // ── Statistics ─────────────────────────────────────────────────────────────
  getStats: async () => {
    const { data } = await apiClient.get('/payroll/stats');
    return data;
  },

  // ── Staff Salary Configs ───────────────────────────────────────────────────
  getAllSalaryConfigs: async () => {
    const { data } = await apiClient.get('/payroll/staff');
    return data;
  },

  getUnconfiguredStaff: async () => {
    const { data } = await apiClient.get('/payroll/staff/unconfigured');
    return data;
  },

  createSalaryConfig: async (payload: {
    userId: string;
    baseSalary?: number;
    hourlyRate?: number;
    extraCurricularRate?: number;
    degreeAllowance?: number;
    certificateAllowance?: number;
    position?: string;
    startDate: string;
    currency?: string;
  } & TariffPayload) => {
    const { data } = await apiClient.post('/payroll/staff', payload);
    return data;
  },

  updateSalaryConfig: async (id: string, payload: {
    baseSalary?: number;
    hourlyRate?: number;
    extraCurricularRate?: number;
    degreeAllowance?: number;
    certificateAllowance?: number;
    position?: string;
    isActive?: boolean;
  } & TariffPayload) => {
    const { data } = await apiClient.put(`/payroll/staff/${id}`, payload);
    return data;
  },

  deleteSalaryConfig: async (id: string) => {
    const { data } = await apiClient.delete(`/payroll/staff/${id}`);
    return data;
  },

  // ── Advances ───────────────────────────────────────────────────────────────
  getAdvances: async (params?: { status?: string; month?: number; year?: number }) => {
    const { data } = await apiClient.get('/payroll/advances', { params });
    return data;
  },

  // Staff self-request
  createAdvance: async (payload: {
    amount: number;
    reason?: string;
    month: number;
    year: number;
  }) => {
    const { data } = await apiClient.post('/payroll/advances', payload);
    return data;
  },

  // Admin directly issues advance to any staff member (auto-approved)
  issueAdvance: async (payload: {
    targetUserId: string;
    amount: number;
    reason?: string;
    month: number;
    year: number;
  }) => {
    const { data } = await apiClient.post('/payroll/advances/issue', payload);
    return data;
  },

  reviewAdvance: async (id: string, payload: { action: 'approve' | 'reject'; comment?: string }) => {
    const { data } = await apiClient.put(`/payroll/advances/${id}/review`, payload);
    return data;
  },

  markAdvancePaid: async (id: string) => {
    const { data } = await apiClient.put(`/payroll/advances/${id}/paid`);
    return data;
  },

  // ── Monthly Payrolls ────────────────────────────────────────────────────────
  getAllPayrolls: async () => {
    const { data } = await apiClient.get('/payroll/monthly');
    return data;
  },

  getPayrollDetail: async (id: string) => {
    const { data } = await apiClient.get(`/payroll/monthly/${id}`);
    return data;
  },

  generatePayroll: async (payload: { month: number; year: number; note?: string }) => {
    const { data } = await apiClient.post('/payroll/monthly/generate', payload);
    return data;
  },

  updatePayrollItem: async (itemId: string, payload: {
    scheduledHours?: number;
    completedHours?: number;
    extraCurricularHours?: number;
    bonuses?: number;
    deductions?: number;
    note?: string;
  }) => {
    const { data } = await apiClient.put(`/payroll/monthly/items/${itemId}`, payload);
    return data;
  },

  approvePayroll: async (id: string) => {
    const { data } = await apiClient.put(`/payroll/monthly/${id}/approve`);
    return data;
  },

  markPayrollPaid: async (id: string) => {
    const { data } = await apiClient.put(`/payroll/monthly/${id}/paid`);
    return data;
  },

  deletePayroll: async (id: string) => {
    const { data } = await apiClient.delete(`/payroll/monthly/${id}`);
    return data;
  },

  // ── Salary Slips ────────────────────────────────────────────────────────────
  downloadSalarySlip: async (payrollId: string, itemId: string): Promise<void> => {
    const resp = await apiClient.get(`/payroll/monthly/${payrollId}/slip/${itemId}`, { responseType: 'blob' });
    const blob = new Blob([resp.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maosh-varaqasi-${itemId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  sendSalarySlips: async (payrollId: string): Promise<{ sent: number; failed: number; skipped: number }> => {
    const { data } = await apiClient.post(`/payroll/monthly/${payrollId}/send-slips`);
    return data;
  },
};
