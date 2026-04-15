import { apiClient } from './client';

export const paymentsApi = {
  create: async (payload: {
    studentId: string;
    amount: number;
    currency?: string;
    provider?: string;
    description?: string;
    dueDate?: string;
  }) => {
    const { data } = await apiClient.post('/payments', payload);
    return data;
  },

  getHistory: async (params?: {
    studentId?: string;
    classId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await apiClient.get('/payments/history', { params });
    return data;
  },

  getReport: async () => {
    const { data } = await apiClient.get('/payments/report');
    return data;
  },

  markAsPaid: async (id: string) => {
    const { data } = await apiClient.put(`/payments/${id}/paid`);
    return data;
  },
};
