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
  };
  tokens: TokenPair;
}

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  logout: async (refreshToken: string) => {
    await apiClient.post('/auth/logout', { refreshToken });
  },

  refresh: async (refreshToken: string): Promise<TokenPair> => {
    const { data } = await apiClient.post<TokenPair>('/auth/refresh', { refreshToken });
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
};
