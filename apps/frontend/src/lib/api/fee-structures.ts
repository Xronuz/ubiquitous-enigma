import { apiClient } from './client';

export interface FeeStructure {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  frequency: string;
  gradeLevel?: number;
  academicYear: string;
  isActive: boolean;
  createdAt: string;
}

export const feeStructuresApi = {
  getAll: (academicYear?: string): Promise<FeeStructure[]> =>
    apiClient.get('/fee-structures', { params: academicYear ? { academicYear } : undefined }).then(r => r.data),

  getOne: (id: string): Promise<FeeStructure> =>
    apiClient.get(`/fee-structures/${id}`).then(r => r.data),

  create: (payload: {
    name: string;
    amount: number;
    academicYear: string;
    frequency?: string;
    gradeLevel?: number;
    description?: string;
    currency?: string;
  }): Promise<FeeStructure> =>
    apiClient.post('/fee-structures', payload).then(r => r.data),

  update: (id: string, payload: Partial<{
    name: string;
    amount: number;
    frequency: string;
    description: string;
    isActive: boolean;
  }>): Promise<FeeStructure> =>
    apiClient.put(`/fee-structures/${id}`, payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/fee-structures/${id}`).then(r => r.data),

  generatePayments: (id: string): Promise<{ created: number }> =>
    apiClient.post(`/fee-structures/${id}/generate-payments`).then(r => r.data),
};
