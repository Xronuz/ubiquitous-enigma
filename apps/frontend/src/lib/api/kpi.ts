import { apiClient } from './client';

export interface KpiMetric {
  id: string;
  name: string;
  description?: string;
  category: string;
  targetValue: number;
  unit: string;
  period: string;
  isActive: boolean;
  branchId?: string;
  branch?: { id: string; name: string };
  createdAt: string;
  _count?: { records: number };
}

export interface KpiRecord {
  id: string;
  metricId: string;
  actualValue: number;
  periodStart: string;
  periodEnd: string;
  notes?: string;
  createdBy?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface KpiDashboardItem {
  metricId: string;
  name: string;
  category: string;
  targetValue: number;
  unit: string;
  latestValue: number | null;
  latestPeriod: string | null;
  progress: number | null;
}

export interface KpiDashboardResponse {
  metrics: KpiDashboardItem[];
  byCategory: Record<string, KpiDashboardItem[]>;
}

export const kpiApi = {
  getMetrics: (category?: string) =>
    apiClient.get<KpiMetric[]>('/kpi/metrics', { params: { category } }).then(r => r.data),

  getMetric: (id: string) =>
    apiClient.get<KpiMetric & { records: KpiRecord[] }>(`/kpi/metrics/${id}`).then(r => r.data),

  createMetric: (payload: {
    name: string;
    description?: string;
    category: string;
    targetValue?: number;
    unit?: string;
    period?: string;
    branchId?: string | null;
    isActive?: boolean;
  }) => apiClient.post<KpiMetric>('/kpi/metrics', payload).then(r => r.data),

  updateMetric: (id: string, payload: Partial<KpiMetric>) =>
    apiClient.put<KpiMetric>(`/kpi/metrics/${id}`, payload).then(r => r.data),

  deleteMetric: (id: string) =>
    apiClient.delete(`/kpi/metrics/${id}`).then(r => r.data),

  createRecord: (payload: {
    metricId: string;
    actualValue: number;
    periodStart: string;
    periodEnd: string;
    notes?: string;
  }) => apiClient.post<KpiRecord>('/kpi/records', payload).then(r => r.data),

  getDashboard: () =>
    apiClient.get<KpiDashboardResponse>('/kpi/dashboard').then(r => r.data),
};
