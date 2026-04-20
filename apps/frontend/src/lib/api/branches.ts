import { apiClient } from './client';

export interface Branch {
  id: string;
  schoolId: string;
  name: string;
  code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchDto {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export const branchesApi = {
  /** Maktab filiallarini olish (director/school_admin uchun) */
  getAll: async (): Promise<Branch[]> => {
    const { data } = await apiClient.get<Branch[]>('/branches');
    return data;
  },

  getOne: async (id: string): Promise<Branch> => {
    const { data } = await apiClient.get<Branch>(`/branches/${id}`);
    return data;
  },

  create: async (dto: CreateBranchDto): Promise<Branch> => {
    const { data } = await apiClient.post<Branch>('/branches', dto);
    return data;
  },

  update: async (id: string, dto: Partial<CreateBranchDto>): Promise<Branch> => {
    const { data } = await apiClient.put<Branch>(`/branches/${id}`, dto);
    return data;
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete<{ message: string }>(`/branches/${id}`);
    return data;
  },
};
