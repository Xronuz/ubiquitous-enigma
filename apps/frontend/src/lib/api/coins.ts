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
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  description: string;
}

export const coinsApi = {
  getBalance: () =>
    apiClient.get('/coins/balance').then(r => r.data as { coins: number }),

  getHistory: (limit = 20) =>
    apiClient.get('/coins/history', { params: { limit } }).then(r => r.data as CoinTransaction[]),

  getShopItems: () =>
    apiClient.get('/coins/shop').then(r => r.data as ShopItem[]),

  spend: (itemId: string) =>
    apiClient.post('/coins/spend', { itemId }).then(r => r.data),

  /** Admin: award or deduct coins for a student (negative amount = deduct) */
  award: (studentId: string, amount: number) =>
    apiClient.post('/coins/award', { studentId, amount }).then(r => r.data),
};
