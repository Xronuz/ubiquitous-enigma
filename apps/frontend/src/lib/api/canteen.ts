import { apiClient } from './client';

export interface MenuItem {
  name: string;
  description?: string;
  calories?: number;
}

export interface MenuDay {
  id: string;
  date: string;
  mealType: string;
  itemsJson: MenuItem[];
  price?: number;
  createdAt: string;
}

export const canteenApi = {
  /** Admin CRUD list — paginated, filterable by date range */
  findAll: (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: MenuDay[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      '/canteen', { params },
    ).then(r => r.data),

  getWeekMenu: (params?: { from?: string; to?: string }) =>
    apiClient.get<MenuDay[]>('/canteen/week', { params }).then(r => r.data),

  getTodayMenu: () =>
    apiClient.get<MenuDay[]>('/canteen/today').then(r => r.data),

  getDayMenu: (date: string) =>
    apiClient.get<MenuDay[]>(`/canteen/day/${date}`).then(r => r.data),

  upsert: (payload: {
    date: string;
    mealType: string;
    price?: number;
    itemsJson: MenuItem[];
  }) =>
    apiClient.post<MenuDay>('/canteen', payload).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/canteen/${id}`).then(r => r.data),
};
