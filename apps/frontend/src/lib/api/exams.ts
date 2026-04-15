import { apiClient } from './client';

export const examsApi = {
  getAll: (params?: { classId?: string; subjectId?: string }) =>
    apiClient.get('/exams', { params }).then(r => r.data),

  getOne: (id: string) =>
    apiClient.get(`/exams/${id}`).then(r => r.data),

  create: (payload: { classId: string; subjectId: string; title: string; frequency: string; maxScore: number; scheduledAt: string; duration?: number }) =>
    apiClient.post('/exams', payload).then(r => r.data),

  update: (id: string, payload: Partial<{ title: string; frequency: string; maxScore: number; scheduledAt: string; duration: number }>) =>
    apiClient.put(`/exams/${id}`, payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/exams/${id}`).then(r => r.data),

  publish: (id: string) =>
    apiClient.put(`/exams/${id}/publish`).then(r => r.data),

  getResults: (id: string) =>
    apiClient.get(`/exams/${id}/results`).then(r => r.data),

  getUpcoming: (days = 7) =>
    apiClient.get('/exams/upcoming', { params: { days } }).then(r => r.data),

  bulkCreate: (payload: {
    title: string;
    frequency: string;
    scheduledAt: string;
    maxScore: number;
    duration?: number;
    classIds: string[];
    subjectIds: string[];
  }) =>
    apiClient.post('/exams/bulk', payload).then(r => r.data),

  submitBulkResults: (id: string, results: { studentId: string; score: number; comment?: string }[]) =>
    apiClient.post(`/exams/${id}/results/bulk`, { results }).then(r => r.data),
};
