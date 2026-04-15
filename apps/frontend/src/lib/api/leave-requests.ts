import { apiClient } from './client';

export const leaveRequestsApi = {
  create: async (payload: { reason: string; startDate: string; endDate: string }) => {
    const { data } = await apiClient.post('/leave-requests', payload);
    return data;
  },

  getAll: async (params?: { status?: string }) => {
    const { data } = await apiClient.get('/leave-requests', { params });
    return data;
  },

  getOne: async (id: string) => {
    const { data } = await apiClient.get(`/leave-requests/${id}`);
    return data;
  },

  review: async (id: string, payload: { action: 'approve' | 'reject'; comment?: string }) => {
    const { data } = await apiClient.put(`/leave-requests/${id}/review`, payload);
    return data;
  },

  cancel: async (id: string) => {
    const { data } = await apiClient.put(`/leave-requests/${id}/cancel`);
    return data;
  },
};
