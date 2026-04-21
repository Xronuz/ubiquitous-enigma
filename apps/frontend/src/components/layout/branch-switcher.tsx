'use client';

/**
 * BranchSwitcher — director / school_admin / branch_admin uchun
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
const SWITCHER_ROLES = new Set(['director', 'school_admin', 'branch_admin']);

export function BranchSwitcher() {
  const user = useAuthStore((s) => s.user);
  const { activeBranchId, activeBranchMeta, branches, setBranches } = useBranchStore();
  const { switchBranch, isSwitching } = useSwitchBranch();

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
    : 'Barcha filiallar';

  const activeBranches = branches.filter((b) => b.isActive);

  // branch_admin uchun: faqat bitta filiali bo'lsa — dropdown emas, oddiy badge
  const isBranchAdmin = user.role === 'branch_admin';
  if (isBranchAdmin && activeBranches.length <= 1) {
    return (
      <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md border bg-muted/50 text-sm text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span className="max-w-[120px] truncate font-medium">
          {activeBranchMeta?.name ?? currentLabel}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSwitching || isLoading}
          className={cn(
            'hidden md:flex items-center gap-1.5 h-8 px-2.5 text-sm font-medium max-w-[200px]',
            'border-dashed hover:border-solid transition-all',
            activeBranchId && 'border-primary/50 text-primary',
          )}
        >
          {isSwitching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : activeBranchId ? (
            <Building2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Layers className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Aktiv filial tanlang
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Barcha filiallar (school-wide) — faqat director/school_admin uchun */}
        {!isBranchAdmin && (
          <>
            <DropdownMenuItem
              onClick={() => switchBranch(null, null)}
              className="flex items-center gap-2"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">Barcha filiallar</span>
              {!activeBranchId && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

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

        {/* Filialni boshqarish — faqat school_admin/director */}
        {(user.role === 'school_admin' || user.role === 'director') && (
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
