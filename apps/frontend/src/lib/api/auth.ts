import { apiClient } from './client';
import type { TokenPair } from '@eduplatform/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    schoolId: string | null;
    branchId: string | null;
  };
  tokens: TokenPair;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  logout: async () => {
    // Cookie-based: backend reads refresh_token from cookie
    await apiClient.post('/auth/logout');
  },

  me: async () => {
    const { data } = await apiClient.get<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      schoolId: string | null;
    }>('/users/me');
    return data;
  },

  refresh: async (): Promise<TokenPair> => {
    // Cookie-based: backend reads refresh_token from cookie
    const { data } = await apiClient.post<TokenPair>('/auth/refresh');
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token: string, password: string) => {
    const { data } = await apiClient.post('/auth/reset-password', { token, password });
    return data;
  },

  /**
   * Director/admin aktiv filialga switch qiladi.
   * Yangi JWT tokenlar qaytariladi — auth store yangilanishi kerak.
   * @param branchId - Filial IDsi. null = barcha filiallar (school-wide).
   */
  switchBranch: async (branchId: string | null): Promise<TokenPair> => {
    const { data } = await apiClient.post<TokenPair>('/auth/switch-branch', { branchId });
    return data;
  },
};
