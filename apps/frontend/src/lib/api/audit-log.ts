import { apiClient } from './client';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export';

export interface AuditLog {
  id: string;
  userId?: string;
  schoolId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  school?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface AuditLogMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogResponse {
  data: AuditLog[];
  meta: AuditLogMeta;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entity?: string;
  action?: AuditAction;
  userId?: string;
  from?: string;
  to?: string;
}

export const auditLogApi = {
  /** Maktab bo'yicha audit loglar (school_admin, vice_principal) */
  getSchoolLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogResponse> => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
    );
    const { data } = await apiClient.get('/audit-logs', { params });
    return data;
  },

  /** Super admin — barcha maktablar */
  getAllLogs: async (filters: AuditLogFilters & { schoolId?: string } = {}): Promise<AuditLogResponse> => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''),
    );
    const { data } = await apiClient.get('/audit-logs/all', { params });
    return data;
  },

  /** Excel export — download */
  exportLogs: (filters: Omit<AuditLogFilters, 'page' | 'limit'> = {}) => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')) as any,
    );
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace(/\/api\/v1$/, '');
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('accessToken') ?? ''
      : '';
    const link = document.createElement('a');
    link.href = `${baseUrl}/api/v1/audit-logs/export?${params.toString()}`;
    // Token header bilan download uchun axios ishlatamiz
    import('@/lib/api/client').then(({ apiClient: ac }) => {
      ac.get(`/audit-logs/export?${params.toString()}`, { responseType: 'blob' }).then(res => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_log_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    });
  },
};
