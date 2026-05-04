import { apiClient } from './client';

export interface FunnelStage {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface SourceBreakdown {
  source: string;
  label: string;
  count: number;
  converted: number;
  conversionRate: number;
}

export interface MonthlyTrend {
  month: string;
  leads: number;
  converted: number;
  conversionRate: number;
}

export interface MarketingDashboard {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  conversionRate: number;
  topSources: SourceBreakdown[];
  funnel: FunnelStage[];
  monthlyTrend: MonthlyTrend[];
}

export const marketingApi = {
  getDashboard: () =>
    apiClient.get<MarketingDashboard>('/marketing/dashboard').then(r => r.data),

  getFunnel: () =>
    apiClient.get<FunnelStage[]>('/marketing/funnel').then(r => r.data),

  getSources: () =>
    apiClient.get<SourceBreakdown[]>('/marketing/sources').then(r => r.data),

  getMonthlyTrend: () =>
    apiClient.get<MonthlyTrend[]>('/marketing/monthly-trend').then(r => r.data),
};
