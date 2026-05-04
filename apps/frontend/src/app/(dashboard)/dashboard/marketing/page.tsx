'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Megaphone, Users, TrendingUp, TrendingDown, ArrowRight,
  Instagram, Globe, Phone, MapPin, UserPlus, XCircle,
  CheckCircle2, Loader2, BarChart3, PieChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { marketingApi } from '@/lib/api/marketing';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend,
} from 'recharts';

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="h-4 w-4" />,
  TELEGRAM: <Globe className="h-4 w-4" />,
  FACEBOOK: <Globe className="h-4 w-4" />,
  WEBSITE: <Globe className="h-4 w-4" />,
  REFERRAL: <UserPlus className="h-4 w-4" />,
  CALL: <Phone className="h-4 w-4" />,
  WALK_IN: <MapPin className="h-4 w-4" />,
  OTHER: <XCircle className="h-4 w-4" />,
};

const FUNNEL_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#6B7280'];

const SOURCE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];

export default function MarketingDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['marketing', 'dashboard'],
    queryFn: () => marketingApi.getDashboard(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-pink-500" />
          <h1 className="text-2xl font-bold tracking-tight">Marketing Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Leadlar, konversiya va marketing kanallari tahlili
        </p>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Jami leadlar</p>
                  <p className="text-2xl font-bold">{data?.totalLeads ?? 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Yangi (30 kun)</p>
                  <p className="text-2xl font-bold">{data?.newLeads ?? 0}</p>
                </div>
                <UserPlus className="h-8 w-8 text-emerald-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Konvertatsiya</p>
                  <p className="text-2xl font-bold">{data?.conversionRate ?? 0}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">O'quvchiga aylangan</p>
                  <p className="text-2xl font-bold">{data?.convertedLeads ?? 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-violet-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Lead voronkasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              data?.funnel?.map((stage, i) => (
                <div key={stage.status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: FUNNEL_COLORS[i] }} />
                      {stage.label}
                    </span>
                    <span className="font-semibold">{stage.count}</span>
                  </div>
                  <div className="h-8 w-full bg-slate-100 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg transition-all flex items-center justify-end px-2"
                      style={{ width: `${Math.max(stage.percentage, 5)}%`, background: FUNNEL_COLORS[i] }}
                    >
                      <span className="text-white text-xs font-bold">{stage.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Source breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              Manba bo'yicha
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48" />
            ) : data?.topSources && data.topSources.length > 0 ? (
              <div className="space-y-3">
                {data.topSources.map((source, i) => (
                  <div key={source.source} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: SOURCE_COLORS[i] }}>
                      {source.count}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{source.label}</span>
                        <span className="text-muted-foreground">{source.conversionRate}% konversiya</span>
                      </div>
                      <Progress
                        value={Math.min(source.conversionRate, 100)}
                        className="h-1.5 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Megaphone className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p>Ma'lumot yo'q</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Oylik dinamika
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : data?.monthlyTrend && data.monthlyTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="leads" name="Leadlar" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" name="Konvertatsiya" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p>Ma'lumot yo'q</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
