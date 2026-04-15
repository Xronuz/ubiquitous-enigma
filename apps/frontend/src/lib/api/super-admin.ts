import { apiClient } from './client';

export const superAdminApi = {
  getStats: async () => {
    const { data } = await apiClient.get('/super-admin/stats');
    return data;
  },

  getSchools: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get('/super-admin/schools', { params });
    return data;
  },

  getSchool: async (id: string) => {
    const { data } = await apiClient.get(`/super-admin/schools/${id}`);
    return data;
  },

  createSchool: async (payload: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    email?: string;
    subscriptionTier?: string;
  }) => {
    const { data } = await apiClient.post('/super-admin/schools', payload);
    return data;
  },

  updateSchool: async (id: string, payload: object) => {
    const { data } = await apiClient.put(`/super-admin/schools/${id}`, payload);
    return data;
  },

  getModules: async (schoolId: string) => {
    const { data } = await apiClient.get(`/super-admin/schools/${schoolId}/modules`);
    return data;
  },

  toggleModule: async (schoolId: string, moduleName: string, isEnabled: boolean) => {
    const { data } = await apiClient.post(`/super-admin/schools/${schoolId}/modules/toggle`, {
      moduleName,
      isEnabled,
    });
    return data;
  },
};
