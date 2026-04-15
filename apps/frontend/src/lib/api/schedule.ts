import { apiClient } from './client';
import type { DayOfWeek } from '@eduplatform/types';

export const scheduleApi = {
  getToday: async () => {
    const { data } = await apiClient.get('/schedule/today');
    return data;
  },

  getWeek: async (classId?: string) => {
    const { data } = await apiClient.get('/schedule/week', { params: { classId } });
    return data;
  },

  getByClass: async (classId: string) => {
    const { data } = await apiClient.get(`/schedule/class/${classId}`);
    return data;
  },

  create: async (payload: {
    classId: string;
    subjectId: string;
    teacherId?: string;
    roomNumber?: string;
    dayOfWeek: DayOfWeek;
    timeSlot: number;
    startTime: string;
    endTime: string;
  }) => {
    const { data } = await apiClient.post('/schedule', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{ roomNumber: string; startTime: string; endTime: string }>) => {
    const { data } = await apiClient.patch(`/schedule/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/schedule/${id}`);
    return data;
  },

  checkConflict: async (params: {
    dayOfWeek: string;
    timeSlot: number;
    teacherId?: string;
    roomNumber?: string;
    classId?: string;
    excludeId?: string;
  }): Promise<{ hasConflict: boolean; conflicts: { type: string; message: string }[] }> => {
    const { data } = await apiClient.get('/schedule/check-conflict', { params });
    return data;
  },
};
