import { apiClient } from './client';

export const parentApi = {
  getChildren: async () => {
    const { data } = await apiClient.get('/parent/children');
    return data;
  },

  getChild: async (id: string) => {
    const { data } = await apiClient.get(`/parent/child/${id}`);
    return data;
  },

  getChildAttendance: async (id: string) => {
    const { data } = await apiClient.get(`/parent/child/${id}/attendance`);
    return data;
  },

  getChildGrades: async (id: string) => {
    const { data } = await apiClient.get(`/parent/child/${id}/grades`);
    return data;
  },

  getChildSchedule: async (id: string) => {
    const { data } = await apiClient.get(`/parent/child/${id}/schedule`);
    return data;
  },

  getChildPayments: async (id: string) => {
    const { data } = await apiClient.get(`/parent/child/${id}/payments`);
    return data;
  },

  requestChildLeave: async (
    studentId: string,
    payload: { startDate: string; endDate: string; reason: string },
  ) => {
    const { data } = await apiClient.post(`/parent/child/${studentId}/leave-request`, payload);
    return data;
  },

  getChildLeaveRequests: async (studentId: string) => {
    const { data } = await apiClient.get(`/parent/child/${studentId}/leave-requests`);
    return data;
  },

  getChildCoins: async (studentId: string) => {
    const { data } = await apiClient.get(`/parent/child/${studentId}/coins`);
    return data as { balance: number; rank: number; total: number; history: any[] };
  },
};
