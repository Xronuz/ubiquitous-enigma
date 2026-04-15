import { apiClient } from './client';
import type { AttendanceStatus } from '@eduplatform/types';

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  note?: string;
}

export const attendanceApi = {
  mark: async (payload: {
    classId: string;
    scheduleId?: string;
    date: string;
    entries: AttendanceEntry[];
  }) => {
    const { data } = await apiClient.post('/attendance/mark', payload);
    return data;
  },

  getReport: async (params?: { classId?: string; startDate?: string; endDate?: string }) => {
    const { data } = await apiClient.get('/attendance/report', { params });
    return data;
  },

  getStudentHistory: async (studentId: string, limit = 30) => {
    const { data } = await apiClient.get(`/attendance/student/${studentId}/history`, {
      params: { limit },
    });
    return data;
  },

  getTodaySummary: async () => {
    const { data } = await apiClient.get('/attendance/today/summary');
    return data as {
      present: number; absent: number; late: number; excused: number;
      marked: number; totalStudents: number; presentPct: number;
    };
  },
};
