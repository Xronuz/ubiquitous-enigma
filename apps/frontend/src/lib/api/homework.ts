import { apiClient } from './client';

export const homeworkApi = {
  getAll: (params?: { classId?: string; subjectId?: string }) =>
    apiClient.get('/homework', { params }).then(r => r.data),

  getOne: (id: string) =>
    apiClient.get(`/homework/${id}`).then(r => r.data),

  create: (payload: { classId: string; subjectId: string; title: string; description?: string; dueDate: string }) =>
    apiClient.post('/homework', payload).then(r => r.data),

  update: (id: string, payload: Partial<{ title: string; description: string; dueDate: string }>) =>
    apiClient.put(`/homework/${id}`, payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/homework/${id}`).then(r => r.data),

  submit: (id: string, payload: { content: string; fileUrl?: string }) =>
    apiClient.post(`/homework/${id}/submit`, payload).then(r => r.data),

  grade: (homeworkId: string, submissionId: string, score: number) =>
    apiClient.put(`/homework/${homeworkId}/submissions/${submissionId}/grade`, { score }).then(r => r.data),

  getMySubmission: (id: string) =>
    apiClient.get(`/homework/${id}/my-submission`).then(r => r.data),
};
