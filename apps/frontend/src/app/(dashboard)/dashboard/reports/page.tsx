'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePrint } from '@/hooks/use-print';
import {
  BarChart3, TrendingUp, Users, CheckCircle, AlertTriangle, Download,
  XCircle, Clock, PieChart as PieIcon, CalendarRange, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { paymentsApi } from '@/lib/api/payments';
import { reportsApi } from '@/lib/api/reports';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// ── Palette ───────────────────────────────────────────────────────────────────
const COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  late: '#f59e0b',
  excused: '#3b82f6',
  paid: '#22c55e',
  pending: '#f59e0b',
  overdue: '#ef4444',
  primary: '#6366f1',
  secondary: '#8b5cf6',
};

const PIE_COLORS = [COLORS.present, COLORS.absent, COLORS.late, COLORS.excused];

// ── Month names (UZ) ──────────────────────────────────────────────────────────
const MONTH_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-background/95 backdrop-blur p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: <span className="font-bold">{formatter ? formatter(entry.value) : entry.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color, bg }: {
  label: string; value: string | number; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Attendance Report Tab ─────────────────────────────────────────────────────
function AttendanceReport({ dateRange, dateKey }: { dateRange: { from: string; to: string }; dateKey: number }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'attendance', dateRange.from, dateRange.to, dateKey],
    queryFn: () => reportsApi.getAttendance({ from: dateRange.from, to: dateRange.to }),
  });

  const rows: any[] = Array.isArray(report) ? report : [];

  // Summary aggregation
  const summary = useMemo(() => {
    if (!rows.length) return { present: 0, absent: 0, late: 0, excused: 0 };
    return rows.reduce((acc, r) => ({
      present: acc.present + (r.present ?? 0),
      absent: acc.absent + (r.absent ?? 0),
      late: acc.late + (r.late ?? 0),
      excused: acc.excused + (r.excused ?? 0),
    }), { present: 0, absent: 0, late: 0, excused: 0 });
  }, [rows]);

  const total = summary.present + summary.absent + summary.late + summary.excused;
  const pieData = [
    { name: 'Keldi', value: summary.present },
    { name: 'Kelmadi', value: summary.absent },
    { name: 'Kechikdi', value: summary.late },
    { name: 'Uzrli', value: summary.excused },
  ].filter(d => d.value > 0);

  // Top/bottom attendance students
  const ranked = useMemo(() => [...rows].sort((a, b) => {
    const pctA = (a.present + a.absent + a.late) > 0 ? (a.present / (a.present + a.absent + a.late)) * 100 : 0;
    const pctB = (b.present + b.absent + b.late) > 0 ? (b.present / (b.present + b.absent + b.late)) * 100 : 0;
    return pctB - pctA;
  }), [rows]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KPICard label="Jami keldi" value={summary.present} icon={CheckCircle} color="text-green-500" bg="bg-green-500/10" />
        <KPICard label="Kelmadi" value={summary.absent} icon={XCircle} color="text-red-500" bg="bg-red-500/10" />
        <KPICard label="Kechikdi" value={summary.late} icon={Clock} color="text-yellow-500" bg="bg-yellow-500/10" />
        <KPICard label="Davomat %"
          value={total > 0 ? `${Math.round((summary.present / total) * 100)}%` : '—'}
          icon={TrendingUp} color="text-primary" bg="bg-primary/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pie chart */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Davomat taqsimoti</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top/Bottom students */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">O'quvchilar reytingi</CardTitle>
            <CardDescription>Davomat bo'yicha (yuqori → past)</CardDescription>
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
                    <th className="text-center py-1.5 font-medium text-green-600">✅</th>
                    <th className="text-center py-1.5 font-medium text-red-500">❌</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row: any, i: number) => {
                    const t = row.present + row.absent + row.late;
                    const pct = t > 0 ? Math.round((row.present / t) * 100) : 0;
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 font-medium">{row.name}</td>
                        <td className="py-2 text-center text-green-600">{row.present}</td>
                        <td className="py-2 text-center text-red-500">{row.absent}</td>
                        <td className="py-2 text-right">
                          <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
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

// ── Grades Report Tab ─────────────────────────────────────────────────────────
function GradesReport({ dateRange, dateKey }: { dateRange: { from: string; to: string }; dateKey: number }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['reports', 'grades', dateRange.from, dateRange.to, dateKey],
    queryFn: () => reportsApi.getGrades({ from: dateRange.from, to: dateRange.to }),
  });

  const rows: any[] = Array.isArray(report) ? report : [];

  // Distribution buckets
  const distribution = useMemo(() => {
    const buckets = [
      { label: '90–100%', min: 90, max: 101, count: 0, color: COLORS.present },
      { label: '70–89%', min: 70, max: 90, count: 0, color: '#84cc16' },
      { label: '50–69%', min: 50, max: 70, count: 0, color: COLORS.late },
      { label: '0–49%', min: 0, max: 50, count: 0, color: COLORS.absent },
    ];
    rows.forEach(g => {
      const pct = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0;
      const bucket = buckets.find(b => pct >= b.min && pct < b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [rows]);

  // Subject average bar chart
  const subjectData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    rows.forEach(g => {
      const name = g.subject?.name ?? 'Boshqa';
      const pct = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0;
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
      {/* Grade distribution */}
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
        {/* Distribution BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Baho taqsimoti</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distribution} barSize={44}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
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

        {/* Subject averages */}
        {subjectData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Fan bo'yicha o'rtacha (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={subjectData} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<CustomTooltip formatter={(v: number) => `${v}%`} />} />
                  <Bar dataKey="avg" name="O'rtacha" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Raw table (scrollable) */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Batafsil baholar</CardTitle>
          </CardHeader>
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

// ── Finance Report Tab ────────────────────────────────────────────────────────
function FinanceReport({ dateRange, dateKey }: { dateRange: { from: string; to: string }; dateKey: number }) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['payments', 'report', dateRange.from, dateRange.to, dateKey],
    queryFn: () => reportsApi.getFinance({ from: dateRange.from, to: dateRange.to }),
  });

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['payments', 'history', 'chart'],
    queryFn: () => paymentsApi.getHistory({ limit: 200 }),
  });

  // Aggregate payments by month
  const monthlyData = useMemo(() => {
    const payments: any[] = historyData?.data ?? [];
    const map = new Map<string, { month: string; paid: number; pending: number; overdue: number }>();
    payments.forEach(p => {
      const d = new Date(p.createdAt ?? p.dueDate ?? Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${MONTH_UZ[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      const existing = map.get(key) ?? { month: label, paid: 0, pending: 0, overdue: 0 };
      if (p.status === 'paid') existing.paid += p.amount ?? 0;
      else if (p.status === 'overdue') existing.overdue += p.amount ?? 0;
      else existing.pending += p.amount ?? 0;
      map.set(key, existing);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  }, [historyData]);

  const { toast } = useToast();

  if (isLoading || histLoading) return <LoadingSkeleton />;

  const totalPaid = report?.totalPaid ?? 0;
  const totalPending = report?.totalPending ?? 0;
  const debtors = report?.debtors ?? [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Jami to'langan" value={formatCurrency(totalPaid)} icon={CheckCircle} color="text-green-500" bg="bg-green-500/10" />
        <KPICard label="Kutilmoqda" value={formatCurrency(totalPending)} icon={AlertTriangle} color="text-yellow-500" bg="bg-yellow-500/10" />
        <KPICard label="Qarzdorlar" value={`${debtors.length} o'quvchi`} icon={Users} color="text-red-500" bg="bg-red-500/10" />
      </div>

      {/* Monthly trend */}
      {monthlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Oylik to'lovlar dinamikasi</CardTitle>
            <CardDescription>So'nggi 6 oy</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : `${Math.round(v / 1000)}K`} />
                <Tooltip content={<CustomTooltip formatter={(v: number) => formatCurrency(v)} />} />
                <Legend />
                <Bar dataKey="paid" name="To'langan" fill={COLORS.paid} radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="pending" name="Kutilmoqda" fill={COLORS.pending} radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="overdue" name="Kechikkan" fill={COLORS.overdue} radius={[0, 0, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Debtors table */}
      {debtors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Qarzdorlar ro'yxati ({debtors.length} ta)
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

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
// ── Date range helpers ────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getPreset(preset: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === 'this_month') {
    return { from: toDateStr(new Date(y, m, 1)), to: toDateStr(new Date(y, m + 1, 0)) };
  }
  if (preset === 'last_month') {
    return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(m / 3);
    return { from: toDateStr(new Date(y, q * 3, 1)), to: toDateStr(new Date(y, q * 3 + 3, 0)) };
  }
  // this_year
  return { from: toDateStr(new Date(y, 0, 1)), to: toDateStr(new Date(y, 11, 31)) };
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'attendance' | 'grades' | 'finance'>('attendance');

  // ── Date range filter ──
  const [dateRange, setDateRange] = useState(() => getPreset('this_month'));
  const [dateKey, setDateKey] = useState(0); // increment to re-fetch

  const applyPreset = (preset: 'this_month' | 'last_month' | 'this_quarter' | 'this_year') => {
    setDateRange(getPreset(preset));
    setDateKey((k) => k + 1);
  };

  const tabLabels: Record<string, string> = {
    attendance: 'Davomat hisoboti',
    grades: 'Baholar hisoboti',
    finance: 'Moliyaviy hisobot',
  };

  const { printRef, handlePrint } = usePrint({ title: tabLabels[activeTab] });

  const tabs = [
    { key: 'attendance' as const, label: 'Davomat', icon: CheckCircle },
    { key: 'grades' as const, label: 'Baholar', icon: TrendingUp },
    { key: 'finance' as const, label: 'Moliya', icon: BarChart3 },
  ];

  const canSeeFinance = ['school_admin', 'accountant'].includes(user?.role ?? '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Hisobotlar
          </h1>
          <p className="text-muted-foreground">Tahlil va statistika</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Server-side PDF yuklab olish */}
          <Button
            variant="default"
            onClick={async () => {
              try {
                await reportsApi.downloadPdf(
                  activeTab as 'attendance' | 'grades' | 'finance',
                  { from: dateRange.from, to: dateRange.to },
                );
              } catch {
                alert('PDF yuklab olishda xatolik');
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" /> PDF yuklab olish
          </Button>
          {/* Browser print */}
          <Button variant="outline" onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" /> Chop etish
          </Button>
        </div>
      </div>

      {/* ── Date range filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-4 py-3">
        <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground font-medium mr-1">Sana oraliq:</span>

        {/* From */}
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
          className="h-8 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-muted-foreground text-sm">—</span>
        {/* To */}
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
          className="h-8 rounded-lg border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        {/* Apply button */}
        <Button variant="default" size="sm" onClick={() => setDateKey((k) => k + 1)} className="h-8">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Qo'llash
        </Button>

        {/* Presets */}
        <div className="flex gap-1 ml-auto flex-wrap">
          {([
            { key: 'this_month',   label: 'Bu oy' },
            { key: 'last_month',   label: 'O\'tgan oy' },
            { key: 'this_quarter', label: 'Chorak' },
            { key: 'this_year',    label: 'Bu yil' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="text-xs px-2.5 py-1 rounded-lg border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {tabs.filter(t => t.key !== 'finance' || canSeeFinance).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-background shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* Tab content — printRef wraps the printable area */}
      <div ref={printRef}>
        {activeTab === 'attendance' && <AttendanceReport dateRange={dateRange} dateKey={dateKey} />}
        {activeTab === 'grades' && <GradesReport dateRange={dateRange} dateKey={dateKey} />}
        {activeTab === 'finance' && canSeeFinance && <FinanceReport dateRange={dateRange} dateKey={dateKey} />}
      </div>
    </div>
  );
}
