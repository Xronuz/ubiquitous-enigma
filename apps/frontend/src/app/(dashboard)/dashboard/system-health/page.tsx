'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Database, Server, Users, Building2,
  CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Cpu, MemoryStick, Clock, Wifi, WifiOff,
  CreditCard, Bell, Trash2, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client';
import { superAdminApi } from '@/lib/api/super-admin';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { UserRole } from '@eduplatform/types';
import { formatDate } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────────

interface HealthStatus {
  status: 'ok' | 'error';
  info?: {
    database?: { status: string };
    memory_heap?: { status: string };
  };
  error?: Record<string, any>;
  details?: Record<string, any>;
}

interface PlatformStats {
  schoolCount: number;
  userCount: number;
  activeSubscriptions: number;
}

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed?: number;
}

// ── Status indicator ──────────────────────────────────────────────────────────

function StatusDot({ status }: { status: 'ok' | 'error' | 'loading' | 'unknown' }) {
  if (status === 'loading') return <div className="h-2.5 w-2.5 rounded-full bg-muted animate-pulse" />;
  if (status === 'ok') return <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-400/50" />;
  if (status === 'error') return <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-400/50" />;
  return <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, bg, description }: {
  label: string; value: string | number; icon: React.ElementType;
  color: string; bg: string; description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <div className={`p-3 rounded-xl ${bg}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Service status row ────────────────────────────────────────────────────────

function ServiceRow({ name, status, detail }: { name: string; status: 'ok' | 'error' | 'loading' | 'unknown'; detail?: string }) {
  const labels = { ok: 'Ishlayapti', error: 'Xato', loading: 'Tekshirilmoqda...', unknown: 'Noma\'lum' };
  const badgeClasses = {
    ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    loading: 'bg-muted text-muted-foreground',
    unknown: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <StatusDot status={status} />
        <span className="text-sm font-medium">{name}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClasses[status]}`}>
        {labels[status]}
      </span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SystemHealthPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Guard: only super_admin
  useEffect(() => {
    if (user && user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['health'],
    queryFn: (): Promise<HealthStatus> =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001'}/api/v1/health`)
        .then(r => r.json()),
    refetchInterval: 30_000,
    retry: 1,
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['super-admin', 'stats'],
    queryFn: (): Promise<PlatformStats> =>
      apiClient.get('/super-admin/stats').then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: queueStats, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['queue', 'stats'],
    queryFn: (): Promise<QueueStats> =>
      apiClient.get('/notifications/queue-stats').then(r => r.data),
    refetchInterval: 15_000,
    retry: 1,
  });

  const { data: recentSchools } = useQuery({
    queryKey: ['schools', 1, '', 'health'],
    queryFn: () => superAdminApi.getSchools({ page: 1, limit: 5 }),
  });

  const queryClient = useQueryClient();

  const cleanFailedMutation = useMutation({
    mutationFn: () => apiClient.delete('/notifications/queue-failed').then(r => r.data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['queue', 'stats'] });
      refetchQueue();
    },
  });

  const handleRefreshAll = () => {
    setLastRefresh(new Date());
    refetchHealth();
    refetchStats();
    refetchQueue();
  };

  // ── Derived status ─────────────────────────────────────────────────────────

  const dbStatus: 'ok' | 'error' | 'loading' | 'unknown' =
    healthLoading ? 'loading' :
    health?.info?.database?.status === 'up' ? 'ok' :
    health?.status === 'error' ? 'error' : 'unknown';

  const memStatus: 'ok' | 'error' | 'loading' | 'unknown' =
    healthLoading ? 'loading' :
    health?.info?.memory_heap?.status === 'up' ? 'ok' :
    health?.status === 'error' ? 'error' : 'unknown';

  const apiStatus: 'ok' | 'error' | 'loading' | 'unknown' =
    healthLoading ? 'loading' : health?.status === 'ok' ? 'ok' : 'error';

  const overallStatus = [dbStatus, memStatus, apiStatus].some(s => s === 'error') ? 'error'
    : [dbStatus, memStatus, apiStatus].some(s => s === 'loading') ? 'loading'
    : 'ok';

  if (user?.role !== UserRole.SUPER_ADMIN) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Tizim holati
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Platform monitoring va infratuzilma holati
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Yangilangan: {lastRefresh.toLocaleTimeString('uz-UZ')}
          </span>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Yangilash
          </Button>
        </div>
      </div>

      {/* Overall status banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${
        overallStatus === 'ok'
          ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
          : overallStatus === 'error'
          ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
          : 'bg-muted/40 border-border'
      }`}>
        {overallStatus === 'ok' ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        ) : overallStatus === 'error' ? (
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 animate-pulse" />
        )}
        <div>
          <p className={`font-semibold text-sm ${
            overallStatus === 'ok' ? 'text-green-800 dark:text-green-300' :
            overallStatus === 'error' ? 'text-red-800 dark:text-red-300' :
            'text-foreground'
          }`}>
            {overallStatus === 'ok' ? 'Barcha tizimlar ishlayapti'
              : overallStatus === 'error' ? 'Tizimda nosozlik aniqlandi'
              : 'Tizim holati tekshirilmoqda...'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            30 soniyada avtomatik yangilanadi
          </p>
        </div>
      </div>

      {/* ── Platform KPIs ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard
              label="Faol maktablar"
              value={stats?.schoolCount ?? '—'}
              icon={Building2}
              color="text-violet-600"
              bg="bg-violet-500/10"
              description="Aktiv tenant'lar"
            />
            <StatCard
              label="Jami foydalanuvchilar"
              value={stats?.userCount ?? '—'}
              icon={Users}
              color="text-blue-600"
              bg="bg-blue-500/10"
              description="Aktiv hisoblar"
            />
            <StatCard
              label="Faol obunalar"
              value={stats?.activeSubscriptions ?? '—'}
              icon={CreditCard}
              color="text-green-600"
              bg="bg-green-500/10"
              description="To'lov qilayotgan"
            />
            <StatCard
              label="Kutayotgan xabarlar"
              value={queueLoading ? '...' : (queueStats?.waiting ?? '—')}
              icon={Bell}
              color="text-orange-500"
              bg="bg-orange-500/10"
              description={`Aktiv: ${queueStats?.active ?? 0}, Xato: ${queueStats?.failed ?? 0}`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Services status ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Servislar holati
            </CardTitle>
            <CardDescription>Real-time infratuzilma monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceRow name="REST API Server" status={apiStatus} detail="NestJS v10" />
            <ServiceRow name="PostgreSQL 16" status={dbStatus} detail="Prisma ORM" />
            <ServiceRow name="Memory (Heap)" status={memStatus} detail="Max: 512 MB" />
            <ServiceRow
              name="Redis 7 (Cache & Queue)"
              status={queueLoading ? 'loading' : queueStats ? 'ok' : 'unknown'}
              detail="BullMQ + Session store"
            />
            <ServiceRow
              name="Notification Queue"
              status={
                queueLoading ? 'loading' :
                !queueStats ? 'unknown' :
                (queueStats.failed ?? 0) > 10 ? 'error' :
                (queueStats.waiting ?? 0) > 100 ? 'unknown' : 'ok'
              }
              detail={queueStats ? `${queueStats.completed ?? 0} bajarildi` : undefined}
            />
          </CardContent>
        </Card>

        {/* ── Queue details ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Notification Queue holati
              </CardTitle>
              {queueStats && (queueStats.failed ?? 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => cleanFailedMutation.mutate()}
                  disabled={cleanFailedMutation.isPending}
                >
                  {cleanFailedMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5 mr-1" />
                  }
                  Failed tozalash ({queueStats.failed})
                </Button>
              )}
            </div>
            <CardDescription>BullMQ job queue statistikasi</CardDescription>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
              </div>
            ) : !queueStats ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <WifiOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Queue statistikasiga ulanib bo'lmadi
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: 'Kutayotgan', value: queueStats.waiting, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                  { label: 'Bajarilmoqda', value: queueStats.active, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
                  { label: 'Kechiktirilgan', value: queueStats.delayed ?? 0, color: 'text-purple-600', bg: 'bg-purple-500/10' },
                  { label: 'Muvaffaqiyatli', value: queueStats.completed, color: 'text-green-600', bg: 'bg-green-500/10' },
                  { label: 'Xatolik', value: queueStats.failed, color: 'text-red-600', bg: 'bg-red-500/10' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`flex items-center justify-between rounded-lg ${bg} px-3 py-2.5`}>
                    <span className="text-sm font-medium">{label}</span>
                    <span className={`text-lg font-bold ${color}`}>{value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Health check details ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Health Check natijasi
            </CardTitle>
            <CardDescription>GET /api/v1/health</CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(health, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Recent schools ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              So'nggi ro'yxatdan o'tgan maktablar
            </CardTitle>
            <CardDescription>Oxirgi 5 ta tenant</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentSchools?.data?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ma'lumot yo'q</p>
            ) : (
              <div className="space-y-2">
                {recentSchools.data.map((school: any) => (
                  <div key={school.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-2 w-2 rounded-full ${school.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      <div>
                        <p className="font-medium leading-none">{school.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{school.slug}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {school.subscriptionTier ?? 'basic'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(school.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
