'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, AlertCircle, CheckCircle2, Clock, TrendingUp,
  Plus, ChevronDown, ChevronRight, Loader2, Filter, School,
  Users, Calendar, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { paymentsApi } from '@/lib/api/payments';
import { feeStructuresApi, type FeeStructure } from '@/lib/api/fee-structures';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate } from '@/lib/utils';

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Oylik',
  quarterly: 'Choraklik',
  yearly: 'Yillik',
  once: 'Bir martalik',
};

// ── Fee Structures Tab ─────────────────────────────────────────────────────────
function FeeStructuresTab({ canManage }: { canManage: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear().toString();

  const [feeOpen, setFeeOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({
    name: '', amount: '', frequency: 'monthly', gradeLevel: '', academicYear: currentYear, description: '',
  });

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fee-structures'],
    queryFn: () => feeStructuresApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: feeStructuresApi.create,
    onSuccess: () => {
      toast({ title: '✅ To\'lov tartibi yaratildi' });
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      setFeeOpen(false);
      setFeeForm({ name: '', amount: '', frequency: 'monthly', gradeLevel: '', academicYear: currentYear, description: '' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: feeStructuresApi.remove,
    onSuccess: () => {
      toast({ title: 'O\'chirildi' });
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
  });

  const generateMutation = useMutation({
    mutationFn: feeStructuresApi.generatePayments,
    onSuccess: (data: { created: number }) => {
      toast({ title: `✅ ${data.created} ta to'lov yozuvi yaratildi` });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">To'lov tartiblari</h3>
          <p className="text-sm text-muted-foreground">Oylik, choraklik yoki boshqa to'lov rejalarini boshqaring</p>
        </div>
        {canManage && (
          <Button onClick={() => setFeeOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Yangi tartib
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (fees as FeeStructure[]).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Hali to'lov tartiblari yo'q</p>
            {canManage && <p className="text-xs mt-1">Yangi tartib yaratib to'lovlarni avtomatlashtirying</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(fees as FeeStructure[]).map(fee => (
            <Card key={fee.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{fee.name}</p>
                      {!fee.isActive && <Badge variant="secondary" className="text-xs">Nofaol</Badge>}
                      <Badge variant="outline" className="text-xs">{FREQ_LABELS[fee.frequency] ?? fee.frequency}</Badge>
                      {fee.gradeLevel && <Badge variant="secondary" className="text-xs">{fee.gradeLevel}-sinf</Badge>}
                    </div>
                    {fee.description && <p className="text-xs text-muted-foreground mt-0.5">{fee.description}</p>}
                    <p className="text-xs text-muted-foreground">{fee.academicYear} o'quv yili</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-lg font-bold text-green-700">
                    {fee.amount.toLocaleString('uz-UZ')} {fee.currency}
                  </p>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => generateMutation.mutate(fee.id)}
                        disabled={generateMutation.isPending}
                        title="Barcha o'quvchilar uchun to'lov yaratish"
                      >
                        {generateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                        <span className="ml-1.5 text-xs">Yaratish</span>
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(fee.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create fee structure dialog */}
      <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi to'lov tartibi</DialogTitle>
            <DialogDescription>To'lov rejasini belgilang</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nomi *</Label>
              <Input placeholder="Oylik ta'lim to'lovi" value={feeForm.name} onChange={e => setFeeForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Summa (so'm) *</Label>
                <Input type="number" min={0} placeholder="500000" value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Davomiylik</Label>
                <Select value={feeForm.frequency} onValueChange={v => setFeeForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQ_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf darajasi (ixtiyoriy)</Label>
                <Input type="number" min={1} max={11} placeholder="Hammasi uchun bo'sh" value={feeForm.gradeLevel} onChange={e => setFeeForm(f => ({ ...f, gradeLevel: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>O'quv yili *</Label>
                <Input placeholder="2025-2026" value={feeForm.academicYear} onChange={e => setFeeForm(f => ({ ...f, academicYear: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input placeholder="Ixtiyoriy tavsif..." value={feeForm.description} onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeOpen(false)}>Bekor</Button>
            <Button
              onClick={() => createMutation.mutate({
                name: feeForm.name,
                amount: Number(feeForm.amount),
                frequency: feeForm.frequency,
                gradeLevel: feeForm.gradeLevel ? Number(feeForm.gradeLevel) : undefined,
                academicYear: feeForm.academicYear,
                description: feeForm.description || undefined,
              })}
              disabled={createMutation.isPending || !feeForm.name || !feeForm.amount}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const statusConfig: Record<string, { label: string; color: string }> = {
  paid:    { label: "To'landi",         color: 'border-green-500 text-green-600' },
  pending: { label: 'Kutilmoqda',        color: 'border-yellow-500 text-yellow-600' },
  overdue: { label: 'Muddati o\'tgan',  color: 'border-red-500 text-red-600' },
  failed:  { label: 'Muvaffaqiyatsiz',  color: 'border-red-400 text-red-500' },
  refunded:{ label: 'Qaytarildi',       color: 'border-border text-muted-foreground' },
};

const STATUSES = [
  { value: 'all', label: 'Barcha holat' },
  { value: 'pending', label: 'Kutilmoqda' },
  { value: 'overdue', label: 'Muddati o\'tgan' },
  { value: 'paid', label: 'To\'langan' },
];

const CREATE_EMPTY = {
  studentId: '',
  amount: '',
  description: '',
  dueDate: '',
  currency: 'UZS',
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const canCreate = ['school_admin', 'accountant'].includes(user?.role ?? '');

  // Filters
  const [filterClassId, setFilterClassId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(CREATE_EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Class stats expand
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  // Active tab — drives lazy history loading
  const [activeTab, setActiveTab] = useState('classes');

  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['payments', 'report'],
    queryFn: paymentsApi.getReport,
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['payments', 'history', filterClassId, filterStatus, filterFrom, filterTo],
    queryFn: () => paymentsApi.getHistory({
      classId: filterClassId !== 'all' ? filterClassId : undefined,
      status: filterStatus !== 'all' ? filterStatus : undefined,
      from: filterFrom || undefined,
      to: filterTo || undefined,
      limit: 50,
    }),
    // Lazy: only fetch when the history tab is actually open
    enabled: activeTab === 'history',
  });

  // Classes for filter + create
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  // Students list — stable key so re-selection doesn't cause an extra network trip
  const { data: studentsData } = useQuery({
    queryKey: ['students-for-payment-create'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 200 }),
    enabled: createOpen,
    staleTime: 60_000, // 1 min — list is unlikely to change while modal is open
  });
  const allStudents = (studentsData?.data ?? []).filter((u: any) => u.role === 'student');

  const markPaidMutation = useMutation({
    mutationFn: paymentsApi.markAsPaid,
    onMutate: async (paymentId: string) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic value
      await queryClient.cancelQueries({ queryKey: ['payments', 'report'] });
      const snapshot = queryClient.getQueryData(['payments', 'report']);

      // Optimistically remove the debtor row from the class stats immediately
      queryClient.setQueryData(['payments', 'report'], (old: any) => {
        if (!old?.classStats) return old;
        return {
          ...old,
          classStats: old.classStats.map((cls: any) => {
            const hasDebtor = cls.debtors?.some((d: any) => d.id === paymentId);
            if (!hasDebtor) return cls;
            const newDebtors = cls.debtors.filter((d: any) => d.id !== paymentId);
            const removedDebt = cls.debtors.find((d: any) => d.id === paymentId)?.amount ?? 0;
            return {
              ...cls,
              debtors: newDebtors,
              debtorCount: Math.max(0, (cls.debtorCount ?? 0) - 1),
              totalDebt: Math.max(0, (cls.totalDebt ?? 0) - removedDebt),
            };
          }),
        };
      });

      return { snapshot };
    },
    onSuccess: () => {
      // Server confirmed — now revalidate for fresh data
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: "✅ To'lov to'landi deb belgilandi" });
    },
    onError: (err: any, _id, context) => {
      // Roll back to snapshot if server rejected
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(['payments', 'report'], context.snapshot);
      }
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message });
    },
  });

  const createMutation = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      toast({ title: "✅ To'lov qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setCreateOpen(false);
      setForm(CREATE_EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = "O'quvchi tanlang";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = "To'lov summasi kiriting";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    createMutation.mutate({
      studentId: form.studentId,
      amount: Number(form.amount),
      description: form.description || undefined,
      dueDate: form.dueDate || undefined,
      currency: form.currency,
    });
  };

  const classStats: any[] = report?.classStats ?? [];
  const totalDebtors = classStats.reduce((s: number, c: any) => s + (c.debtorCount ?? 0), 0);
  const totalDebt    = classStats.reduce((s: number, c: any) => s + (c.totalDebt ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">To'lovlar</h1>
          <p className="text-muted-foreground">Moliyaviy holat va sinf bo'yicha statistika</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setCreateOpen(true); setForm(CREATE_EMPTY); setErrors({}); }}>
            <Plus className="mr-2 h-4 w-4" /> Yangi to'lov
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bu oy tushumi</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {reportLoading ? <Skeleton className="h-7 w-28" /> : (
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(report?.monthly?.paid ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kutilmoqda</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {reportLoading ? <Skeleton className="h-7 w-28" /> : (
              <div className="text-xl font-bold text-yellow-600">
                {formatCurrency(report?.pending ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Muddati o'tgan</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {reportLoading ? <Skeleton className="h-7 w-28" /> : (
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(report?.overdue ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jami qarzdorlik</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {reportLoading ? <Skeleton className="h-7 w-28" /> : (
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(totalDebt)}
              </div>
            )}
            {!reportLoading && (
              <p className="text-xs text-muted-foreground mt-0.5">{totalDebtors} ta qarzdor</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="classes">
            <School className="mr-1.5 h-4 w-4" /> Sinf bo'yicha
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="mr-1.5 h-4 w-4" /> To'lovlar tarixi
          </TabsTrigger>
          <TabsTrigger value="fee-structures">
            <CreditCard className="mr-1.5 h-4 w-4" /> To'lov tartiblari
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Sinf bo'yicha ── */}
        <TabsContent value="classes" className="space-y-3 mt-4">
          {reportLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : classStats.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Sinflar topilmadi
              </CardContent>
            </Card>
          ) : (
            classStats.map((cls: any) => (
              <Card key={cls.classId} className="overflow-hidden">
                {/* Class row header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setExpandedClass(expandedClass === cls.classId ? null : cls.classId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <School className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{cls.className}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.totalStudents} o'quvchi
                        {cls.debtorCount > 0 && (
                          <span className="text-red-500 ml-2">· {cls.debtorCount} ta qarzdor</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {cls.debtorCount > 0 ? (
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(cls.totalDebt)}</p>
                        <p className="text-xs text-muted-foreground">qarzdorlik</p>
                      </div>
                    ) : (
                      <Badge variant="outline" className="border-green-500 text-green-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Toza
                      </Badge>
                    )}
                    {expandedClass === cls.classId
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded class debtors */}
                {expandedClass === cls.classId && (
                  <div className="border-t bg-muted/20">
                    {cls.debtors.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Bu sinfda qarzdorlar yo'q ✅
                      </div>
                    ) : (
                      <div className="divide-y">
                        {cls.debtors.map((d: any) => {
                          const cfg = statusConfig[d.status] ?? { label: d.status, color: 'border-border text-muted-foreground' };
                          return (
                            <div key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium">{d.studentName}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  {d.description && <span>{d.description}</span>}
                                  {d.dueDate && (
                                    <span className={new Date(d.dueDate) < new Date() ? 'text-red-500 font-medium' : ''}>
                                      Muddat: {formatDate(d.dueDate)}
                                    </span>
                                  )}
                                  <span>{formatDate(d.createdAt)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 ml-4 shrink-0">
                                <span className="font-bold">{formatCurrency(d.amount)}</span>
                                <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                                {canCreate && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => markPaidMutation.mutate(d.id)}
                                    disabled={markPaidMutation.isPending}
                                  >
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> To'landi
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── TAB 2: To'lovlar tarixi ── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Sinf</Label>
                  <Select value={filterClassId} onValueChange={setFilterClassId}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue placeholder="Barcha sinflar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha sinflar</SelectItem>
                      {(classes as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Holat</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue placeholder="Barcha holat" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dan</Label>
                  <Input
                    type="date"
                    className="h-8 w-36"
                    value={filterFrom}
                    onChange={e => setFilterFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gacha</Label>
                  <Input
                    type="date"
                    className="h-8 w-36"
                    value={filterTo}
                    onChange={e => setFilterTo(e.target.value)}
                  />
                </div>
                {(filterClassId !== 'all' || filterStatus !== 'all' || filterFrom || filterTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => { setFilterClassId('all'); setFilterStatus('all'); setFilterFrom(''); setFilterTo(''); }}
                  >
                    <Filter className="mr-1.5 h-3.5 w-3.5" /> Tozalash
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {historyLoading ? (
                <div className="space-y-2 p-4">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : (
                <div className="divide-y">
                  {(history?.data ?? []).map((p: any) => {
                    const cfg = statusConfig[p.status] ?? { label: p.status, color: 'border-border text-muted-foreground' };
                    return (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium">{p.student?.firstName} {p.student?.lastName}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.description ?? "To'lov"} · {formatDate(p.createdAt)}
                            {p.dueDate && (
                              <span className={`ml-2 ${new Date(p.dueDate) < new Date() && p.status !== 'paid' ? 'text-red-500 font-medium' : ''}`}>
                                · Muddat: {formatDate(p.dueDate)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{formatCurrency(p.amount)}</span>
                          <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                          {canCreate && p.status !== 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => markPaidMutation.mutate(p.id)}
                              disabled={markPaidMutation.isPending}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" /> To'landi
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!history?.data || history.data.length === 0) && (
                    <div className="py-12 text-center text-muted-foreground">
                      <CreditCard className="mx-auto mb-2 h-10 w-10 opacity-30" />
                      <p>To'lovlar tarixi yo'q</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {history?.meta && history.meta.totalPages > 1 && (
            <p className="text-xs text-center text-muted-foreground">
              Jami {history.meta.total} ta to'lov
            </p>
          )}
        </TabsContent>

        {/* ── TAB 3: To'lov tartiblari ── */}
        <TabsContent value="fee-structures" className="mt-4">
          <FeeStructuresTab canManage={canCreate} />
        </TabsContent>
      </Tabs>

      {/* Create payment modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi to'lov qo'shish</DialogTitle>
            <DialogDescription>O'quvchi uchun to'lov qayd eting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>O'quvchi <span className="text-destructive">*</span></Label>
              <Select value={form.studentId} onValueChange={v => { setForm(f => ({ ...f, studentId: v })); setErrors(e => { const n = { ...e }; delete n.studentId; return n; }); }}>
                <SelectTrigger>
                  <SelectValue placeholder="O'quvchi tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Summa (so'm) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="500000"
                  value={form.amount}
                  onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setErrors(er => { const n = { ...er }; delete n.amount; return n; }); }}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Muddat</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input
                placeholder="Oylik to'lov, may 2026..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Bekor</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
