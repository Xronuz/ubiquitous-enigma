'use client';

/**
 * BranchSwitcher — director / branch_admin uchun
 * aktiv filialni tanlash dropdown komponenti.
 *
 * - Filialar ro'yxatini /branches dan yuklab useBranchStore.setBranches() ga saqlaydi.
 * - Tanlash: useSwitchBranch() → POST /auth/switch-branch → yangi JWT → cache clear.
 * - Faqat tegishli rollar uchun render qilinadi (boshqalarda null qaytaradi).
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronDown, Layers, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { useSwitchBranch } from '@/hooks/use-switch-branch';
import { branchesApi } from '@/lib/api/branches';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

/** Bu rollar uchun filial switcher ko'rsatiladi */
const SWITCHER_ROLES = new Set(['director', 'branch_admin']);

export function BranchSwitcher() {
  const user = useAuthStore((s) => s.user);
  const authBranchId = useAuthStore((s) => s.activeBranchId);
  const { activeBranchMeta, branches, setBranches } = useBranchStore();
  const { switchBranch, isSwitching } = useSwitchBranch();

  // Source of truth: auth.store (apiClient reads from here)
  const activeBranchId = authBranchId;

  // Faqat tegishli rollar uchun render
  if (!user || !SWITCHER_ROLES.has(user.role)) return null;

  // Filiallar ro'yxatini yuklash
  const { data: fetchedBranches, isLoading } = useQuery({
    queryKey: ['branches', user.schoolId],
    queryFn: () => branchesApi.getAll(),
    staleTime: 5 * 60 * 1000, // 5 daqiqa cache
    enabled: !!user.schoolId,
  });

  // Yuklangan filiallarni store ga saqlash
  useEffect(() => {
    if (fetchedBranches) {
      setBranches(
        fetchedBranches.map((b) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address,
          isActive: b.isActive,
        })),
      );
    }
  }, [fetchedBranches, setBranches]);

  // Hozirgi filial nomi
  const currentLabel = activeBranchId
    ? (activeBranchMeta?.name ?? branches.find((b) => b.id === activeBranchId)?.name ?? 'Filial')
    : 'Filial tanlanmagan';

  const activeBranches = branches.filter((b) => b.isActive);

  // branch_admin uchun: faqat bitta filiali bo'lsa — dropdown emas, oddiy badge
  const isBranchAdmin = user.role === 'branch_admin';
  if (isBranchAdmin && activeBranches.length <= 1) {
    return (
      <div className="hidden md:flex items-center gap-2 h-10 px-4 rounded-full bg-white dark:bg-slate-900 shadow-pill text-sm font-medium text-slate-700 dark:text-slate-200">
        <Building2 className="h-3.5 w-3.5 shrink-0" />
        <span className="max-w-[140px] truncate">
          {activeBranchMeta?.name ?? currentLabel}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isSwitching || isLoading}
          className={cn(
            // Header pill — matches search/theme/bell/avatar system
            'hidden md:flex items-center gap-2 h-10 px-4 max-w-[220px]',
            'rounded-full bg-white dark:bg-slate-900 shadow-pill',
            'text-sm font-medium text-slate-700 dark:text-slate-200',
            'hover:shadow-md transition-all duration-150',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
            authBranchId && 'text-blue-700 dark:text-blue-300',
          )}
        >
          {isSwitching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          ) : (
            <Building2 className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Aktiv filial tanlang
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* "Barcha filiallar" ko'rinishi olib tashlandi — strict branch-required */}

        {/* Filiallar ro'yxati */}
        {isLoading ? (
          <DropdownMenuItem disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Yuklanmoqda...
          </DropdownMenuItem>
        ) : activeBranches.length === 0 ? (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground text-sm">Filiallar topilmadi</span>
          </DropdownMenuItem>
        ) : (
          activeBranches.map((branch) => (
            <DropdownMenuItem
              key={branch.id}
              onClick={() =>
                switchBranch(branch.id, {
                  id: branch.id,
                  name: branch.name,
                  code: branch.code,
                  address: branch.address,
                  isActive: branch.isActive,
                })
              }
              className="flex items-center gap-2"
            >
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{branch.name}</p>
                {branch.code && (
                  <p className="text-xs text-muted-foreground">{branch.code}</p>
                )}
              </div>
              {activeBranchId === branch.id && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))
        )}

        {/* Filialni boshqarish — faqat director */}
        {user.role === 'director' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.location.assign('/dashboard/branches')}
              className="text-xs text-muted-foreground"
            >
              <Badge variant="outline" className="text-xs mr-2">+</Badge>
              Filiallarni boshqarish
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
