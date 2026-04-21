'use client';

/**
 * TreasuryPanel — finance dashboard uchun g'azna holati paneli.
 * Director: barcha filiallar kassasi (CENTRALIZED yoki DECENTRALIZED)
 * Accountant/branch_admin: faqat o'z filiali kassasi
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote, Building2, CreditCard, Layers, RefreshCw,
  TrendingUp, Lock, Unlock, Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { treasuryApi, FinanceType, Treasury } from '@/lib/api/treasury';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

function formatUZS(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} mlrd`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)} mln`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} ming`;
  return n.toLocaleString('uz-UZ');
}

export function TreasuryPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: summary, isLoading } = useQuery({
    queryKey: ['treasury-summary', user?.schoolId],
    queryFn: treasuryApi.getSummary,
    enabled: !!user?.schoolId,
    staleTime: 60_000,
  });

  // Moliya rejimini o'zgartirish (faqat school_admin)
  const financeTypeMutation = useMutation({
    mutationFn: (ft: FinanceType) => treasuryApi.setFinanceType(ft),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      toast({ title: 'Moliya rejimi yangilandi' });
    },
    onError: (e: any) => toast({
      variant: 'destructive',
      title: 'Xatolik',
      description: e?.response?.data?.message ?? 'Xatolik yuz berdi',
    }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const isDecentralized = summary.financeType === 'DECENTRALIZED';
  const canChangePolicy = user?.role === 'school_admin';

  return (
    <div className="space-y-4">
      {/* Umumiy balans + rejim */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Umumiy g'azna balansi
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-semibold gap-1',
                  isDecentralized
                    ? 'border-orange-400 text-orange-600 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-900/20',
                )}
              >
                {isDecentralized ? (
                  <><Unlock className="h-3 w-3" />Markazlashmagan</>
                ) : (
                  <><Lock className="h-3 w-3" />Markazlashgan</>
                )}
              </Badge>

              {/* Policy toggle — faqat school_admin */}
              {canChangePolicy && (
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="finance-type-toggle"
                    checked={isDecentralized}
                    disabled={financeTypeMutation.isPending}
                    onCheckedChange={(v) =>
                      financeTypeMutation.mutate(v ? 'DECENTRALIZED' : 'CENTRALIZED')
                    }
                    className="scale-75"
                  />
                  <Label htmlFor="finance-type-toggle" className="text-xs cursor-pointer">
                    Mustaqil rejim
                  </Label>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tracking-tight">
            {formatUZS(summary.totalBalance)}
            <span className="text-sm font-normal text-muted-foreground ml-1">UZS</span>
          </p>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" />
              Naqd: {formatUZS(summary.totalCash)}
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              Bank: {formatUZS(summary.totalBank)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Har bir g'azna kartasi */}
      {summary.treasuries.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center text-muted-foreground text-sm border rounded-lg border-dashed gap-2">
          <Banknote className="h-8 w-8 opacity-30" />
          <p>G'aznalar hali yaratilmagan</p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => window.location.assign('/dashboard/treasury')}
          >
            <Plus className="h-3.5 w-3.5" />
            G'azna qo'shish
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {summary.treasuries.map((t) => (
            <TreasuryCard key={t.id} treasury={t} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bitta g'azna kartasi ──────────────────────────────────────────────────────
function TreasuryCard({ treasury }: { treasury: Treasury }) {
  const isCash = (treasury.type as string) === 'CASH';

  return (
    <Card className={cn(
      'border transition-shadow hover:shadow-md',
      !treasury.isActive && 'opacity-50',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              isCash ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20',
            )}>
              {isCash
                ? <Banknote className="h-4 w-4 text-green-600" />
                : <CreditCard className="h-4 w-4 text-blue-600" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{treasury.name}</p>
              <p className="text-xs text-muted-foreground">
                {treasury.branch?.name ?? (
                  <span className="flex items-center gap-0.5">
                    <Layers className="h-3 w-3" /> Markaziy
                  </span>
                )}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            'text-xs shrink-0',
            isCash ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700',
          )}>
            {isCash ? 'Naqd' : 'Bank'}
          </Badge>
        </div>

        <div className="mt-3 border-t pt-2.5">
          <p className="text-xl font-bold">
            {formatUZS(treasury.balance)}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              {treasury.currency}
            </span>
          </p>
          {treasury.branch?.code && (
            <p className="text-xs text-muted-foreground">{treasury.branch.code}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
