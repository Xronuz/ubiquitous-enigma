import { apiClient } from './client';

export type DisciplineType = 'behavior' | 'absence' | 'academic' | 'dress_code' | 'other';
export type DisciplineSeverity = 'low' | 'medium' | 'high';
export type DisciplineAction = 'warning' | 'detention' | 'parent_call' | 'parent_meeting' | 'suspension' | 'other';

export interface DisciplineIncident {
  id: string;
  studentId: string;
  student: { id: string; firstName: string; lastName: string; class?: { name: string } };
  reportedById: string;
  reportedBy: { id: string; firstName: string; lastName: string };
  type: DisciplineType;
  severity: DisciplineSeverity;
  action: DisciplineAction;
  description: string;
  date: string;
  resolved: boolean;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}

export const disciplineApi = {
  getAll: async (params?: { studentId?: string; classId?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const { data } = await apiClient.get('/discipline', { params });
    return data as { data: DisciplineIncident[]; meta: { total: number; page: number; totalPages: number } };
  },

  create: async (payload: {
    studentId: string;
    type: DisciplineType;
    severity: DisciplineSeverity;
    action: DisciplineAction;
    description: string;
    date: string;
    notes?: string;
  }) => {
    const { data } = await apiClient.post('/discipline', payload);
    return data as DisciplineIncident;
  },

  resolve: async (id: string, notes?: string) => {
    const { data } = await apiClient.patch(`/discipline/${id}/resolve`, { notes });
    return data as DisciplineIncident;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/discipline/${id}`);
    return data;
  },

  getStudentHistory: async (studentId: string) => {
    const { data } = await apiClient.get(`/discipline/student/${studentId}`);
    return data as DisciplineIncident[];
  },
};
