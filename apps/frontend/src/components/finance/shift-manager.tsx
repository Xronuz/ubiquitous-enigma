'use client';

/**
 * ShiftManager — Kassir smenasini boshqarish komponenti.
 * - Ochiq smena bo'lsa: smena ma'lumotlari + "Kassani yopish" tugmasi
 * - Ochiq smena bo'lmasa: "Smenani ochish" formasi
 * - Faqat accountant, branch_admin, school_admin, director uchun ko'rsatiladi
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, PlayCircle, StopCircle, AlertTriangle,
  Banknote, User, CheckCircle2, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { shiftsApi, treasuryApi, FinancialShift } from '@/lib/api/treasury';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const SHIFT_ROLES = new Set(['accountant', 'branch_admin', 'school_admin', 'director']);

function formatUZS(n: number) {
  return n.toLocaleString('uz-UZ') + ' UZS';
}

export function ShiftManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [selectedTreasuryId, setSelectedTreasuryId] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  if (!user || !SHIFT_ROLES.has(user.role)) return null;

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: activeShift, isLoading: shiftLoading } = useQuery({
    queryKey: ['active-shift', user.schoolId, user.branchId],
    queryFn: shiftsApi.getActive,
    staleTime: 30_000,
  });

  const { data: treasuries = [] } = useQuery({
    queryKey: ['treasury-list', user.schoolId],
    queryFn: treasuryApi.getAll,
    enabled: openShiftDialog,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const openMutation = useMutation({
    mutationFn: () =>
      shiftsApi.open({
        treasuryId: selectedTreasuryId,
        startingBalance: Number(startingBalance) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      toast({ title: 'Smena muvaffaqiyatli ochildi' });
      setOpenShiftDialog(false);
      setStartingBalance('');
      setSelectedTreasuryId('');
    },
    onError: (e: any) => toast({
      variant: 'destructive',
      title: 'Xatolik',
      description: e?.response?.data?.message ?? 'Smena ochishda xatolik',
    }),
  });

  const closeMutation = useMutation({
    mutationFn: () =>
      shiftsApi.close(activeShift!.id, {
        actualBalance: Number(actualBalance) || 0,
        notes: closeNotes || undefined,
      }),
    onSuccess: (closed) => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] });
      queryClient.invalidateQueries({ queryKey: ['treasury-summary'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });

      const discrepancy = closed.discrepancy ?? 0;
      const hasDisc = discrepancy !== 0;

      toast({
        title: 'Smena yopildi',
        description: hasDisc
          ? `Farq: ${discrepancy > 0 ? '+' : ''}${formatUZS(discrepancy)}`
          : 'Balans mos keladi ✓',
        variant: hasDisc ? 'destructive' : 'default',
      });
      setCloseShiftDialog(false);
      setActualBalance('');
      setCloseNotes('');
    },
    onError: (e: any) => toast({
      variant: 'destructive',
      title: 'Xatolik',
      description: e?.response?.data?.message ?? 'Smena yopishda xatolik',
    }),
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  if (shiftLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <>
      <Card className={cn(
        'border-2',
        activeShift
          ? 'border-green-300 bg-green-50 dark:bg-green-900/10'
          : 'border-dashed border-muted-foreground/30',
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Kassa smenasi
            </CardTitle>
            <Badge
              variant={activeShift ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                activeShift && 'bg-green-600 hover:bg-green-700',
              )}
            >
              {activeShift ? '● Ochiq' : '○ Yopiq'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {activeShift ? (
            /* ── Ochiq smena ko'rinishi ─────────────────────────────────── */
            <>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">G'azna:</span>
                  <span className="font-medium">{activeShift.treasury?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ochildi:</span>
                  <span className="font-medium">
                    {format(new Date(activeShift.startTime), 'HH:mm, dd MMM', { locale: uz })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boshlanish balansi:</span>
                  <span className="font-medium">{formatUZS(activeShift.startingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hozirgi balans:</span>
                  <span className="font-bold text-green-600">
                    {formatUZS(activeShift.treasury?.balance ?? 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  {activeShift.opener?.firstName} {activeShift.opener?.lastName} tomonidan ochildi
                </div>
              </div>

              <Button
                className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
                onClick={() => {
                  setActualBalance(String(activeShift.treasury?.balance ?? 0));
                  setCloseShiftDialog(true);
                }}
              >
                <StopCircle className="h-4 w-4" />
                Kassani yopish
              </Button>
            </>
          ) : (
            /* ── Yopiq smena ko'rinishi ─────────────────────────────────── */
            <>
              <p className="text-xs text-muted-foreground">
                Naqd to'lov qabul qilish uchun avval smenani oching
              </p>
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={() => setOpenShiftDialog(true)}
              >
                <PlayCircle className="h-4 w-4 text-green-600" />
                Smenani ochish
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Smena ochish dialog ──────────────────────────────────────────────── */}
      <Dialog open={openShiftDialog} onOpenChange={setOpenShiftDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Yangi smena ochish</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>G'azna tanlang</Label>
              <Select value={selectedTreasuryId} onValueChange={setSelectedTreasuryId}>
                <SelectTrigger>
                  <SelectValue placeholder="G'azna..." />
                </SelectTrigger>
                <SelectContent>
                  {treasuries
                    .filter((t) => t.isActive)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.branch ? ` — ${t.branch.name}` : ' — Markaziy'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="starting-balance">
                Boshlanish balansi
                <span className="text-muted-foreground text-xs ml-1">(naqd inventarizatsiya)</span>
              </Label>
              <Input
                id="starting-balance"
                type="number"
                min={0}
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenShiftDialog(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => openMutation.mutate()}
              disabled={!selectedTreasuryId || openMutation.isPending}
            >
              {openMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ochish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Smenani yopish dialog ────────────────────────────────────────────── */}
      <Dialog open={closeShiftDialog} onOpenChange={setCloseShiftDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Kassani yopish</DialogTitle>
          </DialogHeader>

          {activeShift && (
            <div className="space-y-4">
              {/* Kutilgan vs haqiqiy */}
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kutilgan balans:</span>
                  <span className="font-semibold">
                    {formatUZS(activeShift.treasury?.balance ?? 0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual-balance">
                  Haqiqiy balans
                  <span className="text-muted-foreground text-xs ml-1">(kassir hisoblagan)</span>
                </Label>
                <Input
                  id="actual-balance"
                  type="number"
                  min={0}
                  value={actualBalance}
                  onChange={(e) => setActualBalance(e.target.value)}
                  placeholder="0"
                />
                {/* Farqni ko'rsatish */}
                {actualBalance !== '' && (
                  (() => {
                    const exp = activeShift.treasury?.balance ?? 0;
                    const act = Number(actualBalance);
                    const diff = exp - act;
                    if (diff === 0) return (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Balans mos
                      </p>
                    );
                    return (
                      <p className={cn('text-xs flex items-center gap-1', diff > 0 ? 'text-red-600' : 'text-orange-600')}>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Farq: {diff > 0 ? '-' : '+'}{formatUZS(Math.abs(diff))}
                        {diff > 0 ? ' (kamomad)' : ' (ortiqcha)'}
                      </p>
                    );
                  })()
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="close-notes">Izoh (ixtiyoriy)</Label>
                <Textarea
                  id="close-notes"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Farq sababi yoki qo'shimcha ma'lumot..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCloseShiftDialog(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={() => closeMutation.mutate()}
              disabled={actualBalance === '' || closeMutation.isPending}
            >
              {closeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kassani yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
