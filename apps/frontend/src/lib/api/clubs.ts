import { apiClient } from './client';

export type ClubCategory = 'sport' | 'art' | 'science' | 'music' | 'tech' | 'language' | 'other';
export type ClubRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreateClubPayload {
  name: string;
  description?: string;
  category: ClubCategory;
  leaderId: string;
  schedule?: string;
  scheduleDays?: string[];
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  maxMembers?: number;
}

export interface ClubJoinRequest {
  id: string;
  clubId: string;
  studentId: string;
  status: ClubRequestStatus;
  message?: string;
  createdAt: string;
  student?: { id: string; firstName: string; lastName: string; avatarUrl?: string; email: string };
  club?: any;
}

export const clubsApi = {
  getAll: (category?: string) =>
    apiClient.get('/clubs', { params: category ? { category } : undefined }).then(r => r.data),

  getMine: () =>
    apiClient.get('/clubs/my-clubs').then(r => r.data),

  getMyRequests: () =>
    apiClient.get('/clubs/my-requests').then(r => r.data),

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

  /** Sends a join REQUEST (PENDING) — does NOT immediately join */
  requestJoin: (id: string, message?: string) =>
    apiClient.post(`/clubs/${id}/join`, { message }).then(r => r.data),

  leave: (id: string) =>
    apiClient.delete(`/clubs/${id}/leave`).then(r => r.data),

  getJoinRequests: (clubId: string, status?: ClubRequestStatus) =>
    apiClient.get(`/clubs/${clubId}/requests`, { params: status ? { status } : undefined }).then(r => r.data),

  approveRequest: (clubId: string, requestId: string) =>
    apiClient.patch(`/clubs/${clubId}/requests/${requestId}/approve`).then(r => r.data),

  rejectRequest: (clubId: string, requestId: string) =>
    apiClient.patch(`/clubs/${clubId}/requests/${requestId}/reject`).then(r => r.data),

  getMembers: (id: string) =>
    apiClient.get(`/clubs/${id}/members`).then(r => r.data),

  removeMember: (clubId: string, studentId: string) =>
    apiClient.delete(`/clubs/${clubId}/members/${studentId}`).then(r => r.data),
};
