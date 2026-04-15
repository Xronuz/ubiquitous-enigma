import { apiClient } from './client';

export type ClubCategory = 'sport' | 'art' | 'science' | 'music' | 'tech' | 'language' | 'other';

export interface CreateClubPayload {
  name: string;
  description?: string;
  category: ClubCategory;
  leaderId: string;
  schedule?: string;
  maxMembers?: number;
}

export const clubsApi = {
  getAll: (category?: string) =>
    apiClient.get('/clubs', { params: category ? { category } : undefined }).then(r => r.data),

  getMine: () =>
    apiClient.get('/clubs/my-clubs').then(r => r.data),

  getLed: () =>
    apiClient.get('/clubs/led').then(r => r.data),

  getOne: (id: string) =>
    apiClient.get(`/clubs/${id}`).then(r => r.data),

  create: (payload: CreateClubPayload) =>
    apiClient.post('/clubs', payload).then(r => r.data),

  update: (id: string, payload: Partial<CreateClubPayload> & { isActive?: boolean }) =>
    apiClient.put(`/clubs/${id}`, payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/clubs/${id}`).then(r => r.data),

  join: (id: string) =>
    apiClient.post(`/clubs/${id}/join`, {}).then(r => r.data),

  leave: (id: string) =>
    apiClient.delete(`/clubs/${id}/leave`).then(r => r.data),

  getMembers: (id: string) =>
    apiClient.get(`/clubs/${id}/members`).then(r => r.data),

  removeMember: (clubId: string, studentId: string) =>
    apiClient.delete(`/clubs/${clubId}/members/${studentId}`).then(r => r.data),
};
