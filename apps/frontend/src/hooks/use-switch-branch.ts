/**
 * useSwitchBranch — director/admin uchun filial almashtirish hook.
 *
 * Nima qiladi:
 *  1. POST /auth/switch-branch → yangi JWT tokenlar oladi
 *  2. useAuthStore.setAuth() chaqirib tokenlarni saqlaydi (activeBranchId yangilanadi)
 *  3. useBranchStore.setActiveBranch() UI meta-datani yangilaydi
 *  4. Branch-specific query keys invalidate qiladi (queryClient.clear() emas —
 *     auth/settings/fee-structures kabi global ma'lumotlar saqlanib qoladi)
 *
 * Ishlatish:
 *   const { switchBranch, isSwitching } = useSwitchBranch();
 *   await switchBranch('branch-id');      // yoki
 *   await switchBranch(null);              // school-wide view
 */
'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore, type BranchMeta } from '@/store/branch.store';
import { toast } from '@/components/ui/use-toast';

export function useSwitchBranch() {
  const queryClient = useQueryClient();
  const { user, setAuth } = useAuthStore();
  const { setActiveBranch, setIsSwitching, isSwitching } = useBranchStore();

  const switchBranch = useCallback(
    async (branchId: string | null, branchMeta?: BranchMeta | null) => {
      if (isSwitching) return;

      try {
        setIsSwitching(true);

        // Backend dan yangi tokenlar olish
        const tokens = await authApi.switchBranch(branchId);

        // Auth store yangilash (activeBranchId ham yangilanadi)
        if (user) {
          setAuth(
            { ...user, branchId },
            tokens,
          );
        }

        // UI branch meta-datani yangilash
        setActiveBranch(branchId, branchMeta ?? null);

        // Branch-specific data invalidate (global cache emas — auth/settings kabi
        // branch-ga bog'liq bo'lmagan ma'lumotlar saqlanib qoladi)
        const branchKeys = [
          'classes', 'schedule', 'attendance', 'grades',
          'payments', 'users', 'subjects', 'class-students',
          'students-for-payment-create',
          'reports', 'analytics',
        ];
        await Promise.all(
          branchKeys.map(key => queryClient.invalidateQueries({ queryKey: [key] })),
        );

        toast({
          title: branchId
            ? `Filial almashtirildi: ${branchMeta?.name ?? branchId}`
            : 'Barcha filiallar ko\'rinishi',
          description: 'Ma\'lumotlar yangilanmoqda...',
        });

      } catch (error: any) {
        const message = error?.response?.data?.message ?? 'Filial almashtirishda xatolik';
        toast({
          variant: 'destructive',
          title: 'Xatolik',
          description: message,
        });
        throw error;
      } finally {
        setIsSwitching(false);
      }
    },
    [isSwitching, user, setAuth, setActiveBranch, setIsSwitching, queryClient],
  );

  return { switchBranch, isSwitching };
}
