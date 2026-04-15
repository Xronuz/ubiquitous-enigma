import { apiClient } from './client';

export const classesApi = {
  getAll: async () => {
    const { data } = await apiClient.get('/classes');
    return data;
  },

  getOne: async (id: string) => {
    const { data } = await apiClient.get(`/classes/${id}`);
    return data;
  },

  create: async (payload: { name: string; gradeLevel?: number; academicYear: string; classTeacherId?: string }) => {
    const { data } = await apiClient.post('/classes', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{ name: string; gradeLevel: number; classTeacherId: string }>) => {
    const { data } = await apiClient.patch(`/classes/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/classes/${id}`);
    return data;
  },

  addStudent: async (classId: string, studentId: string) => {
    const { data } = await apiClient.post(`/classes/${classId}/students/${studentId}`);
    return data;
  },

  removeStudent: async (classId: string, studentId: string) => {
    const { data } = await apiClient.delete(`/classes/${classId}/students/${studentId}`);
    return data;
  },

  getStudents: async (classId: string) => {
    const { data } = await apiClient.get(`/classes/${classId}/students`);
    return data;
  },

  getMyClass: async () => {
    const { data } = await apiClient.get('/classes/my-class');
    return data;
  },
};
