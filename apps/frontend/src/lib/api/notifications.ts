import { apiClient } from './client';

export const notificationsApi = {
  getMyNotifications: async (params?: { page?: number; limit?: number }) => {
    const { data } = await apiClient.get('/notifications', { params });
    return data;
  },

  markAsRead: async (id: string) => {
    const { data } = await apiClient.put(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await apiClient.put('/notifications/read-all');
    return data;
  },

  send: async (payload: { recipientId: string; title: string; body: string; type?: string }) => {
    const { data } = await apiClient.post('/notifications', payload);
    return data;
  },

  getPreferences: async (): Promise<{ preferences: Record<string, boolean> }> => {
    const { data } = await apiClient.get('/notifications/preferences');
    return data;
  },

  updatePreferences: async (prefs: Record<string, boolean>): Promise<{ message: string; preferences: Record<string, boolean> }> => {
    const { data } = await apiClient.patch('/notifications/preferences', prefs);
    return data;
  },

  deleteOne: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/notifications/${id}`);
    return data;
  },

  deleteAll: async (): Promise<{ message: string; count: number }> => {
    const { data } = await apiClient.delete('/notifications/all');
    return data;
  },
};
