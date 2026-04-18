import { apiClient } from './client';
import type { GradeType } from '@eduplatform/types';

export const gradesApi = {
  /** Role-scoped list: admin→all, teacher→own subjects, student→own grades */
  findAll: async (params?: {
    classId?: string;
    subjectId?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await apiClient.get('/grades', { params });
    return data as {
      data: Array<{
        id: string; score: number; maxScore: number; type: string; date: string;
        student: { id: string; firstName: string; lastName: string };
        subject: { id: string; name: string };
      }>;
      meta: { total: number; page: number; limit: number; totalPages: number };
    };
  },

  create: async (payload: {
    studentId: string;
    classId: string;
    subjectId: string;
    type: GradeType;
    score: number;
    maxScore?: number;
    date: string;
    comment?: string;
  }) => {
    const { data } = await apiClient.post('/grades', payload);
    return data;
  },

  getStudentGrades: async (studentId: string, subjectId?: string) => {
    const { data } = await apiClient.get(`/grades/student/${studentId}`, {
      params: { subjectId },
    });
    return data;
  },

  getClassReport: async (classId: string, subjectId?: string, page?: number, limit?: number) => {
    const { data } = await apiClient.get(`/grades/class/${classId}/report`, {
      params: { subjectId, page, limit },
    });
    return data;
  },

  update: async (id: string, payload: Partial<{ score: number; comment: string }>) => {
    const { data } = await apiClient.patch(`/grades/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/grades/${id}`);
    return data;
  },

  getStudentGpa: async (studentId: string) => {
    const { data } = await apiClient.get(`/grades/student/${studentId}/gpa`);
    return data as { studentId: string; gpa: number; gradeCount: number };
  },

  getClassGpa: async (classId: string) => {
    const { data } = await apiClient.get(`/grades/class/${classId}/gpa`);
    return data as { students: { studentId: string; name: string; gpa: number; gradeCount: number }[]; classAvg: number };
  },

  bulkCreate: async (payload: {
    classId: string;
    subjectId: string;
    type: GradeType;
    date: string;
    maxScore: number;
    items: { studentId: string; score: number; comment?: string }[];
  }) => {
    const { data } = await apiClient.post('/grades/bulk', payload);
    return data as { saved: number };
  },
};
