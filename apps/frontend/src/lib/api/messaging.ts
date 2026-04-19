import { apiClient } from './client';

export const messagingApi = {
  getConversations: () =>
    apiClient.get('/messaging/conversations').then(r => r.data),

  getMessages: (userId: string, page = 1) =>
    apiClient.get(`/messaging/${userId}`, { params: { page, limit: 30 } }).then(r => r.data),

  sendMessage: (receiverId: string, content: string) =>
    apiClient.post('/messaging', { receiverId, content }).then(r => r.data),

  markAsRead: (userId: string) =>
    apiClient.put(`/messaging/${userId}/read`).then(r => r.data),

  getUnreadCount: () =>
    apiClient.get('/messaging/unread-count').then(r => r.data),

  deleteMessage: (id: string) =>
    apiClient.delete(`/messaging/message/${id}`).then(r => r.data),

  deleteConversation: (userId: string) =>
    apiClient.delete(`/messaging/${userId}/conversation`).then(r => r.data),

  // ── Group chat ────────────────────────────────────────────────────────────
  createGroup: (dto: { name: string; description?: string; participantIds: string[] }) =>
    apiClient.post('/messaging/groups', dto).then(r => r.data),

  getGroups: () =>
    apiClient.get('/messaging/groups/list').then(r => r.data),

  getGroupMessages: (groupId: string, page = 1) =>
    apiClient.get(`/messaging/groups/${groupId}/messages`, { params: { page } }).then(r => r.data),

  sendGroupMessage: (groupId: string, content: string) =>
    apiClient.post(`/messaging/groups/${groupId}/messages`, { content }).then(r => r.data),

  addParticipant: (groupId: string, userId: string) =>
    apiClient.post(`/messaging/groups/${groupId}/participants`, { userId }).then(r => r.data),

  leaveGroup: (groupId: string) =>
    apiClient.delete(`/messaging/groups/${groupId}/leave`).then(r => r.data),
};
