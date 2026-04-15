import { apiClient } from './client';

export interface SystemConfigMap {
  bhm: number;
  academic_year: string;
  school_name: string;
  school_phone: string;
  school_address: string;
  pass_threshold: number;
  work_days: number;
}

export const systemConfigApi = {
  getAll: (): Promise<SystemConfigMap> =>
    apiClient.get('/system-config').then(r => r.data),

  update: (payload: Partial<SystemConfigMap>): Promise<SystemConfigMap> =>
    apiClient.patch('/system-config', payload).then(r => r.data),
};
