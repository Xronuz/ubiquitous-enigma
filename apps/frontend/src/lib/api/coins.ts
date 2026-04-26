import { apiClient } from './client';

export type CoinTransactionType = 'earn' | 'deduct';

export interface CoinTransaction {
  id: string;
  userId: string;
  schoolId: string;
  amount: number;
  type: CoinTransactionType;
  reason: string;
  balance: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

export interface ShopItem {
  id: string;
  schoolId: string;
  name: string;
  description?: string;
  cost: number;
  emoji?: string;
  stock?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentBalance {
  id: string;
  firstName: string;
  lastName: string;
  coins: number;
}

export interface CreateShopItemPayload {
  name: string;
  description?: string;
  cost: number;
  emoji?: string;
  stock?: number | null;
}

export const coinsApi = {
  // Student
  getBalance: () =>
    apiClient.get('/coins/balance').then(r => r.data as { coins: number }),

  getHistory: (limit = 20) =>
    apiClient.get('/coins/history', { params: { limit } }).then(r => r.data as CoinTransaction[]),

  getShopItems: () =>
    apiClient.get('/coins/shop').then(r => r.data as ShopItem[]),

  spend: (itemId: string) =>
    apiClient.post('/coins/spend', { itemId }).then(r => r.data),

  // Admin: award / deduct
  award: (studentId: string, amount: number) =>
    apiClient.post('/coins/award', { studentId, amount }).then(r => r.data),

  getStudentBalances: () =>
    apiClient.get('/coins/admin/balances').then(r => r.data as StudentBalance[]),

  getShopOrders: () =>
    apiClient.get('/coins/admin/orders').then(r => r.data as CoinTransaction[]),

  // Admin: shop management
  getAllShopItems: () =>
    apiClient.get('/coins/admin/shop').then(r => r.data as ShopItem[]),

  createShopItem: (payload: CreateShopItemPayload) =>
    apiClient.post('/coins/admin/shop', payload).then(r => r.data as ShopItem),

  updateShopItem: (id: string, payload: Partial<CreateShopItemPayload> & { isActive?: boolean }) =>
    apiClient.patch(`/coins/admin/shop/${id}`, payload).then(r => r.data as ShopItem),

  deleteShopItem: (id: string) =>
    apiClient.delete(`/coins/admin/shop/${id}`).then(r => r.data),
};
