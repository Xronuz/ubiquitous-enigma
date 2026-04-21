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

  /** O'qituvchining barcha filiallardagi darslarini olish (greyed-out UI uchun) */
  getTeacherCrossBranch: async (teacherId: string, viewerBranchId?: string) => {
    const { data } = await apiClient.get(`/schedule/teacher/${teacherId}/cross-branch`, {
      params: { viewerBranchId },
    });
    return data;
  },

  create: async (payload: {
    classId: string;
    subjectId: string;
    teacherId?: string;
    roomNumber?: string;
    roomId?: string;
    dayOfWeek: DayOfWeek;
    timeSlot: number;
    startTime: string;
    endTime: string;
  }) => {
    const { data } = await apiClient.post('/schedule', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{
    roomNumber: string;
    roomId: string;
    startTime: string;
    endTime: string;
    dayOfWeek: DayOfWeek;
    timeSlot: number;
  }>) => {
    const { data } = await apiClient.put(`/schedule/${id}`, payload);
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
    roomId?: string;
    classId?: string;
    excludeId?: string;
    branchId?: string;
  }): Promise<{ hasConflict: boolean; conflicts: { type: string; message: string }[] }> => {
    const { data } = await apiClient.get('/schedule/check-conflict', { params });
    return data;
  },
};
