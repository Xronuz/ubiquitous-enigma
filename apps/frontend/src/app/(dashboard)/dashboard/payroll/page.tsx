'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Banknote, Plus, Edit2, Trash2, CheckCircle2, XCircle, Clock,
  Loader2, TrendingUp, Users, AlertCircle, CalendarDays, ChevronDown,
  ChevronUp, Save, RefreshCw, Eye, Calculator, Download, Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { payrollApi } from '@/lib/api/payroll';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDate, getInitials, getRoleLabel } from '@/lib/utils';
import { TariffCalculatorDialog } from '@/components/payroll/tariff-calculator-dialog';

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTHS = [
  { v: 1, l: 'Yanvar' }, { v: 2, l: 'Fevral' }, { v: 3, l: 'Mart' },
  { v: 4, l: 'Aprel' }, { v: 5, l: 'May' }, { v: 6, l: 'Iyun' },
  { v: 7, l: 'Iyul' }, { v: 8, l: 'Avgust' }, { v: 9, l: 'Sentabr' },
  { v: 10, l: 'Oktabr' }, { v: 11, l: 'Noyabr' }, { v: 12, l: 'Dekabr' },
];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Kutilmoqda',    color: 'border-yellow-500 text-yellow-600' },
  approved: { label: 'Tasdiqlandi',   color: 'border-green-500 text-green-600' },
  rejected: { label: 'Rad etildi',    color: 'border-red-500 text-red-600' },
  paid:     { label: "To'landi",      color: 'border-blue-500 text-blue-600' },
  draft:    { label: 'Qoralama',      color: 'border-border text-muted-foreground' },
};

function MonthLabel({ month, year }: { month: number; year: number }) {
  return <>{MONTHS.find(m => m.v === month)?.l} {year}</>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'school_admin';
  const isManager = ['school_admin', 'accountant'].includes(user?.role ?? '');

  // ── salary config modal ───────────────────────────────────────────────────
  const [configOpen, setConfigOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<any>(null); // null = new, obj = edit
  const [configForm, setConfigForm] = useState({
    userId: '', baseSalary: '', hourlyRate: '',
    extraCurricularRate: '', degreeAllowance: '', certificateAllowance: '',
    position: '', startDate: '',
  });
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});
  const [tariffOpen, setTariffOpen] = useState(false);

  // ── payroll detail modal ──────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    scheduledHours: '', completedHours: '', extraCurricularHours: '',
    bonuses: '', deductions: '', note: '',
  });

  // ── generate payroll modal ────────────────────────────────────────────────
  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ month: String(currentMonth), year: String(currentYear), note: '' });

  // ── advance modal ─────────────────────────────────────────────────────────
  const [advOpen, setAdvOpen] = useState(false);
  const [advForm, setAdvForm] = useState({
    amount: '', reason: '', month: String(currentMonth), year: String(currentYear),
  });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewComment, setReviewComment] = useState('');

  // Admin: directly issue advance to staff
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueForm, setIssueForm] = useState({
    targetUserId: '', amount: '', reason: '',
    month: String(currentMonth), year: String(currentYear),
  });

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['payroll-stats'],
    queryFn: payrollApi.getStats,
    enabled: isManager,
  });

  const { data: salaryConfigs = [], isLoading: configsLoading } = useQuery({
    queryKey: ['payroll-staff'],
    queryFn: payrollApi.getAllSalaryConfigs,
    enabled: isManager,
  });

  const { data: unconfiguredStaff = [] } = useQuery({
    queryKey: ['payroll-unconfigured'],
    queryFn: payrollApi.getUnconfiguredStaff,
    enabled: configOpen && !editConfig,
  });

  const { data: payrolls = [], isLoading: payrollsLoading } = useQuery({
    queryKey: ['payroll-monthly'],
    queryFn: payrollApi.getAllPayrolls,
    enabled: isManager,
  });

  const { data: payrollDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['payroll-detail', detailId],
    queryFn: () => payrollApi.getPayrollDetail(detailId),
    enabled: detailOpen && !!detailId,
  });

  const { data: advances = [], isLoading: advancesLoading } = useQuery({
    queryKey: ['payroll-advances'],
    queryFn: () => payrollApi.getAdvances(),
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const createConfigMutation = useMutation({
    mutationFn: payrollApi.createSalaryConfig,
    onSuccess: () => {
      toast({ title: '✅ Maosh konfiguratsiyasi yaratildi' });
      queryClient.invalidateQueries({ queryKey: ['payroll-staff'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-unconfigured'] });
      setConfigOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => payrollApi.updateSalaryConfig(id, payload),
    onSuccess: () => {
      toast({ title: '✅ Yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['payroll-staff'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
      setConfigOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: payrollApi.deleteSalaryConfig,
    onSuccess: () => {
      toast({ title: "O'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['payroll-staff'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const genMutation = useMutation({
    mutationFn: payrollApi.generatePayroll,
    onSuccess: () => {
      toast({ title: '✅ Oylik hisob-kitob yaratildi' });
      queryClient.invalidateQueries({ queryKey: ['payroll-monthly'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
      setGenOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, ...payload }: any) => payrollApi.updatePayrollItem(id, payload),
    onSuccess: () => {
      toast({ title: '✅ Yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['payroll-detail', detailId] });
      queryClient.invalidateQueries({ queryKey: ['payroll-monthly'] });
      setEditingItemId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: payrollApi.approvePayroll,
    onSuccess: () => {
      toast({ title: '✅ Hisob-kitob tasdiqlandi' });
      queryClient.invalidateQueries({ queryKey: ['payroll-monthly'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-detail', detailId] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const paidMutation = useMutation({
    mutationFn: payrollApi.markPayrollPaid,
    onSuccess: () => {
      toast({ title: "✅ To'landi deb belgilandi" });
      queryClient.invalidateQueries({ queryKey: ['payroll-monthly'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-detail', detailId] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deletePayrollMutation = useMutation({
    mutationFn: payrollApi.deletePayroll,
    onSuccess: () => {
      toast({ title: "O'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['payroll-monthly'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const createAdvanceMutation = useMutation({
    mutationFn: payrollApi.createAdvance,
    onSuccess: () => {
      toast({ title: "✅ Avans so'rovi yuborildi" });
      queryClient.invalidateQueries({ queryKey: ['payroll-advances'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
      setAdvOpen(false);
      setAdvForm({ amount: '', reason: '', month: String(currentMonth), year: String(currentYear) });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const issueAdvanceMutation = useMutation({
    mutationFn: payrollApi.issueAdvance,
    onSuccess: () => {
      toast({ title: "✅ Avans berildi va tasdiqlandi" });
      queryClient.invalidateQueries({ queryKey: ['payroll-advances'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
      setIssueOpen(false);
      setIssueForm({ targetUserId: '', amount: '', reason: '', month: String(currentMonth), year: String(currentYear) });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const reviewAdvanceMutation = useMutation({
    mutationFn: ({ id, action, comment }: { id: string; action: 'approve' | 'reject'; comment?: string }) =>
      payrollApi.reviewAdvance(id, { action, comment }),
    onSuccess: () => {
      toast({ title: '✅ Qaror qabul qilindi' });
      queryClient.invalidateQueries({ queryKey: ['payroll-advances'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
      setReviewOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const sendSlipsMutation = useMutation({
    mutationFn: (id: string) => payrollApi.sendSalarySlips(id),
    onSuccess: (res) => {
      toast({ title: `📧 Maosh varaqalari yuborildi: ${res.sent} ta muvaffaqiyatli${res.failed > 0 ? `, ${res.failed} ta xato` : ''}${res.skipped > 0 ? `, ${res.skipped} ta email yo'q` : ''}` });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const advancePaidMutation = useMutation({
    mutationFn: payrollApi.markAdvancePaid,
    onSuccess: () => {
      toast({ title: "✅ Avans to'landi deb belgilandi" });
      queryClient.invalidateQueries({ queryKey: ['payroll-advances'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const openNewConfig = () => {
    setEditConfig(null);
    setConfigForm({
      userId: '', baseSalary: '', hourlyRate: '',
      extraCurricularRate: '', degreeAllowance: '', certificateAllowance: '',
      position: '', startDate: '',
    });
    setConfigErrors({});
    setConfigOpen(true);
  };

  const openEditConfig = (cfg: any) => {
    setEditConfig(cfg);
    setConfigForm({
      userId: cfg.userId,
      baseSalary: String(cfg.baseSalary),
      hourlyRate: String(cfg.hourlyRate ?? 0),
      extraCurricularRate: String(cfg.extraCurricularRate ?? 0),
      degreeAllowance: String(cfg.degreeAllowance ?? 0),
      certificateAllowance: String(cfg.certificateAllowance ?? 0),
      position: cfg.position ?? '',
      startDate: cfg.startDate ? cfg.startDate.split('T')[0] : '',
    });
    setConfigErrors({});
    setConfigOpen(true);
  };

  const validateConfig = () => {
    const e: Record<string, string> = {};
    if (!editConfig && !configForm.userId) e.userId = 'Xodim tanlang';
    if (!configForm.baseSalary || Number(configForm.baseSalary) <= 0) e.baseSalary = "Maosh kiriting";
    if (!configForm.startDate) e.startDate = 'Sana tanlang';
    setConfigErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfigSave = () => {
    if (!validateConfig()) return;
    if (editConfig) {
      updateConfigMutation.mutate({
        id: editConfig.id,
        baseSalary: Number(configForm.baseSalary),
        hourlyRate: Number(configForm.hourlyRate) || 0,
        extraCurricularRate: Number(configForm.extraCurricularRate) || 0,
        degreeAllowance: Number(configForm.degreeAllowance) || 0,
        certificateAllowance: Number(configForm.certificateAllowance) || 0,
        position: configForm.position || undefined,
      });
    } else {
      createConfigMutation.mutate({
        userId: configForm.userId,
        baseSalary: Number(configForm.baseSalary),
        hourlyRate: Number(configForm.hourlyRate) || 0,
        extraCurricularRate: Number(configForm.extraCurricularRate) || 0,
        degreeAllowance: Number(configForm.degreeAllowance) || 0,
        certificateAllowance: Number(configForm.certificateAllowance) || 0,
        position: configForm.position || undefined,
        startDate: configForm.startDate,
      });
    }
  };

  const startEditItem = (item: any) => {
    setEditingItemId(item.id);
    setItemForm({
      scheduledHours: String(item.scheduledHours),
      completedHours: String(item.completedHours),
      extraCurricularHours: String(item.extraCurricularHours ?? 0),
      bonuses: String(item.bonuses),
      deductions: String(item.deductions),
      note: item.note ?? '',
    });
  };

  const saveItem = () => {
    if (!editingItemId) return;
    updateItemMutation.mutate({
      id: editingItemId,
      scheduledHours: Number(itemForm.scheduledHours) || 0,
      completedHours: Number(itemForm.completedHours) || 0,
      extraCurricularHours: Number(itemForm.extraCurricularHours) || 0,
      bonuses: Number(itemForm.bonuses) || 0,
      deductions: Number(itemForm.deductions) || 0,
      note: itemForm.note || undefined,
    });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const pendingAdvanceCount = (advances as any[]).filter((a: any) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Banknote className="h-6 w-6 text-primary" /> Maosh tizimi
        </h1>
        <p className="text-muted-foreground">Xodimlar maoshi, avanslar va oylik hisob-kitob</p>
      </div>

      {/* Stats row */}
      {isManager && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatCard
                icon={<Users className="h-5 w-5 text-blue-500" />}
                label="Faol xodimlar"
                value={String(stats?.staffCount ?? 0)}
                sub="maosh sozlangan"
                color="bg-blue-500/10"
              />
              <StatCard
                icon={<Banknote className="h-5 w-5 text-green-500" />}
                label="Oylik byudjet"
                value={formatCurrency(stats?.monthlyBudget ?? 0)}
                sub="jami asosiy maoshlar"
                color="bg-green-500/10"
              />
              <StatCard
                icon={<AlertCircle className="h-5 w-5 text-yellow-500" />}
                label="Avans so'rovlari"
                value={String(stats?.pendingAdvances ?? 0)}
                sub="kutilmoqda"
                color="bg-yellow-500/10"
              />
              <StatCard
                icon={<CalendarDays className="h-5 w-5 text-purple-500" />}
                label="Joriy oy"
                value={
                  stats?.currentPayroll
                    ? STATUS_CFG[stats.currentPayroll.status]?.label ?? '—'
                    : "Yaratilmagan"
                }
                sub={
                  stats?.currentPayroll
                    ? `${formatCurrency(stats.currentPayroll.totalNet)} netto`
                    : "Hisob-kitob yo'q"
                }
                color="bg-purple-500/10"
              />
            </>
          )}
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue={isManager ? "staff" : "advances"}>
        <TabsList className={isManager ? "grid grid-cols-4 w-full max-w-xl" : "grid grid-cols-1 w-48"}>
          {isManager && <TabsTrigger value="staff">Xodimlar</TabsTrigger>}
          {isManager && <TabsTrigger value="payroll">Oylik</TabsTrigger>}
          <TabsTrigger value="advances">
            Avanslar
            {pendingAdvanceCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
                {pendingAdvanceCount}
              </Badge>
            )}
          </TabsTrigger>
          {isManager && <TabsTrigger value="history">Tarix</TabsTrigger>}
        </TabsList>

        {/* ── TAB 1: Xodimlar (salary configs) ─────────────────────────────── */}
        {isManager && (
          <TabsContent value="staff" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(salaryConfigs as any[]).length} ta xodim sozlangan
              </p>
              <Button size="sm" onClick={openNewConfig}>
                <Plus className="mr-1.5 h-4 w-4" /> Xodim qo'shish
              </Button>
            </div>

            {configsLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : (salaryConfigs as any[]).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Banknote className="mx-auto mb-2 h-10 w-10 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">Hali xodimlar maoshi sozlanmagan</p>
                  <Button className="mt-3" size="sm" onClick={openNewConfig}><Plus className="mr-1.5 h-4 w-4" />Boshlash</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {(salaryConfigs as any[]).map((cfg: any) => (
                  <Card key={cfg.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {getInitials(cfg.user?.firstName ?? '', cfg.user?.lastName ?? '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{cfg.user?.firstName} {cfg.user?.lastName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>{getRoleLabel(cfg.user?.role ?? '')}</span>
                          {cfg.position && <><span>·</span><span>{cfg.position}</span></>}
                          {!cfg.isActive && <Badge variant="destructive" className="text-[10px]">Nofaol</Badge>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-green-600">{formatCurrency(cfg.baseSalary)}</p>
                        {cfg.hourlyRate > 0 && (
                          <p className="text-xs text-muted-foreground">+{formatCurrency(cfg.hourlyRate)}/soat</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditConfig(cfg)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteConfigMutation.mutate(cfg.id)}
                            disabled={deleteConfigMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── TAB 2: Oylik hisob-kitob ─────────────────────────────────────── */}
        {isManager && (
          <TabsContent value="payroll" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{(payrolls as any[]).length} ta hisob-kitob</p>
              <Button size="sm" onClick={() => setGenOpen(true)}>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Yangi hisob-kitob
              </Button>
            </div>

            {payrollsLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : (payrolls as any[]).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="mx-auto mb-2 h-10 w-10 opacity-30" />
                  <p>Hisob-kitoblar yo'q</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {(payrolls as any[]).map((pr: any) => {
                  const cfg = STATUS_CFG[pr.status] ?? STATUS_CFG.draft;
                  return (
                    <Card key={pr.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <CalendarDays className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              <MonthLabel month={pr.month} year={pr.year} />
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pr._count?.items ?? 0} ta xodim ·
                              Yaratdi: {pr.createdBy?.firstName} {pr.createdBy?.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold">{formatCurrency(pr.totalNet)}</p>
                            <p className="text-xs text-muted-foreground">netto</p>
                          </div>
                          <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={() => { setDetailId(pr.id); setDetailOpen(true); setEditingItemId(null); }}
                            >
                              <Eye className="mr-1 h-3 w-3" /> Ko'rish
                            </Button>
                            {isAdmin && pr.status === 'draft' && (
                              <Button
                                size="sm"
                                className="h-7 bg-green-600 hover:bg-green-700"
                                onClick={() => approveMutation.mutate(pr.id)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Tasdiqlash
                              </Button>
                            )}
                            {pr.status === 'approved' && (
                              <Button
                                size="sm"
                                className="h-7"
                                onClick={() => paidMutation.mutate(pr.id)}
                                disabled={paidMutation.isPending}
                              >
                                <Banknote className="mr-1 h-3 w-3" /> To'landi
                              </Button>
                            )}
                            {isAdmin && pr.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deletePayrollMutation.mutate(pr.id)}
                                disabled={deletePayrollMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── TAB 3: Avanslar ──────────────────────────────────────────────── */}
        <TabsContent value="advances" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{(advances as any[]).length} ta so'rov</p>
            <div className="flex gap-2">
              {/* Admin: directly issue advance to any staff member */}
              {isManager && (
                <Button size="sm" variant="outline" onClick={() => setIssueOpen(true)}>
                  <Banknote className="mr-1.5 h-4 w-4" /> Avans berish
                </Button>
              )}
              {/* Staff: request advance for themselves */}
              {!isManager && (
                <Button size="sm" onClick={() => setAdvOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Avans so'rash
                </Button>
              )}
            </div>
          </div>

          {advancesLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : (advances as any[]).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Banknote className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p>Avans so'rovlari yo'q</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {(advances as any[]).map((adv: any) => {
                const cfg = STATUS_CFG[adv.status] ?? STATUS_CFG.pending;
                const isMine = adv.userId === user?.id;
                return (
                  <Card key={adv.id}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(adv.user?.firstName ?? '', adv.user?.lastName ?? '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">
                              {adv.user?.firstName} {adv.user?.lastName}
                            </p>
                            {isMine && <Badge variant="outline" className="text-[10px] px-1.5">Men</Badge>}
                            <span className="text-xs text-muted-foreground">
                              <MonthLabel month={adv.month} year={adv.year} />
                            </span>
                          </div>
                          {adv.reason && <p className="text-xs text-muted-foreground truncate">{adv.reason}</p>}
                          {adv.approvedBy && (
                            <p className="text-xs text-muted-foreground">
                              Tasdiqladi: {adv.approvedBy?.firstName} {adv.approvedBy?.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="font-bold">{formatCurrency(adv.amount)}</p>
                        <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                        {isManager && adv.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              onClick={() => { setReviewTarget(adv); setReviewAction('approve'); setReviewComment(''); setReviewOpen(true); }}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Tasdiqlash
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => { setReviewTarget(adv); setReviewAction('reject'); setReviewComment(''); setReviewOpen(true); }}
                            >
                              <XCircle className="mr-1 h-3 w-3" /> Rad
                            </Button>
                          </>
                        )}
                        {isManager && adv.status === 'approved' && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => advancePaidMutation.mutate(adv.id)}
                            disabled={advancePaidMutation.isPending}
                          >
                            <Banknote className="mr-1 h-3 w-3" /> To'landi
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 4: Statistika/Tarix ───────────────────────────────────────── */}
        {isManager && (
          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">So'nggi oylik statistikasi</CardTitle>
                <CardDescription>Oxirgi 6 oy</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-32" />
                ) : (
                  <div className="space-y-3">
                    {(stats?.recentPayrolls ?? []).map((pr: any) => {
                      const cfg = STATUS_CFG[pr.status] ?? STATUS_CFG.draft;
                      const grossVsNet = pr.totalGross > 0
                        ? Math.round((pr.totalNet / pr.totalGross) * 100)
                        : 100;
                      return (
                        <div key={pr.id} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium">
                            <MonthLabel month={pr.month} year={pr.year} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>Netto: {formatCurrency(pr.totalNet)}</span>
                              <span className="text-muted-foreground">Brutto: {formatCurrency(pr.totalGross)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${grossVsNet}%` }}
                              />
                            </div>
                          </div>
                          <Badge variant="outline" className={`w-24 justify-center text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        </div>
                      );
                    })}
                    {(!stats?.recentPayrolls || stats.recentPayrolls.length === 0) && (
                      <p className="text-center text-muted-foreground py-6">Ma'lumot yo'q</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role breakdown */}
            {stats?.roleStats && Object.keys(stats.roleStats).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lavozim bo'yicha maosh</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.roleStats).map(([role, info]: [string, any]) => (
                      <div key={role} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getRoleLabel(role)}</span>
                          <Badge variant="secondary" className="text-xs">{info.count} ta</Badge>
                        </div>
                        <span className="font-bold text-green-600">{formatCurrency(info.total)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* ═══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Tarif kalkulyator dialog */}
      <TariffCalculatorDialog
        open={tariffOpen}
        onOpenChange={setTariffOpen}
        onApply={(result) => {
          setConfigForm(f => ({
            ...f,
            baseSalary: String(result.baseSalary),
            hourlyRate: String(result.hourlyRate),
          }));
        }}
        initialValues={editConfig
          ? {
              qualificationGrade: editConfig.qualificationGrade,
              educationLevel: editConfig.educationLevel,
              workExperienceYears: editConfig.workExperienceYears,
              academicDegree: editConfig.academicDegree,
              honorificTitle: editConfig.honorificTitle,
              languageCerts: editConfig.languageCerts,
              weeklyLessonHours: editConfig.weeklyLessonHours,
            }
          : undefined
        }
      />

      {/* Salary config create/edit */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editConfig ? 'Maosh tahrirlash' : "Yangi maosh konfiguratsiyasi"}</DialogTitle>
            <DialogDescription>
              {editConfig
                ? `${editConfig.user?.firstName} ${editConfig.user?.lastName} uchun`
                : 'Xodim tanlang va maosh belgilang'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editConfig && (
              <div className="space-y-1.5">
                <Label>Xodim <span className="text-destructive">*</span></Label>
                <Select
                  value={configForm.userId}
                  onValueChange={v => { setConfigForm(f => ({ ...f, userId: v })); setConfigErrors(e => { const n = { ...e }; delete n.userId; return n; }); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Xodim tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(unconfiguredStaff as any[]).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} — {getRoleLabel(u.role)}
                      </SelectItem>
                    ))}
                    {(unconfiguredStaff as any[]).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Barcha xodimlar sozlangan</div>
                    )}
                  </SelectContent>
                </Select>
                {configErrors.userId && <p className="text-xs text-destructive">{configErrors.userId}</p>}
              </div>
            )}
            {/* ─ Tarif kalkulyator tugmasi ─ */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Calculator className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 text-sm">
                <div className="font-medium">UZ Tarifikatsiya kalkulyatori</div>
                <div className="text-muted-foreground text-xs">Toifa, staj, daraja asosida maoshni avtomatik hisoblash</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTariffOpen(true)}
              >
                <Calculator className="h-3.5 w-3.5 mr-1.5" /> Hisoblash
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Asosiy oylik (so'm) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  placeholder="3 000 000"
                  value={configForm.baseSalary}
                  onChange={e => { setConfigForm(f => ({ ...f, baseSalary: e.target.value })); setConfigErrors(er => { const n = { ...er }; delete n.baseSalary; return n; }); }}
                />
                {configErrors.baseSalary && <p className="text-xs text-destructive">{configErrors.baseSalary}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Asosiy soatlik narx</Label>
                <Input
                  type="number"
                  placeholder="50 000"
                  value={configForm.hourlyRate}
                  onChange={e => setConfigForm(f => ({ ...f, hourlyRate: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">Oddiy dars uchun</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>To'garak soatlik narxi</Label>
                <Input
                  type="number"
                  placeholder="60 000"
                  value={configForm.extraCurricularRate}
                  onChange={e => setConfigForm(f => ({ ...f, extraCurricularRate: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">Qo'shimcha to'garak</p>
              </div>
              <div className="space-y-1.5">
                <Label>Ilmiy daraja qo'shimchasi</Label>
                <Input
                  type="number"
                  placeholder="200 000"
                  value={configForm.degreeAllowance}
                  onChange={e => setConfigForm(f => ({ ...f, degreeAllowance: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">PhD/Doktor uchun oylik</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Til sertifikati qo'shimchasi</Label>
                <Input
                  type="number"
                  placeholder="150 000"
                  value={configForm.certificateAllowance}
                  onChange={e => setConfigForm(f => ({ ...f, certificateAllowance: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">IELTS/CEFR va boshqalar</p>
              </div>
              <div className="space-y-1.5">
                <Label>Lavozim</Label>
                <Input
                  placeholder="Matematika o'qituvchisi..."
                  value={configForm.position}
                  onChange={e => setConfigForm(f => ({ ...f, position: e.target.value }))}
                />
              </div>
            </div>
            {!editConfig && (
              <div className="space-y-1.5">
                <Label>Ishga kirgan sana <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={configForm.startDate}
                  onChange={e => { setConfigForm(f => ({ ...f, startDate: e.target.value })); setConfigErrors(er => { const n = { ...er }; delete n.startDate; return n; }); }}
                />
                {configErrors.startDate && <p className="text-xs text-destructive">{configErrors.startDate}</p>}
              </div>
            )}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-400">
              Avans maks. = Asosiy maoshning <strong>50%</strong> (
              {configForm.baseSalary
                ? formatCurrency(Number(configForm.baseSalary) * 0.5)
                : '—'})
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Bekor</Button>
            <Button
              onClick={handleConfigSave}
              disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
            >
              {(createConfigMutation.isPending || updateConfigMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" /> Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate payroll */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Oylik hisob-kitob yaratish</DialogTitle>
            <DialogDescription>
              Barcha faol xodimlar uchun avtomatik hisoblash
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Oy</Label>
                <Select value={genForm.month} onValueChange={v => setGenForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Yil</Label>
                <Select value={genForm.year} onValueChange={v => setGenForm(f => ({ ...f, year: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input
                placeholder="Ixtiyoriy izoh..."
                value={genForm.note}
                onChange={e => setGenForm(f => ({ ...f, note: e.target.value }))}
              />
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
              <p className="font-medium">ℹ️ Eslatma</p>
              <p className="mt-1">Qoralama (draft) sifatida yaratiladi. Keyin har bir xodim uchun dars soatlari va bonuslar qo'shishingiz mumkin.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGenOpen(false)}>Bekor</Button>
            <Button
              onClick={() => genMutation.mutate({ month: Number(genForm.month), year: Number(genForm.year), note: genForm.note || undefined })}
              disabled={genMutation.isPending}
            >
              {genMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RefreshCw className="mr-2 h-4 w-4" /> Yaratish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payroll detail */}
      <Dialog open={detailOpen} onOpenChange={v => { setDetailOpen(v); if (!v) setEditingItemId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {payrollDetail ? <><MonthLabel month={payrollDetail.month} year={payrollDetail.year} /> — Oylik hisob-kitob</> : 'Yuklanmoqda...'}
            </DialogTitle>
            {payrollDetail && (
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className={(STATUS_CFG[payrollDetail.status] ?? STATUS_CFG.draft).color}>
                  {(STATUS_CFG[payrollDetail.status] ?? STATUS_CFG.draft).label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Jami: <strong>{formatCurrency(payrollDetail.totalGross)}</strong> brutto →{' '}
                  <strong className="text-green-600">{formatCurrency(payrollDetail.totalNet)}</strong> netto
                </span>
              </div>
            )}
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-2 py-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : payrollDetail ? (
            <div className="space-y-2 mt-2">
              {payrollDetail.items?.map((item: any) => {
                const isEditing = editingItemId === item.id;
                const canEdit = payrollDetail.status !== 'paid' && isManager;

                return (
                  <Card key={item.id} className={isEditing ? 'border-primary' : ''}>
                    <CardContent className="p-4">
                      {/* Header row */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(item.user?.firstName ?? '', item.user?.lastName ?? '')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{item.user?.firstName} {item.user?.lastName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.staffSalary?.position ?? getRoleLabel(item.user?.role ?? '')}
                              {item.staffSalary?.hourlyRate > 0 && ` · ${formatCurrency(item.staffSalary.hourlyRate)}/soat`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600">{formatCurrency(item.netTotal)}</p>
                          <p className="text-xs text-muted-foreground">netto</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Maosh varaqasini yuklab olish (PDF)"
                            onClick={() => payrollApi.downloadSalarySlip(payrollDetail.id, item.id).catch(() =>
                              toast({ variant: 'destructive', title: 'PDF yuklab olishda xato' })
                            )}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {canEdit && !isEditing && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditItem(item)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Summary row */}
                      <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-2 text-xs">
                        <SumCell label="Asosiy" value={formatCurrency(item.baseSalary)} />
                        <SumCell label="Daraja" value={formatCurrency(item.degreeAllowance ?? 0)} plus />
                        <SumCell label="Sertifikat" value={formatCurrency(item.certificateAllowance ?? 0)} plus />
                        <SumCell label="Dars soat" value={formatCurrency(item.hourlyAmount)} plus />
                        <SumCell label="To'garak" value={formatCurrency(item.extraCurricularAmount ?? 0)} plus />
                        <SumCell label="Mukofot" value={formatCurrency(item.bonuses)} plus />
                        <SumCell label="Jarima+Avans" value={formatCurrency(item.deductions + item.advancePaid)} minus />
                        <SumCell label="Netto" value={formatCurrency(item.netTotal)} bold />
                      </div>

                      {/* Edit form */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Rej. soat (asosiy)</Label>
                              <Input
                                type="number"
                                min={0}
                                className="h-8"
                                value={itemForm.scheduledHours}
                                onChange={e => setItemForm(f => ({ ...f, scheduledHours: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">O'tilgan soat (asosiy)</Label>
                              <Input
                                type="number"
                                min={0}
                                className="h-8"
                                value={itemForm.completedHours}
                                onChange={e => setItemForm(f => ({ ...f, completedHours: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">To'garak soat</Label>
                              <Input
                                type="number"
                                min={0}
                                className="h-8"
                                value={itemForm.extraCurricularHours}
                                onChange={e => setItemForm(f => ({ ...f, extraCurricularHours: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Qo'shimcha mukofot</Label>
                              <Input
                                type="number"
                                min={0}
                                className="h-8"
                                value={itemForm.bonuses}
                                onChange={e => setItemForm(f => ({ ...f, bonuses: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Jarima/ayrilma</Label>
                              <Input
                                type="number"
                                min={0}
                                className="h-8"
                                value={itemForm.deductions}
                                onChange={e => setItemForm(f => ({ ...f, deductions: e.target.value }))}
                              />
                            </div>
                          </div>
                          <Input
                            placeholder="Izoh..."
                            className="h-8 text-sm"
                            value={itemForm.note}
                            onChange={e => setItemForm(f => ({ ...f, note: e.target.value }))}
                          />
                          <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded space-y-0.5">
                            {item.staffSalary?.hourlyRate > 0 && (
                              <p>⚠️ O'tilmagan {Math.max(0, Number(itemForm.scheduledHours) - Number(itemForm.completedHours))} soat → −{formatCurrency(Math.max(0, Number(itemForm.scheduledHours) - Number(itemForm.completedHours)) * item.staffSalary.hourlyRate)} jarima</p>
                            )}
                            {item.staffSalary?.extraCurricularRate > 0 && Number(itemForm.extraCurricularHours) > 0 && (
                              <p>🎯 To'garak {itemForm.extraCurricularHours} soat → +{formatCurrency(Number(itemForm.extraCurricularHours) * item.staffSalary.extraCurricularRate)}</p>
                            )}
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" className="h-7" onClick={() => setEditingItemId(null)}>
                              Bekor
                            </Button>
                            <Button size="sm" className="h-7" onClick={saveItem} disabled={updateItemMutation.isPending}>
                              {updateItemMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                              <Save className="mr-1 h-3 w-3" /> Hisoblash
                            </Button>
                          </div>
                        </div>
                      )}

                      {item.note && !isEditing && (
                        <p className="mt-2 text-xs text-muted-foreground italic">📝 {item.note}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Totals */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Jami brutto</p>
                      <p className="font-bold">{formatCurrency(payrollDetail.totalGross)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Avanslar</p>
                      <p className="font-bold text-orange-600">
                        −{formatCurrency(
                          payrollDetail.items?.reduce((s: number, i: any) => s + i.advancePaid, 0) ?? 0
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Jami netto</p>
                      <p className="font-bold text-green-600">{formatCurrency(payrollDetail.totalNet)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Xodimlar</p>
                      <p className="font-bold">{payrollDetail.items?.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {isManager && (
                <div className="flex gap-2 justify-end pt-2 flex-wrap">
                  {/* Send salary slips via email */}
                  <Button
                    variant="outline"
                    onClick={() => sendSlipsMutation.mutate(payrollDetail.id)}
                    disabled={sendSlipsMutation.isPending}
                  >
                    {sendSlipsMutation.isPending
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yuborilmoqda…</>
                      : <><Mail className="mr-2 h-4 w-4" />Varaqalarni email yuborish</>
                    }
                  </Button>
                  {isAdmin && payrollDetail.status === 'draft' && (
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => approveMutation.mutate(payrollDetail.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Tasdiqlash
                    </Button>
                  )}
                  {payrollDetail.status === 'approved' && (
                    <Button
                      onClick={() => paidMutation.mutate(payrollDetail.id)}
                      disabled={paidMutation.isPending}
                    >
                      {paidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Banknote className="mr-2 h-4 w-4" /> To'landi deb belgilash
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create advance */}
      <Dialog open={advOpen} onOpenChange={setAdvOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Avans so'rash</DialogTitle>
            <DialogDescription>
              Asosiy maoshning 50% gacha avans so'rashingiz mumkin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Oy</Label>
                <Select value={advForm.month} onValueChange={v => setAdvForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Yil</Label>
                <Select value={advForm.year} onValueChange={v => setAdvForm(f => ({ ...f, year: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Miqdor (so'm) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                placeholder="500 000"
                value={advForm.amount}
                onChange={e => setAdvForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sabab</Label>
              <Textarea
                placeholder="Avans sababi..."
                rows={3}
                className="resize-none"
                value={advForm.reason}
                onChange={e => setAdvForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdvOpen(false)}>Bekor</Button>
            <Button
              onClick={() => {
                if (!advForm.amount || Number(advForm.amount) <= 0) {
                  toast({ variant: 'destructive', title: 'Miqdor kiriting' });
                  return;
                }
                createAdvanceMutation.mutate({
                  amount: Number(advForm.amount),
                  reason: advForm.reason || undefined,
                  month: Number(advForm.month),
                  year: Number(advForm.year),
                });
              }}
              disabled={createAdvanceMutation.isPending}
            >
              {createAdvanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Issue advance directly to staff */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xodimga avans berish</DialogTitle>
            <DialogDescription>
              Tanlangan xodimga avans bering. U avtomatik tasdiqlanadi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Xodim <span className="text-destructive">*</span></Label>
              <Select
                value={issueForm.targetUserId}
                onValueChange={v => setIssueForm(f => ({ ...f, targetUserId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Xodim tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {(salaryConfigs as any[]).map((cfg: any) => (
                    <SelectItem key={cfg.userId} value={cfg.userId}>
                      {cfg.user?.firstName} {cfg.user?.lastName} — {getRoleLabel(cfg.user?.role ?? '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Oy</Label>
                <Select value={issueForm.month} onValueChange={v => setIssueForm(f => ({ ...f, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.v} value={String(m.v)}>{m.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Yil</Label>
                <Select value={issueForm.year} onValueChange={v => setIssueForm(f => ({ ...f, year: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Miqdor (so'm) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                placeholder="500 000"
                value={issueForm.amount}
                onChange={e => setIssueForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Izoh/sabab</Label>
              <Textarea
                placeholder="Avans sababi..."
                rows={2}
                className="resize-none"
                value={issueForm.reason}
                onChange={e => setIssueForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIssueOpen(false)}>Bekor</Button>
            <Button
              onClick={() => {
                if (!issueForm.targetUserId) { toast({ variant: 'destructive', title: 'Xodim tanlang' }); return; }
                if (!issueForm.amount || Number(issueForm.amount) <= 0) { toast({ variant: 'destructive', title: 'Miqdor kiriting' }); return; }
                issueAdvanceMutation.mutate({
                  targetUserId: issueForm.targetUserId,
                  amount: Number(issueForm.amount),
                  reason: issueForm.reason || undefined,
                  month: Number(issueForm.month),
                  year: Number(issueForm.year),
                });
              }}
              disabled={issueAdvanceMutation.isPending}
            >
              {issueAdvanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Banknote className="mr-2 h-4 w-4" /> Avans berish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review advance */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? '✅ Avansni tasdiqlash' : '❌ Avansni rad etish'}
            </DialogTitle>
            {reviewTarget && (
              <DialogDescription>
                {reviewTarget.user?.firstName} {reviewTarget.user?.lastName} ·{' '}
                {formatCurrency(reviewTarget.amount)} ·{' '}
                <MonthLabel month={reviewTarget.month} year={reviewTarget.year} />
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 py-2">
            {reviewTarget?.reason && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Sabab:</p>
                <p>{reviewTarget.reason}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea
                rows={2}
                className="resize-none"
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Bekor</Button>
            <Button
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
              onClick={() => reviewAdvanceMutation.mutate({ id: reviewTarget?.id, action: reviewAction, comment: reviewComment || undefined })}
              disabled={reviewAdvanceMutation.isPending}
            >
              {reviewAdvanceMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === 'approve' ? 'Tasdiqlash' : 'Rad etish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color} shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="font-bold text-lg leading-tight truncate">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SumCell({ label, value, plus, minus, bold }: {
  label: string; value: string; plus?: boolean; minus?: boolean; bold?: boolean;
}) {
  return (
    <div className="text-center bg-muted/40 rounded p-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`font-medium text-xs ${bold ? 'text-green-600 font-bold' : minus ? 'text-red-500' : plus ? 'text-green-600' : ''}`}>
        {minus ? '−' : plus ? '+' : ''}{value}
      </p>
    </div>
  );
}
