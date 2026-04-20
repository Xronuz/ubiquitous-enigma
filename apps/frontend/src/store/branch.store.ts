/**
 * Branch Store — director/admin tomonidan aktiv filial tanlovi.
 *
 * Qoidalar:
 *  - activeBranchId = null   → barcha filiallar (school-wide view)
 *  - activeBranchId = "xxx"  → faqat shu filial ko'rinadi
 *
 * Auth store bilan sinxronizatsiya:
 *  - Login bo'lganda useAuthStore.setAuth() activeBranchId ni user.branchId ga set qiladi.
 *  - Foydalanuvchi branch almashtirganda:
 *    1. POST /auth/switch-branch  → yangi JWT tokenlar qaytariladi
 *    2. useAuthStore.setAuth() yangi tokenlar bilan chaqiriladi
 *    3. useBranchStore.setActiveBranch() UI meta-data ni yangilaydi
 *
 * x-branch-id header:
 *  - apiClient (client.ts) useAuthStore.getState().activeBranchId ni o'qiydi.
 *  - Shuning uchun token almashtirish asosiy mexanizm; bu store faqat UI uchun.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BranchMeta {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  isActive: boolean;
}

interface BranchState {
  /** Hozirda tanlangan filial (null = barcha) */
  activeBranchId: string | null;
  /** Tanlangan filialning UI meta-ma'lumotlari (nomi ko'rsatish uchun) */
  activeBranchMeta: BranchMeta | null;
  /** Maktabdagi barcha filiallar ro'yxati (director sidebar uchun) */
  branches: BranchMeta[];
  /** Filial almashtirilmoqda (loading holati) */
  isSwitching: boolean;

  /** Aktiv filialni o'rnatish */
  setActiveBranch: (branchId: string | null, meta?: BranchMeta | null) => void;
  /** Maktab filiallari ro'yxatini yangilash */
  setBranches: (branches: BranchMeta[]) => void;
  /** Switching loader */
  setIsSwitching: (value: boolean) => void;
  /** Logout va school o'zgarishda reset */
  reset: () => void;
}

const initialState = {
  activeBranchId: null,
  activeBranchMeta: null,
  branches: [],
  isSwitching: false,
};

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveBranch: (branchId, meta = null) => {
        // meta berilmasa, branches ro'yxatidan topamiz
        const found = meta ?? (branchId
          ? get().branches.find((b) => b.id === branchId) ?? null
          : null);
        set({ activeBranchId: branchId, activeBranchMeta: found });
      },

      setBranches: (branches) => set({ branches }),

      setIsSwitching: (value) => set({ isSwitching: value }),

      reset: () => set(initialState),
    }),
    {
      name: 'branch-storage',
      partialize: (state) => ({
        activeBranchId: state.activeBranchId,
        activeBranchMeta: state.activeBranchMeta,
        branches: state.branches,
      }),
    },
  ),
);
