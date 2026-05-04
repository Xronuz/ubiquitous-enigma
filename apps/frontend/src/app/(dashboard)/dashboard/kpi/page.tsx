'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Target, TrendingUp, Plus, BarChart3, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/store/auth.store';
import { kpiApi } from '@/lib/api/kpi';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  STRATEGY:   { label: 'Strategiya', color: 'bg-blue-100 text-blue-700' },
  ACADEMIC:   { label: "Akademik", color: 'bg-emerald-100 text-emerald-700' },
  TEACHER:    { label: "O'qituvchi", color: 'bg-violet-100 text-violet-700' },
  STUDENT:    { label: "O'quvchi", color: 'bg-amber-100 text-amber-700' },
  MARKETING:  { label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  FINANCE:    { label: 'Moliya', color: 'bg-green-100 text-green-700' },
  OPERATIONS: { label: 'Operatsiya', color: 'bg-cyan-100 text-cyan-700' },
  AI_IT:      { label: 'AI & IT', color: 'bg-indigo-100 text-indigo-700' },
  BRANDING:   { label: 'Brending', color: 'bg-rose-100 text-rose-700' },
  MONITORING: { label: 'Monitoring', color: 'bg-slate-100 text-slate-700' },
};

function KpiCard({ item }: { item: any }) {
  const progress = item.progress ?? 0;
  const isGood = progress >= 100;
  const isWarning = progress >= 70 && progress < 100;
  const isBad = progress < 70;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn('text-[10px] font-medium', CATEGORY_LABELS[item.category]?.color)}>
                {CATEGORY_LABELS[item.category]?.label ?? item.category}
              </Badge>
              <span className="text-xs text-muted-foreground">Maqsad: {item.targetValue}{item.unit}</span>
            </div>
          </div>
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isGood ? 'bg-emerald-100' : isWarning ? 'bg-amber-100' : 'bg-red-100',
          )}>
            {isGood ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> :
             isWarning ? <Minus className="h-4 w-4 text-amber-600" /> :
             <ArrowDownRight className="h-4 w-4 text-red-600" />}
          </div>
        </div>

        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-bold tracking-tight">
            {item.latestValue !== null ? item.latestValue : '—'}
          </span>
          <span className="text-sm text-muted-foreground mb-1">{item.unit}</span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Bajarilish</span>
            <span className={cn(
              'font-semibold',
              isGood ? 'text-emerald-600' : isWarning ? 'text-amber-600' : 'text-red-600',
            )}>
              {progress}%
            </span>
          </div>
          <Progress
            value={Math.min(progress, 100)}
            className={cn(
              'h-2',
              isGood ? '[&>div]:bg-emerald-500' : isWarning ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500',
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}

export default function KpiDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canManage = ['director', 'vice_principal', 'super_admin'].includes(user?.role ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['kpi', 'dashboard'],
    queryFn: () => kpiApi.getDashboard(),
    staleTime: 60_000,
  });

  const categories = data?.byCategory ? Object.entries(data.byCategory) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kalit ko'rsatkichlar va monitoring tizimi
          </p>
        </div>
        {canManage && (
          <Button onClick={() => router.push('/dashboard/kpi/metrics/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Yangi KPI
          </Button>
        )}
      </div>

      {/* Summary stats */}
      {!isLoading && data?.metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Jami KPI</p>
              <p className="text-2xl font-bold">{data.metrics.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Maqsadga yetgan</p>
              <p className="text-2xl font-bold text-emerald-600">
                {data.metrics.filter(m => (m.progress ?? 0) >= 100).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Ogohlantirish</p>
              <p className="text-2xl font-bold text-amber-600">
                {data.metrics.filter(m => {
                  const p = m.progress ?? 0;
                  return p >= 70 && p < 100;
                }).length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Muammoli</p>
              <p className="text-2xl font-bold text-red-600">
                {data.metrics.filter(m => (m.progress ?? 0) < 70).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categories */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Target className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">KPI metrikalar yo'q</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Hozircha hech qanday KPI metrika kiritilmagan. Yangi metrika qo'shishni boshlang.
          </p>
          {canManage && (
            <Button className="mt-4" onClick={() => router.push('/dashboard/kpi/metrics/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Yangi KPI qo'shish
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  {CATEGORY_LABELS[category]?.label ?? category}
                </h2>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item: any) => (
                  <KpiCard key={item.metricId} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
