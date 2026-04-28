'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, CreditCard, Clock, AlertTriangle,
  Banknote, CheckCircle, ArrowUpRight, ArrowDownRight,
  FileText, Wallet, MessageSquare,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { financeApi, FinanceDashboardStats, MonthlyRevenueItem, DebtorItem } from '@/lib/api/finance';
import { TreasuryPanel } from '@/components/finance/treasury-panel';
import { ShiftManager } from '@/components/finance/shift-manager';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} mlrd`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} ming`;
  return amount.toLocaleString('uz-UZ');
}
function fmtFull(amount: number) {
  return amount.toLocaleString('uz-UZ') + ' UZS';
}
function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid:     { label: "To'landi",        color: 'text-green-600 bg-green-50 border-green-200' },
  pending:  { label: 'Kutilmoqda',      color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  overdue:  { label: "Muddati o'tgan",  color: 'text-red-600 bg-red-50 border-red-200' },
  failed:   { label: 'Muvaffaqiyatsiz', color: 'text-red-400 bg-red-50 border-red-100' },
  refunded: { label: 'Qaytarildi',      color: 'text-muted-foreground bg-muted border-border' },
};

const MONTHS_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

type Tab = 'chart' | 'debtors' | 'recent' | 'fees';

// ── Stat Ribbon ───────────────────────────────────────────────────────────────
function StatRibbon({ stats, loading }: { stats?: FinanceDashboardStats; loading: boolean }) {
  const items = [
    {
      label: 'Ushbu oy daromadi',
      value: stats ? fmt(stats.thisMonthRevenue) : '—',
      trend: stats?.revenueGrowth,
      icon: TrendingUp,
      iconCls: 'text-emerald-500',
      bgCls:   'bg-emerald-500/10',
    },
    {
      label: 'Jami daromad',
      value: stats ? fmt(stats.totalRevenue) : '—',
      icon: Wallet,
      iconCls: 'text-blue-500',
      bgCls:   'bg-blue-500/10',
    },
    {
      label: 'Kutilayotgan',
      value: stats ? fmt(stats.pendingAmount) : '—',
      sub: stats ? `${stats.pendingCount} ta` : '',
      icon: Clock,
      iconCls: 'text-amber-500',
      bgCls:   'bg-amber-500/10',
    },
    {
      label: "Muddati o'tgan",
      value: stats ? fmt(stats.overdueAmount) : '—',
      sub: stats ? `${stats.overdueCount} ta` : '',
      icon: AlertTriangle,
      iconCls: 'text-red-500',
      bgCls:   'bg-red-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 shrink-0 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.60)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.80)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', item.bgCls)}>
              <Icon className={cn('h-4.5 w-4.5', item.iconCls)} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] text-muted-foreground">{item.label}</p>
              {loading
                ? <Skeleton className="mt-0.5 h-5 w-20" />
                : <p className="text-[15px] font-bold leading-tight">{item.value}</p>
              }
              {item.trend !== undefined && !loading && (
                <span className={cn(
                  'flex items-center gap-0.5 text-[11px] font-medium',
                  item.trend >= 0 ? 'text-emerald-600' : 'text-red-500',
                )}>
                  {item.trend >= 0
                    ? <ArrowUpRight className="h-3 w-3" />
                    : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(item.trend)}%
                </span>
              )}
              {item.sub && !loading && (
                <span className="text-[11px] text-muted-foreground">{item.sub}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: 'chart',   label: 'Oylik grafik' },
  { id: 'debtors', label: 'Qarzdorlar' },
  { id: 'recent',  label: "So'nggi to'lovlar" },
  { id: 'fees',    label: "To'lov tartiblari" },
];

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-full p-1"
      style={{
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05), 0 0 0 1px rgba(255,255,255,0.8)',
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200',
            active === t.id
              ? 'bg-white text-emerald-700 shadow-md'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/60',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Revenue chart ─────────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: MonthlyRevenueItem[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={22} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.07} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.split(' ')[0]}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => fmt(v)}
          width={64}
        />
        <Tooltip
          formatter={(v: number) => [fmtFull(v), 'Daromad']}
          contentStyle={{ fontSize: 12, borderRadius: 10 }}
        />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.revenue >= maxRev * 0.8 ? '#22c55e' : entry.revenue >= maxRev * 0.4 ? '#3b82f6' : '#94a3b8'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FinanceDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('chart');

  const { data: stats, isLoading: statsLoading } = useQuery<FinanceDashboardStats>({
    queryKey: ['finance', 'dashboard'],
    queryFn: financeApi.getDashboard,
    staleTime: 60_000,
  });

  const { data: monthlyRevenue = [], isLoading: chartLoading } = useQuery<MonthlyRevenueItem[]>({
    queryKey: ['finance', 'monthly-revenue', 12],
    queryFn: () => financeApi.getMonthlyRevenue(12),
    staleTime: 60_000,
  });

  const { data: debtors = [], isLoading: debtorsLoading } = useQuery<DebtorItem[]>({
    queryKey: ['finance', 'debtors'],
    queryFn: financeApi.getDebtors,
    staleTime: 60_000,
  });

  const { data: feeSummary, isLoading: feeLoading } = useQuery({
    queryKey: ['finance', 'fee-summary'],
    queryFn: financeApi.getFeeSummary,
    staleTime: 60_000,
  });

  return (
    // Zero-scroll wrapper: fills available height below header+breadcrumb
    <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 10.5rem)' }}>

      {/* ── Row 1: Header + Tab bar ───────────────────────────────────────── */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Moliyaviy dashboard</h1>
          <p className="text-sm text-muted-foreground">To&apos;lovlar, maoshlar va qarzdorlar</p>
        </div>
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── Row 2: Stat ribbon ────────────────────────────────────────────── */}
      <StatRibbon stats={stats} loading={statsLoading} />

      {/* ── Row 3: Main grid — fills all remaining height ─────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3">

        {/* Left col: Active tab content */}
        <div className="col-span-12 min-h-0 overflow-hidden rounded-2xl lg:col-span-8"
          style={{
            background: 'rgba(255,255,255,0.60)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.82)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          }}
        >
          {/* Chart tab */}
          {activeTab === 'chart' && (
            <div className="flex h-full flex-col p-5">
              <div className="mb-3 shrink-0">
                <p className="text-sm font-semibold">So&apos;nggi 12 oy daromadi</p>
                <p className="text-xs text-muted-foreground">Faqat &quot;paid&quot; statusdagi to&apos;lovlar</p>
              </div>
              <div className="min-h-0 flex-1">
                {chartLoading
                  ? <Skeleton className="h-full w-full rounded-xl" />
                  : monthlyRevenue.length === 0
                    ? (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                        <TrendingDown className="mr-2 h-4 w-4" /> Ma&apos;lumot yo&apos;q
                      </div>
                    )
                    : <RevenueChart data={monthlyRevenue} />
                }
              </div>
            </div>
          )}

          {/* Debtors tab */}
          {activeTab === 'debtors' && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-black/5 px-5 py-3">
                <p className="text-sm font-semibold">Qarzdorlar ro&apos;yxati</p>
                <p className="text-xs text-muted-foreground">Muddati o&apos;tgan yoki kutilayotgan to&apos;lovlar</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {debtorsLoading ? (
                  <div className="space-y-2 p-4">
                    {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                  </div>
                ) : debtors.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mb-3 text-emerald-400 opacity-60" />
                    <p className="font-medium">Barcha to&apos;lovlar vaqtida!</p>
                    <p className="text-xs mt-1 opacity-70">Hozirda qarzdor o&apos;quvchilar yo&apos;q</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/80 backdrop-blur-sm">
                      <tr>
                        {['#', "O'quvchi", 'Sinf', 'Qarzdorlik', "To'lovlar", 'Eng eski', ''].map((h) => (
                          <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground first:w-8 last:w-10">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {debtors.map((d, i) => (
                        <tr key={d.student.id} className="border-t border-black/4 hover:bg-black/[0.02] group transition-colors">
                          <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">{getInitials(d.student.firstName, d.student.lastName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{d.student.firstName} {d.student.lastName}</p>
                                {d.student.phone && <p className="text-[11px] text-muted-foreground">{d.student.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">{d.student.studentClasses?.[0]?.class?.name ?? '—'}</td>
                          <td className="py-2.5 px-4 font-bold text-red-600">{fmt(d.totalDebt)}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{d.payments.length} ta</td>
                          <td className="py-2.5 px-4 text-xs text-muted-foreground">{new Date(d.oldestDue).toLocaleDateString('uz-UZ')}</td>
                          <td className="py-2.5 px-4">
                            <button
                              onClick={() => router.push(`/dashboard/messages?userId=${d.student.id}`)}
                              title="Xabar yuborish"
                              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1.5 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Recent payments tab */}
          {activeTab === 'recent' && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-black/5 px-5 py-3">
                <p className="text-sm font-semibold">So&apos;nggi to&apos;lovlar</p>
                <p className="text-xs text-muted-foreground">Oxirgi 10 ta to&apos;lov operatsiyasi</p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-black/4">
                {statsLoading ? (
                  <div className="space-y-2 p-4">
                    {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                  </div>
                ) : !stats?.recentPayments?.length ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <CreditCard className="h-8 w-8 mb-3 opacity-30" />
                    <p>Hali to&apos;lovlar kiritilmagan</p>
                  </div>
                ) : (
                  stats.recentPayments.map((p) => {
                    const st = STATUS_MAP[p.status] ?? { label: p.status, color: '' };
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-black/[0.02] transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.student.firstName} {p.student.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.description ?? "To'lov"} · {new Date(p.paidAt ?? p.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{fmt(p.amount)}</p>
                          <Badge variant="outline" className={cn('text-[11px]', st.color)}>{st.label}</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Fee structures tab */}
          {activeTab === 'fees' && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-black/5 px-5 py-3">
                <p className="text-sm font-semibold">Faol to&apos;lov tartiblari</p>
                {feeSummary && (
                  <p className="text-xs text-muted-foreground">
                    Jami kutilgan: <span className="font-semibold text-foreground">{fmt(feeSummary.totalExpected)}</span>
                  </p>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {feeLoading ? (
                  <div className="space-y-2 p-4">
                    {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                  </div>
                ) : !feeSummary?.feeStructures?.length ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <FileText className="h-8 w-8 mb-3 opacity-30" />
                    <p>To&apos;lov tartiblari sozlanmagan</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white/80 backdrop-blur-sm">
                      <tr>
                        {['Nomi', 'Daraja', 'Chastota', 'Miqdor'].map((h) => (
                          <th key={h} className="py-2.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {feeSummary.feeStructures.map((f: any) => (
                        <tr key={f.id} className="border-t border-black/4 hover:bg-black/[0.02] transition-colors">
                          <td className="py-2.5 px-4 font-medium">{f.name}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{f.gradeLevel ? `${f.gradeLevel}-sinf` : 'Barchasi'}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant="secondary" className="text-[11px]">
                              {f.frequency === 'monthly' ? 'Oylik' : f.frequency === 'yearly' ? 'Yillik' : f.frequency}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 font-bold">{fmt(f.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right col: Widgets */}
        <div className="col-span-12 flex min-h-0 flex-col gap-3 overflow-y-auto lg:col-span-4">
          {/* Payroll banner */}
          {stats?.latestPayroll && (
            <div
              className="shrink-0 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(168,85,247,0.10)',
                border: '1px solid rgba(168,85,247,0.20)',
              }}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                <Banknote className="h-4 w-4 text-purple-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">
                  {stats.latestPayroll.year}y {MONTHS_UZ[stats.latestPayroll.month - 1]} maoshi
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Jami: <span className="font-bold text-purple-600">{fmt(stats.latestPayroll.totalNet)}</span>
                </p>
              </div>
              <Badge className="shrink-0 bg-purple-100 text-purple-700 border-purple-200 text-[11px]">
                {stats.latestPayroll.status === 'paid' ? "To'langan" : stats.latestPayroll.status}
              </Badge>
            </div>
          )}

          <TreasuryPanel />
          <ShiftManager />

          {/* Active students banner */}
          {stats && (
            <div
              className="shrink-0 flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.18)',
              }}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faol o&apos;quvchilar</p>
                <p className="text-lg font-bold text-blue-600">{stats.totalStudents}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
