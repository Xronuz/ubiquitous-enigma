'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Users, GraduationCap, Calendar, ShieldAlert, ChevronDown, ChevronUp,
  Loader2, Search, Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { aiAnalyticsApi } from '@/lib/api/ai-analytics';
import { cn } from '@/lib/utils';

const RISK_COLORS = {
  LOW:      { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', label: 'Past' },
  MEDIUM:   { bg: 'bg-amber-100',   text: 'text-amber-700',   bar: 'bg-amber-500',   label: "O'rta" },
  HIGH:     { bg: 'bg-orange-100',  text: 'text-orange-700',  bar: 'bg-orange-500',  label: 'Yuqori' },
  CRITICAL: { bg: 'bg-red-100',     text: 'text-red-700',     bar: 'bg-red-500',     label: 'Kritik' },
};

const TREND_ICONS = {
  IMPROVING: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  STABLE:    <Minus className="h-4 w-4 text-slate-400" />,
  DECLINING: <TrendingDown className="h-4 w-4 text-red-500" />,
};

function RiskDistributionCard({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{count} ({pct}%)</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StudentCard({ student, expanded, onToggle }: { student: any; expanded: boolean; onToggle: () => void }) {
  const colors = RISK_COLORS[student.riskLevel as keyof typeof RISK_COLORS];

  return (
    <Card className="overflow-hidden">
      <div className={cn('h-1', colors.bar)} />
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold', colors.bg, colors.text)}>
              {student.riskScore}
            </div>
            <div>
              <p className="font-semibold text-sm">{student.firstName} {student.lastName}</p>
              <p className="text-xs text-muted-foreground">{student.className ?? 'Sinf belgilanmagan'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-[10px]', colors.bg, colors.text)}>
              {colors.label}
            </Badge>
            <button onClick={onToggle} className="p-1 hover:bg-slate-100 rounded">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 pt-3 border-t">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">GPA</p>
                <p className="text-lg font-bold">{student.gpa}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Davomat</p>
                <p className="text-lg font-bold">{student.attendanceRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Uy vazifasi</p>
                <p className="text-lg font-bold">{student.homeworkCompletion}%</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Baho trendi:</span>
              {TREND_ICONS[student.lastGradeTrend as keyof typeof TREND_ICONS]}
              <span className={cn(
                student.lastGradeTrend === 'IMPROVING' ? 'text-emerald-600' :
                student.lastGradeTrend === 'DECLINING' ? 'text-red-600' : 'text-slate-500',
              )}>
                {student.lastGradeTrend === 'IMPROVING' ? 'Yaxshilanmoqda' :
                 student.lastGradeTrend === 'DECLINING' ? 'Yomonlashmoqda' : 'Barqaror'}
              </span>
            </div>

            {student.disciplineIncidents > 0 && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <ShieldAlert className="h-4 w-4" />
                <span>{student.disciplineIncidents} ta intizomiy hodisa (30 kun ichida)</span>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Tavsiyalar
              </p>
              {student.recommendations.map((rec: string, i: number) => (
                <p key={i} className="text-xs bg-slate-50 rounded-lg px-2.5 py-1.5 text-slate-600">
                  {rec}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AiAnalyticsPage() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['ai-analytics', 'dashboard'],
    queryFn: () => aiAnalyticsApi.getDashboard(),
    staleTime: 5 * 60_000,
  });

  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['ai-analytics', 'students'],
    queryFn: () => aiAnalyticsApi.getStudentProfiles(),
    staleTime: 5 * 60_000,
  });

  const filtered = profiles?.filter(s =>
    !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const total = dashboard?.totalStudents ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold tracking-tight">AI Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          O'quvchilar holatini tahlil qilish va risk baholash tizimi
        </p>
      </div>

      {/* Summary cards */}
      {dashLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Jami o'quvchilar</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <Users className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">O'rtacha GPA</p>
                  <p className="text-2xl font-bold">{dashboard?.averages.gpa ?? '—'}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">O'rtacha davomat</p>
                  <p className="text-2xl font-bold">{dashboard?.averages.attendance ?? '—'}%</p>
                </div>
                <Calendar className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Kritik holat</p>
                  <p className="text-2xl font-bold text-red-600">
                    {dashboard?.riskDistribution.critical ?? 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk distribution */}
      {dashboard && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Risk taqsimoti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <RiskDistributionCard label="Past" count={dashboard.riskDistribution.low} total={total} color="bg-emerald-500" />
            <RiskDistributionCard label="O'rta" count={dashboard.riskDistribution.medium} total={total} color="bg-amber-500" />
            <RiskDistributionCard label="Yuqori" count={dashboard.riskDistribution.high} total={total} color="bg-orange-500" />
            <RiskDistributionCard label="Kritik" count={dashboard.riskDistribution.critical} total={total} color="bg-red-500" />
          </CardContent>
        </Card>
      )}

      {/* Student profiles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">O'quvchilar tahlili</h2>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {profilesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p>Ma'lumot topilmadi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((student: any) => (
              <StudentCard
                key={student.studentId}
                student={student}
                expanded={expandedId === student.studentId}
                onToggle={() => setExpandedId(expandedId === student.studentId ? null : student.studentId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
