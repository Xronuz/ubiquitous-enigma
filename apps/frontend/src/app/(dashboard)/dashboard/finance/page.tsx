'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, CreditCard, Clock, AlertTriangle,
  Users, Banknote, CheckCircle, ArrowUpRight, ArrowDownRight,
  BarChart2, FileText, Wallet, MessageSquare,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { financeApi, FinanceDashboardStats, MonthlyRevenueItem, DebtorItem } from '@/lib/api/finance';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatUZS(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} mlrd`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} ming`;
  return amount.toLocaleString('uz-UZ');
}

function formatFullUZS(amount: number) {
  return amount.toLocaleString('uz-UZ') + ' UZS';
}

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid:     { label: "To'landi",        color: 'text-green-600 bg-green-50 border-green-200' },
  pending:  { label: 'Kutilmoqda',      color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
  overdue:  { label: "Muddati o'tgan",  color: 'text-red-600 bg-red-50 border-red-200' },
  failed:   { label: 'Muvaffaqiyatsiz', color: 'text-red-400 bg-red-50 border-red-100' },
  refunded: { label: 'Qaytarildi',      color: 'text-muted-foreground bg-muted border-border' },
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPI({
  label, value, sub, icon: Icon, iconColor, iconBg, trend, trendLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trend?: number;
  trendLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            {trend !== undefined && trendLabel && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium mt-1',
                trend >= 0 ? 'text-green-600' : 'text-red-500',
              )}>
                {trend >= 0
                  ? <ArrowUpRight className="h-3.5 w-3.5" />
                  : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(trend)}% {trendLabel}
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function KPISkeleton() {
  return (
    <Card>
      <CardContent className="p-5 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

// ── Revenue bar chart ─────────────────────────────────────────────────────────
function RevenueChart({ data }: { data: MonthlyRevenueItem[] }) {
  const maxRev = Math.max(...data.map(d => d.revenue), 1);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.split(' ')[0]}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => formatUZS(v)}
          width={70}
        />
        <Tooltip
          formatter={(v: number) => [formatFullUZS(v), "Daromad"]}
          labelStyle={{ fontSize: 12 }}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="revenue" name="Daromad" radius={[6, 6, 0, 0]}>
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
  const [chartMonths] = useState(12);

  const { data: stats, isLoading: statsLoading } = useQuery<FinanceDashboardStats>({
    queryKey: ['finance', 'dashboard'],
    queryFn: financeApi.getDashboard,
    staleTime: 60_000,
  });

  const { data: monthlyRevenue = [], isLoading: chartLoading } = useQuery<MonthlyRevenueItem[]>({
    queryKey: ['finance', 'monthly-revenue', chartMonths],
    queryFn: () => financeApi.getMonthlyRevenue(chartMonths),
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" /> Moliyaviy dashboard
        </h1>
        <p className="text-muted-foreground">
          To&apos;lovlar, maoshlar va qarzdorlar — real vaqtli xulosa
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => <KPISkeleton key={i} />)
        ) : stats ? (
          <>
            <KPI
              label="Ushbu oy daromadi"
              value={formatUZS(stats.thisMonthRevenue)}
              sub={`${stats.totalPayments} ta to'lov jami`}
              icon={TrendingUp}
              iconColor="text-green-500"
              iconBg="bg-green-500/10"
              trend={stats.revenueGrowth}
              trendLabel="o'tgan oyga nisbatan"
            />
            <KPI
              label="Jami daromad"
              value={formatUZS(stats.totalRevenue)}
              sub="Barcha vaqt uchun"
              icon={Wallet}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
            />
            <KPI
              label="Kutilayotgan to'lovlar"
              value={formatUZS(stats.pendingAmount)}
              sub={`${stats.pendingCount} ta to'lov`}
              icon={Clock}
              iconColor="text-yellow-500"
              iconBg="bg-yellow-500/10"
            />
            <KPI
              label="Muddati o'tgan"
              value={formatUZS(stats.overdueAmount)}
              sub={`${stats.overdueCount} ta to'lov`}
              icon={AlertTriangle}
              iconColor="text-red-500"
              iconBg="bg-red-500/10"
            />
          </>
        ) : null}
      </div>

      {/* Latest payroll banner */}
      {stats?.latestPayroll && (
        <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/10">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-purple-500/10">
              <Banknote className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium">
                So&apos;nggi tasdiqlangan maosh — {stats.latestPayroll.year} yil{' '}
                {['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'][stats.latestPayroll.month - 1]}
              </p>
              <p className="text-xs text-muted-foreground">
                Jami to&apos;landi: <span className="font-bold text-purple-600">{formatFullUZS(stats.latestPayroll.totalNet)}</span>
              </p>
            </div>
            <Badge className="ml-auto bg-purple-100 text-purple-700 border-purple-200">
              {stats.latestPayroll.status === 'paid' ? 'To\'langan' : stats.latestPayroll.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Oylik grafik
          </TabsTrigger>
          <TabsTrigger value="debtors">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Qarzdorlar ({debtors.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            <CreditCard className="mr-1.5 h-3.5 w-3.5" /> So&apos;nggi to&apos;lovlar
          </TabsTrigger>
          <TabsTrigger value="fees">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> To&apos;lov tartiblari
          </TabsTrigger>
        </TabsList>

        {/* ── Monthly revenue chart ─────────────────────────────────────────── */}
        <TabsContent value="chart" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                So&apos;nggi {chartMonths} oy daromadi
              </CardTitle>
              <CardDescription>
                Faqat &quot;paid&quot; statusdagi to&apos;lovlar hisoblanadi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : monthlyRevenue.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  <TrendingDown className="mr-2 h-4 w-4" /> Ma&apos;lumot yo&apos;q
                </div>
              ) : (
                <RevenueChart data={monthlyRevenue} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Debtors ───────────────────────────────────────────────────────── */}
        <TabsContent value="debtors" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Qarzdorlar ro&apos;yxati
              </CardTitle>
              <CardDescription>
                Muddati o&apos;tgan yoki kutilayotgan to&apos;lovlar bo&apos;yicha
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {debtorsLoading ? (
                <div className="p-4 space-y-3">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : debtors.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-60" />
                  <p className="font-medium">Barcha to&apos;lovlar vaqtida amalga oshirilgan!</p>
                  <p className="text-sm mt-1 opacity-70">Hozirda qarzdor o&apos;quvchilar yo&apos;q</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">#</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">O&apos;quvchi</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Sinf</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Qarzdorlik</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">To&apos;lovlar</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Eng eski</th>
                        <th className="py-3 px-4 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {debtors.map((d, i) => (
                        <tr key={d.student.id} className="border-t hover:bg-muted/30 transition-colors group">
                          <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs">
                                  {getInitials(d.student.firstName, d.student.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{d.student.firstName} {d.student.lastName}</p>
                                {d.student.phone && (
                                  <p className="text-xs text-muted-foreground">{d.student.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {d.student.studentClasses?.[0]?.class?.name ?? '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-red-600">{formatUZS(d.totalDebt)}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {d.payments.length} ta
                          </td>
                          <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                            {new Date(d.oldestDue).toLocaleDateString('uz-UZ')}
                          </td>
                          {/* H-7: Tezkor xabar tugmasi */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => router.push(`/dashboard/messages?userId=${d.student.id}`)}
                              title="O'quvchiga xabar yuborish"
                              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Recent payments ───────────────────────────────────────────────── */}
        <TabsContent value="recent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">So&apos;nggi to&apos;lovlar</CardTitle>
              <CardDescription>Oxirgi 10 ta to&apos;lov operatsiyasi</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {statsLoading ? (
                <div className="p-4 space-y-3">
                  {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !stats?.recentPayments?.length ? (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>Hali to&apos;lovlar kiritilmagan</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentPayments.map((p) => {
                    const st = PAYMENT_STATUS_MAP[p.status] ?? { label: p.status, color: '' };
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {p.student.firstName} {p.student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.description ?? 'To\'lov'}
                            {' · '}
                            {new Date(p.paidAt ?? p.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{formatUZS(p.amount)}</p>
                          <Badge variant="outline" className={`text-xs ${st.color}`}>
                            {st.label}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Fee structures summary ────────────────────────────────────────── */}
        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Faol to&apos;lov tartiblari</CardTitle>
              <CardDescription>
                Maktabdagi faol to&apos;lov rejalari xulosa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feeLoading ? (
                <div className="space-y-3">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : !feeSummary?.feeStructures?.length ? (
                <div className="py-14 text-center text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p>To&apos;lov tartiblari sozlanmagan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium text-muted-foreground">Jami kutilgan (faol tartiblar)</span>
                    <span className="font-bold text-lg">{formatUZS(feeSummary.totalExpected)}</span>
                  </div>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Nomi</th>
                          <th className="text-center py-2.5 px-4 font-medium text-muted-foreground">Daraja</th>
                          <th className="text-center py-2.5 px-4 font-medium text-muted-foreground">Chastota</th>
                          <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Miqdor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feeSummary.feeStructures.map((f: any) => (
                          <tr key={f.id} className="border-t hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-4 font-medium">{f.name}</td>
                            <td className="py-2.5 px-4 text-center text-muted-foreground">
                              {f.gradeLevel ? `${f.gradeLevel}-sinf` : 'Barchasi'}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge variant="secondary" className="text-xs">
                                {f.frequency === 'monthly' ? 'Oylik' : f.frequency === 'yearly' ? 'Yillik' : f.frequency}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold">
                              {formatUZS(f.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Students summary */}
      {stats && (
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Faol o&apos;quvchilar</p>
              <p className="text-xs text-muted-foreground">Maktabda ro&apos;yxatdan o&apos;tgan</p>
            </div>
            <div className="ml-auto text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
