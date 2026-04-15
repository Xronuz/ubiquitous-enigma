import { apiClient } from './client';

export const subjectsApi = {
  /** Barcha fanlar — admin/vice_principal */
  getAll: (classId?: string) =>
    apiClient.get('/subjects', { params: classId ? { classId } : undefined }).then(r => r.data),

  /** Faqat menga biriktirilgan fanlar — teacher/class_teacher */
  getMine: () =>
    apiClient.get('/subjects/mine').then(r => r.data),

  create: (payload: { name: string; classId?: string; teacherId?: string; code?: string }) =>
    apiClient.post('/subjects', payload).then(r => r.data),

  update: (id: string, payload: Partial<{ name: string; classId: string; teacherId: string; code: string }>) =>
    apiClient.put(`/subjects/${id}`, payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/subjects/${id}`).then(r => r.data),
};
