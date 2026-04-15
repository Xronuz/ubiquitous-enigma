import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from '@/components/ui/use-toast';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000, // 30 soniya — hang qolmaslik uchun
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach access token from localStorage
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// Auto-unwrap TransformInterceptor envelope: { success, data, timestamp, path }
// Backend barcha javoblarni shu formatga o'raydi; frontend faqat `data` ni ishlaydi.
apiClient.interceptors.response.use(
  (res) => {
    if (
      res.data &&
      typeof res.data === 'object' &&
      res.data.success === true &&
      'data' in res.data
    ) {
      res.data = res.data.data;
    }
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;

      if (!refreshToken) {
        isRefreshing = false;
        if (typeof window !== 'undefined') {
          localStorage.clear();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const { data: raw } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        // Unwrap TransformInterceptor envelope if present
        const data = (raw && raw.success === true && 'data' in raw) ? raw.data : raw;
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Global error toasts (after 401 handling) ──────────────────────────────
    const status = error.response?.status;

    if (typeof window !== 'undefined') {
      if (status === 403) {
        toast({
          variant: 'destructive',
          title: 'Ruxsat yo\'q',
          description: 'Bu amalni bajarish uchun sizda yetarli huquq yo\'q.',
        });
      } else if (status === 404) {
        // 404 is usually handled locally — skip global toast
      } else if (status && status >= 500) {
        toast({
          variant: 'destructive',
          title: 'Server xatosi',
          description: `Serverda xatolik yuz berdi (${status}). Iltimos, qayta urinib ko'ring.`,
        });
      } else if (!status) {
        // Network error (no response)
        toast({
          variant: 'destructive',
          title: 'Tarmoq xatosi',
          description: 'Serverga ulanib bo\'lmadi. Internet aloqangizni tekshiring.',
        });
      }
    }

    return Promise.reject(error);
  },
);
