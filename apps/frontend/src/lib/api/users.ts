import { apiClient } from './client';
import type { UserDetail, PaginatedResponse } from '@eduplatform/types';

export const usersApi = {
  getMe: async (): Promise<UserDetail> => {
    const { data } = await apiClient.get<UserDetail>('/users/me');
    return data;
  },

  getAll: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const { data } = await apiClient.get<PaginatedResponse<UserDetail>>('/users', { params });
    return data;
  },

  getOne: async (id: string): Promise<UserDetail> => {
    const { data } = await apiClient.get<UserDetail>(`/users/${id}`);
    return data;
  },

  create: async (payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    schoolId?: string;
  }) => {
    const { data } = await apiClient.post('/users', payload);
    return data;
  },

  update: async (id: string, payload: Partial<{ firstName: string; lastName: string; phone: string; avatarUrl: string }>) => {
    const { data } = await apiClient.put(`/users/${id}`, payload);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },

  restore: async (id: string) => {
    const { data } = await apiClient.put(`/users/${id}/restore`);
    return data;
  },

  changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
    const { data } = await apiClient.put('/users/me/password', payload);
    return data;
  },

  linkParentStudent: async (parentId: string, studentId: string) => {
    const { data } = await apiClient.post(`/users/${parentId}/link-student/${studentId}`);
    return data;
  },

  updateAvatar: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.put('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  importCsv: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/users/import/csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { created: number; skipped: number; errors: string[] };
  },
};
