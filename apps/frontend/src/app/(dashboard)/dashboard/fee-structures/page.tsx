'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Banknote, Plus, Edit2, Trash2, Zap, Loader2,
  RefreshCw, AlertCircle, CheckCircle2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { feeStructuresApi, FeeStructure } from '@/lib/api/fee-structures';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';

// ── Constants ─────────────────────────────────────────────────────────────────
const FREQUENCY_OPTIONS = [
  { value: 'monthly',   label: 'Oylik' },
  { value: 'quarterly', label: 'Choraklik' },
  { value: 'yearly',    label: 'Yillik' },
  { value: 'once',      label: 'Bir martalik' },
];

const CURRENCY_OPTIONS = ['UZS', 'USD', 'EUR'];

const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = [
  `${currentYear - 1}/${currentYear}`,
  `${currentYear}/${currentYear + 1}`,
  `${currentYear + 1}/${currentYear + 2}`,
];

const GRADE_LEVELS = [1,2,3,4,5,6,7,8,9,10,11];

function formatAmount(amount: number, currency: string) {
  if (currency === 'UZS') return `${amount.toLocaleString('uz-UZ')} so'm`;
  return `${amount.toLocaleString()} ${currency}`;
}

// ── Zod schema ────────────────────────────────────────────────────────────────
const feeSchema = z.object({
  name:          z.string().min(2, 'Nom kiritilishi shart'),
  description:   z.string().optional(),
  amount:        z.coerce.number().min(1, 'Miqdor 0 dan katta bo\'lishi kerak'),
  currency:      z.string().default('UZS'),
  frequency:     z.string().default('monthly'),
  gradeLevel:    z.coerce.number().optional(),
  academicYear:  z.string().min(1, 'O\'quv yili tanlanishi shart'),
});
type FeeFormValues = z.infer<typeof feeSchema>;

// ── FeeFormDialog ─────────────────────────────────────────────────────────────
function FeeFormDialog({
  open, onClose, editItem,
}: {
  open: boolean;
  onClose: () => void;
  editItem: FeeStructure | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register, handleSubmit, control, reset,
    formState: { errors, isSubmitting },
  } = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: editItem
      ? {
          name:         editItem.name,
          description:  editItem.description ?? '',
          amount:       editItem.amount,
          currency:     editItem.currency,
          frequency:    editItem.frequency,
          gradeLevel:   editItem.gradeLevel,
          academicYear: editItem.academicYear,
        }
      : {
          name: '', description: '', amount: 0,
          currency: 'UZS', frequency: 'monthly', academicYear: ACADEMIC_YEARS[1],
        },
  });

  const onSubmit = async (values: FeeFormValues) => {
    try {
      if (editItem) {
        await feeStructuresApi.update(editItem.id, {
          name:        values.name,
          description: values.description,
          amount:      values.amount,
          frequency:   values.frequency,
        });
        toast({ title: '✅ To\'lov tartibi yangilandi' });
      } else {
        await feeStructuresApi.create({
          name:         values.name,
          description:  values.description,
          amount:       values.amount,
          currency:     values.currency,
          frequency:    values.frequency,
          gradeLevel:   values.gradeLevel || undefined,
          academicYear: values.academicYear,
        });
        toast({ title: '✅ To\'lov tartibi qo\'shildi' });
      }
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      onClose();
      reset();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editItem ? 'To\'lov tartibini tahrirlash' : 'Yangi to\'lov tartibi'}</DialogTitle>
          <DialogDescription>To'lov miqdori va chastotasini belgilang</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Nomi <span className="text-destructive">*</span></Label>
            <Input placeholder="Oylik ta'lim to'lovi" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Izoh</Label>
            <Textarea placeholder="Qo'shimcha ma'lumot..." className="h-16 resize-none" {...register('description')} />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Miqdor <span className="text-destructive">*</span></Label>
              <Input type="number" min={0} placeholder="500000" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Valyuta</Label>
              <Controller name="currency" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!!editItem}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>Chastota</Label>
            <Controller name="frequency" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>

          {/* Academic year + grade level — only for create */}
          {!editItem && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>O'quv yili <span className="text-destructive">*</span></Label>
                <Controller name="academicYear" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
                {errors.academicYear && <p className="text-xs text-destructive">{errors.academicYear.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Sinf darajasi</Label>
                <Controller name="gradeLevel" control={control} render={({ field }) => (
                  <Select
                    value={field.value !== undefined ? String(field.value) : 'all'}
                    onValueChange={(v) => field.onChange(v === 'all' ? undefined : +v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Barchasi" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha sinflar</SelectItem>
                      {GRADE_LEVELS.map(g => <SelectItem key={g} value={String(g)}>{g}-sinf</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { onClose(); reset(); }}>Bekor</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editItem ? 'Saqlash' : 'Qo\'shish'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FeeStructuresPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = ['accountant'].includes(user?.role ?? '');

  const [yearFilter, setYearFilter] = useState(ACADEMIC_YEARS[1]);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<FeeStructure | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FeeStructure | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState<FeeStructure | null>(null);

  const { data: fees = [], isLoading, refetch } = useQuery({
    queryKey: ['fee-structures', yearFilter],
    queryFn: () => feeStructuresApi.getAll(yearFilter),
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feeStructuresApi.remove(id),
    onSuccess: () => {
      toast({ title: 'To\'lov tartibi o\'chirildi' });
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      setConfirmDelete(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (fee: FeeStructure) => feeStructuresApi.update(fee.id, { isActive: !fee.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fee-structures'] }),
  });

  const generateMutation = useMutation({
    mutationFn: (id: string) => feeStructuresApi.generatePayments(id),
    onSuccess: (res) => {
      toast({ title: `✅ ${res.created} ta to'lov yaratildi` });
      setConfirmGenerate(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
      setConfirmGenerate(null);
    },
  });

  // Summary stats
  const activeFees = fees.filter(f => f.isActive);
  const totalMonthly = activeFees
    .filter(f => f.frequency === 'monthly' && f.currency === 'UZS')
    .reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-emerald-500" /> To'lov Tartiblari
          </h1>
          <p className="text-muted-foreground">To'lov tuzilmalari va avtomatik to'lov yaratish</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Yangilash
          </Button>
          {canManage && (
            <Button onClick={() => { setEditItem(null); setFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Qo'shish
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Jami tartiblar</CardDescription>
            <CardTitle className="text-2xl">{fees.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Faol tartiblar</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{activeFees.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Oylik jami (UZS)</CardDescription>
            <CardTitle className="text-2xl">{totalMonthly.toLocaleString('uz-UZ')}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Year filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">O'quv yili:</span>
        {ACADEMIC_YEARS.map(y => (
          <button
            key={y}
            onClick={() => setYearFilter(y)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
              yearFilter === y
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/60'
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : fees.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Banknote className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">Bu o'quv yili uchun to'lov tartiblari yo'q</p>
            {canManage && (
              <Button className="mt-4" onClick={() => { setEditItem(null); setFormOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Tartib qo'shish
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {fees.map((fee) => {
            const freqLabel = FREQUENCY_OPTIONS.find(o => o.value === fee.frequency)?.label ?? fee.frequency;
            return (
              <Card key={fee.id} className={`transition-opacity ${fee.isActive ? '' : 'opacity-60'}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-lg shrink-0 ${fee.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'}`}>
                    <Banknote className={`h-5 w-5 ${fee.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{fee.name}</p>
                      <Badge variant="outline" className="text-xs">{freqLabel}</Badge>
                      {fee.gradeLevel && (
                        <Badge variant="secondary" className="text-xs">{fee.gradeLevel}-sinf</Badge>
                      )}
                      {!fee.isActive && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Nofaol</Badge>
                      )}
                    </div>
                    {fee.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{fee.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-0.5">{fee.academicYear}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-emerald-600">{formatAmount(fee.amount, fee.currency)}</p>
                  </div>

                  {/* Actions */}
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Generate payments */}
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        title="To'lovlarni yaratish"
                        onClick={() => setConfirmGenerate(fee)}
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                      {/* Toggle active */}
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title={fee.isActive ? 'Nofaol qilish' : 'Faollashtirish'}
                        onClick={() => toggleMutation.mutate(fee)}
                        disabled={toggleMutation.isPending}
                      >
                        {fee.isActive
                          ? <ToggleRight className="h-4 w-4 text-emerald-500" />
                          : <ToggleLeft className="h-4 w-4" />}
                      </Button>
                      {/* Edit */}
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditItem(fee); setFormOpen(true); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDelete(fee)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit form dialog */}
      <FeeFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(null); }}
        editItem={editItem}
      />

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>To'lov tartibini o'chirish</DialogTitle>
            <DialogDescription>
              <strong>{confirmDelete?.name}</strong> tartibini o'chirmoqchimisiz?
              Bu amalni bekor qilib bo'lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Bekor</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(confirmDelete!.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate payments confirm */}
      <Dialog open={!!confirmGenerate} onOpenChange={(v) => { if (!v) setConfirmGenerate(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" /> To'lovlarni yaratish
            </DialogTitle>
            <DialogDescription>
              <strong>{confirmGenerate?.name}</strong> asosida{' '}
              {confirmGenerate?.gradeLevel ? `${confirmGenerate.gradeLevel}-sinf` : 'barcha sinflar'}{' '}
              o'quvchilari uchun avtomatik to'lov yozuvlari yaratiladi.
              Miqdor: {confirmGenerate ? formatAmount(confirmGenerate.amount, confirmGenerate.currency) : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmGenerate(null)}>Bekor</Button>
            <Button
              onClick={() => generateMutation.mutate(confirmGenerate!.id)}
              disabled={generateMutation.isPending}
              className="gap-2"
            >
              {generateMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Zap className="h-4 w-4" />}
              Yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
