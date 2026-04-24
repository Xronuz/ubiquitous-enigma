'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrint } from '@/hooks/use-print';
import {
  BarChart3, TrendingUp, Users, CheckCircle, AlertTriangle, Download,
  XCircle, Clock, CalendarRange, RefreshCw, Zap, Globe, Target,
  ArrowUpRight, ArrowDownRight, Minus, Building2, ShieldAlert, FileSpreadsheet,
  Filter,
} from 'lucide-react';
import { branchesApi, type Branch } from '@/lib/api/branches';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { paymentsApi } from '@/lib/api/payments';
import { reportsApi } from '@/lib/api/reports';
import {
  analyticsApi, ALERT_CONFIG, SOURCE_LABELS,
  type SchoolPulse, type GlobalFinanceReport,
  type BranchComparisonRow, type MarketingROI, type SmartAlert,
} from '@/lib/api/analytics';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// ── Palette — harmonious indigo/violet/emerald/amber scale ───────────────────
const P = {
  indigo:   '#6366f1',
  violet:   '#8b5cf6',
  sky:      '#0ea5e9',
  emerald:  '#10b981',
  amber:    '#f59e0b',
  rose:     '#f43f5e',
  slate:    '#94a3b8',
  // chart series — all pulled from same hue family
  series: ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#ec4899'],
};

const STATUS_COLOR = { paid: P.emerald, pending: P.amber, overdue: P.rose };
const PIE_COLORS   = [P.emerald, P.rose, P.amber, P.sky];
const MONTH_UZ     = ['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'];

// ── Shared helpers ────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getPreset(preset: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (preset === 'this_month')   return { from: toDateStr(new Date(y, m, 1)),     to: toDateStr(new Date(y, m + 1, 0)) };
  if (preset === 'last_month')   return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  if (preset === 'this_quarter') { const q = Math.floor(m / 3); return { from: toDateStr(new Date(y, q * 3, 1)), to: toDateStr(new Date(y, q * 3 + 3, 0)) }; }
  return { from: toDateStr(new Date(y, 0, 1)), to: toDateStr(new Date(y, 11, 31)) };
}

// ── Custom Recharts Tooltip ───────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-3 shadow-xl text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5 border-b pb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="flex justify-between gap-4" style={{ color: entry.color }}>
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-bold">{formatter ? formatter(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Reusable KPI card ─────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon: Icon, iconBg, iconColor, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  trend?: { dir: 'up' | 'down' | 'flat'; label?: string };
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
            {trend && (
              <div className={`flex items-center gap-1 text-xs font-medium ${
                trend.dir === 'up' ? 'text-emerald-600 dark:text-emerald-400'
                  : trend.dir === 'down' ? 'text-rose-500 dark:text-rose-400'
                  : 'text-slate-500'
              }`}>
                {trend.dir === 'up'   ? <ArrowUpRight className="h-3.5 w-3.5" />
                 : trend.dir === 'down' ? <ArrowDownRight className="h-3.5 w-3.5" />
                 : <Minus className="h-3.5 w-3.5" />}
                {trend.label}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(rows)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ANALYTICS TAB (Premium) ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [months, setMonths] = useState<number>(12);

  const { data: branchList } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn:  () => branchesApi.getAll(),
    staleTime: 5 * 60_000,
  });

  const { data: pulse,      isLoading: pulseLoading  } = useQuery<SchoolPulse>({
    queryKey: ['analytics', 'pulse'],
    queryFn:  () => analyticsApi.getPulse(),
    refetchInterval: 60_000,   // auto-refresh every 60s
  });
  const { data: finance,    isLoading: finLoading    } = useQuery<GlobalFinanceReport>({
    queryKey: ['analytics', 'finance', branchFilter, months],
    queryFn:  () => analyticsApi.getFinance({ months, branchId: branchFilter || undefined }),
  });
  const { data: branches,   isLoading: branchLoading } = useQuery<BranchComparisonRow[]>({
    queryKey: ['analytics', 'branch-comparison'],
    queryFn:  () => analyticsApi.getBranchComparison(),
  });
  const { data: marketing,  isLoading: mktLoading    } = useQuery<MarketingROI>({
    queryKey: ['analytics', 'marketing', branchFilter],
    queryFn:  () => analyticsApi.getMarketingROI(branchFilter || undefined),
  });
  const { data: alerts,     isLoading: alertLoading  } = useQuery<SmartAlert[]>({
    queryKey: ['analytics', 'alerts'],
    queryFn:  () => analyticsApi.getAlerts(),
    refetchInterval: 120_000,
  });

  const handleExport = async (type: 'students' | 'payments' | 'attendance') => {
    setExporting(type);
    try {
      await analyticsApi.downloadExcel(type, branchFilter || undefined);
      toast({ title: 'Excel tayyor!', description: `${type} fayli yuklab olindi.` });
    } catch {
      toast({ title: 'Xatolik', description: 'Excel yuklab olishda muammo.', variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  // ── Pulse ────────────────────────────────────────────────────────────────
  const attendanceRate = pulse?.today.attendanceRate;
  const attTrend = attendanceRate == null ? undefined
    : attendanceRate >= 80 ? { dir: 'up' as const, label: `${attendanceRate}% bugun` }
    : attendanceRate >= 60 ? { dir: 'flat' as const, label: `${attendanceRate}% bugun` }
    : { dir: 'down' as const, label: `${attendanceRate}% bugun` };

  // ── Finance chart data — last 6 months ───────────────────────────────────
  const monthlyChart = useMemo(() => (finance?.monthly ?? []).slice(-months), [finance, months]);

  // ── Branch radar data ────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    if (!branches?.length) return [];
    return branches.map(b => ({
      branch:       b.code || b.branchName.slice(0, 5),
      "O'quvchilar": b.studentCount,
      "O'rt. ball":  b.avgGrade * 10,    // scale to 100
      "Davomat":     b.attendancePct,
      "Konversiya":  b.conversionRate,
    }));
  }, [branches]);

  // ── Marketing funnel chart ───────────────────────────────────────────────
  const funnelChart = useMemo(() =>
    (marketing?.funnelBySource ?? []).slice(0, 6).map(r => ({
      name:  SOURCE_LABELS[r.source]?.label ?? r.source,
      emoji: SOURCE_LABELS[r.source]?.emoji ?? '📋',
      Jami:  r.total,
      "Aylangan": r.converted,
      "Daromad (M)": Math.round(r.estimatedRevenue / 1_000_000),
    })),
  [marketing]);

  const alertCounts = useMemo(() => ({
    danger:  (alerts ?? []).filter(a => a.type === 'danger').length,
    warning: (alerts ?? []).filter(a => a.type === 'warning').length,
    info:    (alerts ?? []).filter(a => a.type === 'info').length,
  }), [alerts]);

  if (pulseLoading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-8">

      {/* ── Report Filter bar ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-4 py-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground mr-1">Filtr:</span>

        {/* Branch selector */}
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="h-8 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Barcha filiallar</option>
          {(branchList ?? []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Months selector */}
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="h-8 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value={3}>3 oy</option>
          <option value={6}>6 oy</option>
          <option value={12}>12 oy</option>
        </select>

        {branchFilter && (
          <button
            onClick={() => setBranchFilter('')}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
          >
            Tozalash
          </button>
        )}
      </div>

      {/* ── Export bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-4 py-3">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-muted-foreground mr-2">Excel eksport:</span>
        {(['students', 'payments', 'attendance'] as const).map((t) => {
          const labels = { students: "O'quvchilar", payments: "To'lovlar", attendance: 'Davomat' };
          return (
            <Button
              key={t}
              variant="outline"
              size="sm"
              disabled={exporting === t}
              onClick={() => handleExport(t)}
              className="h-8 gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting === t ? 'Yuklanmoqda...' : labels[t]}
            </Button>
          );
        })}
      </div>

      {/* ── Pulse KPIs ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" /> Bugungi holat
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            label="Jami o'quvchilar"
            value={pulse?.totalStudents ?? 0}
            sub={`${pulse?.activeBranches ?? 0} ta filialda`}
            icon={Users}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-500"
          />
          <KPICard
            label="Bugungi davomat"
            value={pulse?.today.attendanceRate != null ? `${pulse.today.attendanceRate}%` : '—'}
            sub={`${pulse?.today.present ?? 0} keldi · ${pulse?.today.absent ?? 0} kelmadi`}
            icon={CheckCircle}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
            trend={attTrend}
          />
          <KPICard
            label="Bu oylik kirim"
            value={formatCurrency(pulse?.monthlyRevenue ?? 0)}
            sub={`${pulse?.newLeadsThisWeek ?? 0} yangi lead hafta ichida`}
            icon={TrendingUp}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-500"
          />
          <KPICard
            label="Qarzdorlik"
            value={formatCurrency(pulse?.pendingDebt.amount ?? 0)}
            sub={`${pulse?.pendingDebt.count ?? 0} ta to'lov kutilmoqda`}
            icon={AlertTriangle}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-500"
            trend={
              (pulse?.pendingDebt.count ?? 0) > 50
                ? { dir: 'down', label: 'Yuqori qarzdorlik' }
                : undefined
            }
          />
        </div>
      </section>

      {/* ── Revenue Area Chart + Branch Table ──────────────────────────── */}
      <section className="grid gap-5 lg:grid-cols-5">
        {/* AreaChart — 5/8 width */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Oylik moliyaviy dinamika</CardTitle>
            <CardDescription className="text-xs">So'nggi {months} oy — to'langan / kutilmoqda / kechikkan</CardDescription>
          </CardHeader>
          <CardContent>
            {finLoading ? (
              <Skeleton className="h-[260px] rounded-lg" />
            ) : monthlyChart.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                Ma'lumot yo'q
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={P.emerald} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={P.emerald} stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={P.amber} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={P.amber} stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="gOverdue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={P.rose} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={P.rose} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} width={52} />
                  <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area dataKey="paid"    name="To'langan"    stroke={P.emerald} fill="url(#gPaid)"    strokeWidth={2} dot={false} />
                  <Area dataKey="pending" name="Kutilmoqda"   stroke={P.amber}   fill="url(#gPending)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  <Area dataKey="overdue" name="Kechikkan"    stroke={P.rose}    fill="url(#gOverdue)" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Branch revenue table — 3/8 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Filiallar bo'yicha kirim</CardTitle>
            <CardDescription className="text-xs">So'nggi 12 oy</CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[300px] pr-1">
            {finLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : (finance?.branches ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Ma'lumot yo'q</p>
            ) : (
              <div className="space-y-2">
                {(finance?.branches ?? [])
                  .sort((a, b) => b.totalPaid - a.totalPaid)
                  .map((b, i) => {
                    const max = finance!.branches[0]?.totalPaid || 1;
                    const pct = Math.round((b.totalPaid / max) * 100);
                    return (
                      <div key={b.branchId} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className={`h-2 w-2 rounded-full`} style={{ background: P.series[i % P.series.length] }} />
                            {b.branchName}
                          </span>
                          <span className="font-semibold tabular-nums">{fmt(b.totalPaid)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: P.series[i % P.series.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── Branch Comparison BarChart + Radar ─────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5" /> Filiallar solishtirmasi
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          {/* BarChart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">O'quvchilar & Davomat</CardTitle>
            </CardHeader>
            <CardContent>
              {branchLoading ? (
                <Skeleton className="h-[240px] rounded-lg" />
              ) : (branches ?? []).length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                  Ma'lumot yo'q
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={branches} barSize={20} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                    <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="left"  dataKey="studentCount"  name="O'quvchilar" fill={P.indigo}  radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="attendancePct" name="Davomat %"   fill={P.emerald} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Ranking table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Akademik reyting</CardTitle>
              <CardDescription className="text-xs">O'rtacha ball bo'yicha</CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[280px]">
              {branchLoading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : (branches ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Ma'lumot yo'q</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">Filial</th>
                      <th className="text-center py-2 text-xs font-medium text-muted-foreground">Ball</th>
                      <th className="text-center py-2 text-xs font-medium text-muted-foreground">Davomat</th>
                      <th className="text-center py-2 text-xs font-medium text-muted-foreground">Lead %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(branches ?? []).map((b, i) => (
                      <tr key={b.branchId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold h-5 w-5 rounded-full flex items-center justify-center text-white`}
                              style={{ background: i < 3 ? [P.amber, P.slate, '#cd7f32'][i] : P.slate }}>
                              {b.gradeRank}
                            </span>
                            <span className="font-medium text-xs">{b.branchName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="font-bold text-sm" style={{ color: b.avgGrade >= 70 ? P.emerald : b.avgGrade >= 50 ? P.amber : P.rose }}>
                            {b.avgGrade}
                          </span>
                        </td>
                        <td className="py-2.5 text-center text-xs">{b.attendancePct}%</td>
                        <td className="py-2.5 text-center">
                          <Badge variant={b.conversionRate >= 20 ? 'default' : b.conversionRate >= 10 ? 'secondary' : 'outline'}
                            className="text-xs">{b.conversionRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Marketing ROI ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-2">
          <Target className="h-3.5 w-3.5" /> Marketing ROI
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Funnel BarChart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Manba bo'yicha leadlar</CardTitle>
              <CardDescription className="text-xs">Jami vs aylangan</CardDescription>
            </CardHeader>
            <CardContent>
              {mktLoading ? (
                <Skeleton className="h-[240px] rounded-lg" />
              ) : funnelChart.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
                  Lead ma'lumotlari yo'q
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={funnelChart} barSize={18} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Jami"      fill={P.sky}    radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Aylangan"  fill={P.emerald} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Estimated revenue per source */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Taxminiy daromad (manba bo'yicha)</CardTitle>
              <CardDescription className="text-xs">Aylantirilgan lead × o'rtacha to'lov</CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto max-h-[280px]">
              {mktLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : (marketing?.funnelBySource ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Ma'lumot yo'q</p>
              ) : (
                <div className="space-y-3">
                  {(marketing?.funnelBySource ?? []).map((r, i) => {
                    const max = marketing!.funnelBySource[0]?.estimatedRevenue || 1;
                    const pct = Math.round((r.estimatedRevenue / max) * 100);
                    const src = SOURCE_LABELS[r.source] ?? { label: r.source, emoji: '📋' };
                    return (
                      <div key={r.source} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>{src.emoji}</span>
                            {src.label}
                            <span className="text-muted-foreground">({r.total} lead, {r.conversionRate}%)</span>
                          </span>
                          <span className="font-semibold">{fmt(r.estimatedRevenue)} UZS</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: P.series[i % P.series.length] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground pt-1">
                    O'rtacha to'lov: <span className="font-semibold">{formatCurrency(marketing?.avgPaymentPerStudent ?? 0)}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Smart Alerts ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5" />
          Smart Alerts
          {!alertLoading && (alerts ?? []).length > 0 && (
            <span className="ml-auto flex gap-1.5">
              {alertCounts.danger  > 0 && <Badge variant="destructive" className="text-[10px] h-4 px-1.5">{alertCounts.danger} xavfli</Badge>}
              {alertCounts.warning > 0 && <Badge className="text-[10px] h-4 px-1.5 bg-amber-500 hover:bg-amber-600">{alertCounts.warning} ogohlantirish</Badge>}
              {alertCounts.info    > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{alertCounts.info} ma'lumot</Badge>}
            </span>
          )}
        </h2>

        {alertLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : (alerts ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <p className="text-sm font-medium">Hamma narsa yaxshi!</p>
              <p className="text-xs">Hozircha ogohlantirish yo'q</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {(alerts ?? []).map((alert, i) => {
              const cfg = ALERT_CONFIG[alert.type];
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cfg.bg} ${cfg.border}`}
                >
                  <span className="text-base mt-0.5">{cfg.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-xs font-semibold ${cfg.text}`}>{alert.title}</p>
                      {alert.branchName && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{alert.branchName}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${cfg.text}`}>
                    {alert.type === 'danger' ? '❗' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── ATTENDANCE REPORT TAB ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function AttendanceReport({ dateRange, dateKey }: { dateRange: { from: string; to: string }; dateKey: number }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'attendance', dateRange.from, dateRange.to, dateKey],
    queryFn: () => reportsApi.getAttendance({ from: dateRange.from, to: dateRange.to }),
  });

  const rows: any[] = Array.isArray(report) ? report : [];

  const summary = useMemo(() => {
    if (!rows.length) return { present: 0, absent: 0, late: 0, excused: 0 };
    return rows.reduce(
      (acc, r) => ({
        present: acc.present + (r.present ?? 0),
        absent:  acc.absent  + (r.absent  ?? 0),
        late:    acc.late    + (r.late    ?? 0),
        excused: acc.excused + (r.excused ?? 0),
      }),
      { present: 0, absent: 0, late: 0, excused: 0 },
    );
  }, [rows]);

  const total   = summary.present + summary.absent + summary.late + summary.excused;
  const pieData = [
    { name: 'Keldi',    value: summary.present },
    { name: 'Kelmadi',  value: summary.absent  },
    { name: 'Kechikdi', value: summary.late    },
    { name: 'Uzrli',    value: summary.excused },
  ].filter(d => d.value > 0);

  const ranked = useMemo(() => [...rows].sort((a, b) => {
    const pA = (a.present + a.absent + a.late) > 0 ? a.present / (a.present + a.absent + a.late) : 0;
    const pB = (b.present + b.absent + b.late) > 0 ? b.present / (b.present + b.absent + b.late) : 0;
    return pB - pA;
  }), [rows]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard label="Jami keldi"  value={summary.present} icon={CheckCircle}  iconBg="bg-emerald-500/10" iconColor="text-emerald-500" />
        <KPICard label="Kelmadi"     value={summary.absent}  icon={XCircle}      iconBg="bg-rose-500/10"    iconColor="text-rose-500"    />
        <KPICard label="Kechikdi"    value={summary.late}    icon={Clock}        iconBg="bg-amber-500/10"   iconColor="text-amber-500"   />
        <KPICard
          label="Davomat %"
          value={total > 0 ? `${Math.round((summary.present / total) * 100)}%` : '—'}
          icon={TrendingUp} iconBg="bg-indigo-500/10" iconColor="text-indigo-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {pieData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Davomat taqsimoti</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={4} dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">O'quvchilar reytingi</CardTitle>
            <CardDescription>Davomat bo'yicha</CardDescription>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[280px]">
            {ranked.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">Ma'lumot yo'q</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Ism</th>
                    <th className="text-center py-1.5 font-medium text-emerald-600">✅</th>
                    <th className="text-center py-1.5 font-medium text-rose-500">❌</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row: any, i: number) => {
                    const t   = row.present + row.absent + row.late;
                    const pct = t > 0 ? Math.round((row.present / t) * 100) : 0;
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 font-medium">{row.name}</td>
                        <td className="py-2 text-center text-emerald-600">{row.present}</td>
                        <td className="py-2 text-center text-rose-500">{row.absent}</td>
                        <td className="py-2 text-right">
                          <span className={`font-bold ${pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-500'}`}>
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── GRADES REPORT TAB ─────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function GradesReport({ dateRange, dateKey }: { dateRange: { from: string; to: string }; dateKey: number }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'grades', dateRange.from, dateRange.to, dateKey],
    queryFn: () => reportsApi.getGrades({ from: dateRange.from, to: dateRange.to }),
  });

  const rows: any[] = Array.isArray(report) ? report : [];

  const distribution = useMemo(() => {
    const buckets = [
      { label: '90–100%', min: 90, max: 101, count: 0, color: P.emerald },
      { label: '70–89%',  min: 70, max: 90,  count: 0, color: '#84cc16' },
      { label: '50–69%',  min: 50, max: 70,  count: 0, color: P.amber   },
      { label: '0–49%',   min: 0,  max: 50,  count: 0, color: P.rose    },
    ];
    rows.forEach(g => {
      const pct = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0;
      const b   = buckets.find(b => pct >= b.min && pct < b.max);
      if (b) b.count++;
    });
    return buckets;
  }, [rows]);

  const subjectData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    rows.forEach(g => {
      const name    = g.subject?.name ?? 'Boshqa';
      const pct     = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0;
      const existing = map.get(name) ?? { total: 0, count: 0 };
      map.set(name, { total: existing.total + pct, count: existing.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, avg: Math.round(d.total / d.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, [rows]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {distribution.map(b => (
          <Card key={b.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className="text-2xl font-bold" style={{ color: b.color }}>{b.count}</p>
              <p className="text-xs text-muted-foreground">ta baho</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Baho taqsimoti</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distribution} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Baholar soni" radius={[6, 6, 0, 0]}>
                  {distribution.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {subjectData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Fan bo'yicha o'rtacha (%)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subjectData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `${v}%`} />} />
                  <Bar dataKey="avg" name="O'rtacha" fill={P.indigo} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Batafsil baholar</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">O'quvchi</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Fan</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Tur</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Ball</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((g: any) => {
                    const pct = g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0;
                    return (
                      <tr key={g.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 font-medium">{g.student?.firstName} {g.student?.lastName}</td>
                        <td className="py-2 text-muted-foreground">{g.subject?.name}</td>
                        <td className="py-2 text-center"><Badge variant="outline" className="text-xs">{g.type}</Badge></td>
                        <td className="py-2 text-right">
                          <Badge variant={pct >= 80 ? 'default' : pct >= 60 ? 'secondary' : 'destructive'}>
                            {g.score}/{g.maxScore}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="text-xs text-muted-foreground text-center pt-3">va yana {rows.length - 50} ta...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── FINANCE REPORT TAB ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function FinanceReport({ dateRange, dateKey }: { dateRange: { from: string; to: string }; dateKey: number }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['payments', 'report', dateRange.from, dateRange.to, dateKey],
    queryFn: () => reportsApi.getFinance({ from: dateRange.from, to: dateRange.to }),
  });

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['payments', 'history', 'chart'],
    queryFn: () => paymentsApi.getHistory({ limit: 200 }),
  });

  const monthlyData = useMemo(() => {
    const payments: any[] = historyData?.data ?? [];
    const map = new Map<string, { month: string; paid: number; pending: number; overdue: number }>();
    payments.forEach(p => {
      const d   = new Date(p.createdAt ?? p.dueDate ?? Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lbl = `${MONTH_UZ[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      const ex  = map.get(key) ?? { month: lbl, paid: 0, pending: 0, overdue: 0 };
      if (p.status === 'paid')    ex.paid    += p.amount ?? 0;
      else if (p.status === 'overdue') ex.overdue += p.amount ?? 0;
      else                             ex.pending += p.amount ?? 0;
      map.set(key, ex);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v);
  }, [historyData]);

  if (isLoading || histLoading) return <LoadingSkeleton rows={3} />;

  const totalPaid    = report?.totalPaid    ?? 0;
  const totalPending = report?.totalPending ?? 0;
  const debtors      = report?.debtors      ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Jami to'langan" value={formatCurrency(totalPaid)}    icon={CheckCircle}  iconBg="bg-emerald-500/10" iconColor="text-emerald-500" />
        <KPICard label="Kutilmoqda"     value={formatCurrency(totalPending)} icon={AlertTriangle} iconBg="bg-amber-500/10"   iconColor="text-amber-500"   />
        <KPICard label="Qarzdorlar"     value={`${debtors.length} o'quvchi`} icon={Users}        iconBg="bg-rose-500/10"    iconColor="text-rose-500"    />
      </div>

      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Oylik to'lovlar dinamikasi</CardTitle>
            <CardDescription>So'nggi 6 oy</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : `${Math.round(v / 1000)}K`} />
                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                <Legend />
                <Bar dataKey="paid"    name="To'langan"  fill={STATUS_COLOR.paid}    radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="pending" name="Kutilmoqda" fill={STATUS_COLOR.pending} radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="overdue" name="Kechikkan"  fill={STATUS_COLOR.overdue} radius={[0, 0, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {debtors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Qarzdorlar ro'yxati ({debtors.length} ta)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">O'quvchi</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Summa</th>
                    <th className="text-center py-2 font-medium text-muted-foreground">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.map((d: any, i: number) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 font-medium">{d.student?.firstName} {d.student?.lastName}</td>
                      <td className="py-2.5 text-right font-semibold">{formatCurrency(d.amount)}</td>
                      <td className="py-2.5 text-center">
                        <Badge variant={d.status === 'overdue' ? 'destructive' : 'warning'}>
                          {d.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── PAGE ──────────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const { user }      = useAuthStore();
  const { toast }     = useToast();
  const [activeTab, setActiveTab] = useState<'analytics' | 'attendance' | 'grades' | 'finance'>('analytics');

  const [dateRange, setDateRange] = useState(() => getPreset('this_month'));
  const [dateKey,   setDateKey  ] = useState(0);

  const applyPreset = (preset: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') => {
    setDateRange(getPreset(preset));
    setDateKey(k => k + 1);
  };

  const tabLabels: Record<string, string> = {
    analytics:  'Analytics Dashboard',
    attendance: 'Davomat hisoboti',
    grades:     'Baholar hisoboti',
    finance:    'Moliyaviy hisobot',
  };

  const { printRef, handlePrint } = usePrint({ title: tabLabels[activeTab] });

  const canSeeFinance    = ['school_admin', 'accountant', 'director', 'vice_principal'].includes(user?.role ?? '');
  const canSeeAnalytics  = ['school_admin', 'director', 'vice_principal', 'accountant'].includes(user?.role ?? '');

  type TabKey = 'analytics' | 'attendance' | 'grades' | 'finance';
  const tabs: { key: TabKey; label: string; icon: React.ElementType; premium?: boolean }[] = [
    { key: 'analytics',  label: 'Analytics',  icon: Globe,      premium: true },
    { key: 'attendance', label: 'Davomat',     icon: CheckCircle },
    { key: 'grades',     label: 'Baholar',     icon: TrendingUp  },
    { key: 'finance',    label: 'Moliya',      icon: BarChart3   },
  ].filter(t =>
    (t.key !== 'finance'   || canSeeFinance) &&
    (t.key !== 'analytics' || canSeeAnalytics)
  ) as { key: TabKey; label: string; icon: React.ElementType; premium?: boolean }[];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Hisobotlar
          </h1>
          <p className="text-muted-foreground text-sm">Tahlil, statistika va eksport</p>
        </div>
        {activeTab !== 'analytics' && (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={async () => {
                try {
                  await reportsApi.downloadPdf(
                    activeTab as 'attendance' | 'grades' | 'finance',
                    { from: dateRange.from, to: dateRange.to },
                  );
                } catch {
                  toast({ title: 'Xatolik', description: 'PDF yuklab olishda xatolik.', variant: 'destructive' });
                }
              }}
            >
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Download className="mr-2 h-4 w-4" /> Chop
            </Button>
          </div>
        )}
      </div>

      {/* ── Date range filter bar (hidden on Analytics tab) ─────────────── */}
      {activeTab !== 'analytics' && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-4 py-3">
          <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground font-medium mr-1">Sana oraliq:</span>
          <input
            type="date" value={dateRange.from}
            onChange={(e) => setDateRange(r => ({ ...r, from: e.target.value }))}
            className="h-8 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <input
            type="date" value={dateRange.to}
            onChange={(e) => setDateRange(r => ({ ...r, to: e.target.value }))}
            className="h-8 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <Button variant="default" size="sm" onClick={() => setDateKey(k => k + 1)} className="h-8">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Qo'llash
          </Button>
          <div className="flex gap-1 ml-auto flex-wrap">
            {(['this_month', 'last_month', 'this_quarter', 'this_year'] as const).map((key) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="text-xs px-2.5 py-1 rounded-lg border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                {key === 'this_month' ? 'Bu oy' : key === 'last_month' ? "O'tgan oy" : key === 'this_quarter' ? 'Chorak' : 'Bu yil'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon, premium }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {premium && (
              <span className="ml-0.5 text-[10px] font-bold text-violet-500 bg-violet-500/10 rounded px-1 py-0.5 leading-none">
                PRO
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      <div ref={activeTab !== 'analytics' ? printRef : undefined}>
        {activeTab === 'analytics'  && canSeeAnalytics && <AnalyticsTab />}
        {activeTab === 'attendance' && <AttendanceReport dateRange={dateRange} dateKey={dateKey} />}
        {activeTab === 'grades'     && <GradesReport     dateRange={dateRange} dateKey={dateKey} />}
        {activeTab === 'finance'    && canSeeFinance     && <FinanceReport dateRange={dateRange} dateKey={dateKey} />}
      </div>
    </div>
  );
}
