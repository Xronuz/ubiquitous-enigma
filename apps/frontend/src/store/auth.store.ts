import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TokenPair } from '@eduplatform/types';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  schoolId: string | null;
  branchId: string | null;  // JWT dan kelgan, foydalanuvchi tegishli filial
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  /**
   * activeBranchId — director/admin tomonidan tanlangan "aktiv filial"
   * (user.branchId dan farqli: bu foydalanuvchining o'zi tanlagan ko'rinish filtri).
   * NULL = barcha filiallarni ko'rish (school-wide view).
   */
  activeBranchId: string | null;

  setAuth: (user: AuthUser, tokens: TokenPair) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
  /** Director/admin uchun aktiv filialga switch qilish */
  switchBranch: (branchId: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      activeBranchId: null,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setAuth: (user, tokens) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', tokens.accessToken);
          localStorage.setItem('refreshToken', tokens.refreshToken);
        }
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          // Login bo'lganda activeBranchId ni user.branchId ga set qil
          activeBranchId: user.branchId ?? null,
        });
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          activeBranchId: null,
        });
      },

      switchBranch: (branchId) => set({ activeBranchId: branchId }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        activeBranchId: state.activeBranchId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
