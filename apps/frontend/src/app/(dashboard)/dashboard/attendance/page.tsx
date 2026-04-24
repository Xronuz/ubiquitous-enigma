'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, AlertCircle,
  Users, CheckCheck, BarChart2, TrendingUp, TrendingDown, FileUp, ClipboardX,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { attendanceApi } from '@/lib/api/attendance';
import { classesApi } from '@/lib/api/classes';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { AttendanceStatus } from '@eduplatform/types';
import { ImportDialog } from '@/components/import/import-dialog';
import { EmptyState } from '@/components/ui/empty-state';

// ── Types (H-10) ─────────────────────────────────────────────────────────────
export interface ClassInfo {
  id: string;
  name: string;
  gradeLevel?: number;
  academicYear?: string;
  _count?: { students: number };
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
  student?: { id: string; firstName: string; lastName: string };
}

export interface ClassStudent {
  id: string;
  studentId: string;
  classId: string;
  student?: { id: string; firstName: string; lastName: string };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  present: { label: 'Keldi', icon: CheckCircle2, color: 'text-green-600', ring: 'ring-green-500 bg-green-50 dark:bg-green-950', dot: 'bg-green-500' },
  absent:  { label: 'Kelmadi', icon: XCircle, color: 'text-red-600', ring: 'ring-red-500 bg-red-50 dark:bg-red-950', dot: 'bg-red-500' },
  late:    { label: 'Kechikdi', icon: Clock, color: 'text-yellow-600', ring: 'ring-yellow-500 bg-yellow-50 dark:bg-yellow-950', dot: 'bg-yellow-500' },
  excused: { label: 'Uzrli', icon: AlertCircle, color: 'text-blue-600', ring: 'ring-blue-500 bg-blue-50 dark:bg-blue-950', dot: 'bg-blue-500' },
} as const;

type Status = keyof typeof STATUS_CONFIG;

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  );
}

// ── Heat-map cell ──────────────────────────────────────────────────────────────
function HeatCell({ pct }: { pct: number | null }) {
  if (pct === null) return <div className="w-6 h-6 rounded-sm bg-muted/30" title="Ma'lumot yo'q" />;
  const bg =
    pct >= 95 ? 'bg-green-500' :
    pct >= 80 ? 'bg-green-300 dark:bg-green-700' :
    pct >= 60 ? 'bg-yellow-400' :
    pct >= 40 ? 'bg-orange-400' : 'bg-red-500';
  return (
    <div
      className={`w-6 h-6 rounded-sm ${bg} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
      title={`${pct}% keldi`}
    />
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canMark = ['school_admin', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? '');
  const today = format(new Date(), 'yyyy-MM-dd');

  const [selectedClass, setSelectedClass] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Status>>({});
  const [view, setView] = useState<'mark' | 'history'>('mark');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: classes, isError: classesError } = useQuery<ClassInfo[]>({ queryKey: ['classes'], queryFn: classesApi.getAll });
  const classList: ClassInfo[] = Array.isArray(classes) ? classes : [];

  const { data: classStudents } = useQuery<ClassStudent[]>({
    queryKey: ['class-students', selectedClass],
    queryFn: () => classesApi.getStudents(selectedClass),
    enabled: !!selectedClass,
  });
  const students = (Array.isArray(classStudents) ? classStudents : []).map(
    (s) => (s.student ?? s) as { id: string; firstName: string; lastName: string },
  );

  // Today's report for current class
  const { data: reportData, isLoading: reportLoading, isError: reportError } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'report', selectedClass, selectedDate],
    queryFn: () => attendanceApi.getReport({ classId: selectedClass || undefined, startDate: selectedDate, endDate: selectedDate }),
    enabled: !!selectedClass,
  });
  const report: AttendanceRecord[] = Array.isArray(reportData) ? reportData : [];

  // Last 28 days history for heat-map
  const { data: historyData } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'history28', selectedClass],
    queryFn: () => attendanceApi.getReport({
      classId: selectedClass || undefined,
      startDate: format(subDays(new Date(), 27), 'yyyy-MM-dd'),
      endDate: today,
    }),
    enabled: !!selectedClass && view === 'history',
  });
  const history: any[] = Array.isArray(historyData) ? historyData : [];

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const markMutation = useMutation({
    mutationFn: attendanceApi.mark,
    // ── Optimistic update: UI reflects changes instantly; rolls back on error ──
    onMutate: async (payload) => {
      const reportKey = ['attendance', 'report', selectedClass, selectedDate];
      // Prevent race: cancel any in-flight refetch of this query
      await queryClient.cancelQueries({ queryKey: reportKey });
      const snapshot = queryClient.getQueryData<AttendanceRecord[]>(reportKey);

      // Build a studentId→status lookup from the submitted entries
      const entryMap = new Map(payload.entries.map((e: any) => [e.studentId, e.status]));

      queryClient.setQueryData<AttendanceRecord[]>(reportKey, (old = []) => {
        // Update existing records; append new ones for students not yet in report
        const updated: AttendanceRecord[] = old.map(r =>
          entryMap.has(r.studentId)
            ? { ...r, status: entryMap.get(r.studentId) as AttendanceRecord['status'] }
            : r,
        );
        entryMap.forEach((status, studentId) => {
          if (!old.some(r => r.studentId === studentId)) {
            updated.push({
              id: `opt-${studentId}`,
              studentId,
              classId: selectedClass,
              date: selectedDate,
              status: status as AttendanceRecord['status'],
            });
          }
        });
        return updated;
      });

      return { snapshot, reportKey };
    },
    onSuccess: () => {
      toast({ title: '✅ Davomat saqlandi' });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any, _vars, context) => {
      // Roll back to snapshot on network/server error
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(context.reportKey, context.snapshot);
      }
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  // ── Computed stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    report.forEach(r => { if (r.status in counts) counts[r.status as Status]++; });
    return counts;
  }, [report]);

  const totalMarked = stats.present + stats.absent + stats.late + stats.excused;

  // ── Heat-map data (last 28 days, ALL students) ────────────────────────────────
  // O(N) not O(N²): pre-build lookup Map then iterate students once.
  // Previously limited to 20 students via slice(0,20) — that bug is now removed.
  const heatMapData = useMemo(() => {
    if (!students.length || !history.length) return [];

    // Step 1: Build lookup  studentId → dateKey → records[]  in one pass
    const lookup = new Map<string, Map<string, AttendanceRecord[]>>();
    for (const r of history) {
      const dateKey = format(new Date(r.date), 'yyyy-MM-dd');
      if (!lookup.has(r.studentId)) lookup.set(r.studentId, new Map());
      const dateMap = lookup.get(r.studentId)!;
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(r);
    }

    // Step 2: Build date axis once
    const last28 = Array.from({ length: 28 }, (_, i) =>
      format(subDays(new Date(), 27 - i), 'yyyy-MM-dd'),
    );

    // Step 3: Map each student using the O(1) lookup (no nested .filter)
    return students.map(s => ({
      name: `${s.firstName} ${s.lastName}`,
      days: last28.map(date => {
        const recs = lookup.get(s.id)?.get(date);
        if (!recs?.length) return null;
        const presentCount = recs.filter(r => r.status === 'present').length;
        return Math.round((presentCount / recs.length) * 100);
      }),
    }));
  }, [students, history]);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleClassSelect = (classId: string) => {
    setSelectedClass(classId);
    setAttendanceMap({});
  };

  // Initialize attendanceMap from today's report
  const initFromReport = () => {
    if (!report.length || !students.length) return;
    const map: Record<string, Status> = {};
    students.forEach(s => { map[s.id] = 'present'; });
    report.forEach(r => { if (r.studentId) map[r.studentId] = r.status as Status; });
    setAttendanceMap(map);
    toast({ title: 'Avvalgi ma\'lumotlar yuklandi' });
  };

  // Mark ALL as present
  const markAllPresent = () => {
    const map: Record<string, Status> = {};
    students.forEach(s => { map[s.id] = 'present'; });
    setAttendanceMap(map);
    toast({ title: `✅ ${students.length} ta o'quvchi "Keldi" deb belgilandi` });
  };

  const setStatus = (studentId: string, status: Status) => {
    setAttendanceMap(p => ({ ...p, [studentId]: status }));
  };

  const handleSubmit = () => {
    if (!selectedClass) return;
    const entries = students.map(s => ({
      studentId: s.id,
      status: (attendanceMap[s.id] ?? 'present') as AttendanceStatus,
    }));
    markMutation.mutate({ classId: selectedClass, date: selectedDate, entries });
  };

  // D-1: isError global banner
  if (classesError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Ma'lumot yuklanmadi"
        description="Server bilan bog'lanishda xato yuz berdi. Sahifani yangilang yoki keyinroq urinib ko'ring."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* D-1: Davomat ma'lumoti yuklanmasa ogohlantirish */}
      {reportError && selectedClass && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Davomat ma'lumotlari yuklanmadi — internet aloqangizni tekshiring va qayta urinib ko'ring.
        </div>
      )}
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Davomat
          </h1>
          <p className="text-muted-foreground">Kunlik davomat belgilash va tahlil</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            {(['mark', 'history'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === v ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'mark' ? '📝 Belgilash' : '📊 Tarix'}
              </button>
            ))}
          </div>
          {canMark && (
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" /> Excel import
            </Button>
          )}
          {canMark && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/attendance/bulk">
                <Users className="mr-2 h-4 w-4" /> Guruh davomati
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="attendance"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['attendance'] })}
      />

      {/* ── Class selector + Date ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          {classList.map((cls: any) => {
            const active = selectedClass === cls.id;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => handleClassSelect(cls.id)}
                className={
                  active
                    ? 'rounded-full px-4 py-1.5 text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 transition-colors'
                    : 'rounded-full px-4 py-1.5 text-sm font-medium bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors'
                }
              >
                {cls.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="date-picker" className="text-sm text-muted-foreground shrink-0">Sana:</Label>
          <Input
            id="date-picker"
            type="date"
            value={selectedDate}
            max={today}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-40 h-8 text-sm"
          />
        </div>
      </div>

      {!selectedClass ? (
        /* ── Empty state ─────────────────────────────────────────────────────── */
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">Sinf tanlang</p>
            <p className="text-sm text-muted-foreground mt-1">Davomat belgilash yoki tarixni ko'rish uchun yuqoridan sinf tanlang</p>
          </CardContent>
        </Card>
      ) : view === 'mark' ? (
        /* ── MARK VIEW ────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Stats summary */}
          {totalMarked > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-6 divide-x divide-border">
                  <StatCard label="Keldi" value={stats.present} total={totalMarked} color="text-green-600" />
                  <div className="pl-6"><StatCard label="Kelmadi" value={stats.absent} total={totalMarked} color="text-red-500" /></div>
                  <div className="pl-6"><StatCard label="Kechikdi" value={stats.late} total={totalMarked} color="text-yellow-500" /></div>
                  <div className="pl-6"><StatCard label="Uzrli" value={stats.excused} total={totalMarked} color="text-blue-500" /></div>
                </div>
              </CardContent>
            </Card>
          )}

          {canMark && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">Davomat belgilash</CardTitle>
                    <CardDescription>
                      {students.length} ta o'quvchi · {selectedDate === today ? 'Bugun' : selectedDate}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {report.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={initFromReport}>
                        Avvalgi yuklash
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-200 hover:bg-green-50" onClick={markAllPresent}>
                      <CheckCheck className="h-4 w-4" />
                      Hammasi keldi
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={markMutation.isPending || students.length === 0}>
                      {markMutation.isPending ? '⏳ Saqlanmoqda...' : '💾 Saqlash'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {reportLoading ? (
                  <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
                ) : students.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Bu sinfda o'quvchilar yo'q"
                    description="Sinfga o'quvchi qo'shish uchun 'Sinflar' bo'limiga o'ting"
                  />
                ) : (
                  <div className="space-y-2">
                    {students.map((s: any, idx: number) => {
                      const current: Status = attendanceMap[s.id] ?? 'present';
                      const cfg = STATUS_CONFIG[current];
                      return (
                        <div
                          key={s.id}
                          className={cn(
                            'flex items-center justify-between rounded-xl border-2 px-4 py-2.5 transition-all',
                            current !== 'present' ? cfg.ring : 'border-border bg-background',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-sm text-muted-foreground font-mono">{idx + 1}</span>
                            <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                            <span className="font-medium text-sm">
                              {s.firstName} {s.lastName}
                            </span>
                            {current !== 'present' && (
                              <Badge variant="outline" className={cn('text-xs', cfg.color)}>
                                {cfg.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([status, c]) => {
                              const Icon = c.icon;
                              return (
                                <Button
                                  key={status}
                                  variant={current === status ? 'default' : 'ghost'}
                                  size="sm"
                                  className={cn('h-8 w-8 p-0 rounded-lg', current !== status && c.color)}
                                  onClick={() => setStatus(s.id, status)}
                                  title={c.label}
                                >
                                  <Icon className="h-4 w-4" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Today's summary table */}
          {report.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  {selectedDate === today ? 'Bugungi' : selectedDate} hisobot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {report.map((r: any) => {
                    const cfg = STATUS_CONFIG[r.status as Status] ?? STATUS_CONFIG.present;
                    return (
                      <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span className="font-medium">{r.student?.firstName} {r.student?.lastName}</span>
                        <div className="flex items-center gap-2">
                          {r.note && <span className="text-xs text-muted-foreground italic">"{r.note}"</span>}
                          <span className={cn('flex items-center gap-1 text-xs font-medium', cfg.color)}>
                            <cfg.icon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* ── HISTORY VIEW (Heat-map) ─────────────────────────────────────────── */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart2 className="h-4 w-4" /> So'nggi 28 kun davomati (heat-map)
              </CardTitle>
              <CardDescription>Yashil = yuqori davomat · Qizil = past davomat</CardDescription>
            </CardHeader>
            <CardContent>
              {heatMapData.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Ma'lumot yo'q yoki yuklanmoqda...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        <th className="text-left py-1 pr-3 font-medium text-muted-foreground w-36">O'quvchi</th>
                        {Array.from({ length: 28 }, (_, i) => {
                          const d = subDays(new Date(), 27 - i);
                          return (
                            <th key={i} className="px-0.5 text-center font-normal text-muted-foreground" title={format(d, 'dd.MM')}>
                              {i % 7 === 0 || i === 27 ? format(d, 'dd') : ''}
                            </th>
                          );
                        })}
                        <th className="text-right pl-3 font-medium text-muted-foreground">O'rt.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {heatMapData.map(({ name, days }) => {
                        const valid = days.filter(d => d !== null) as number[];
                        const avg = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                        return (
                          <tr key={name} className="border-t border-border/30">
                            <td className="py-1 pr-3 font-medium truncate max-w-[144px]">{name}</td>
                            {days.map((d, i) => (
                              <td key={i} className="px-0.5 py-1">
                                <HeatCell pct={d} />
                              </td>
                            ))}
                            <td className="pl-3 text-right font-bold" style={{ color: avg === null ? undefined : avg >= 80 ? '#22c55e' : avg >= 60 ? '#f59e0b' : '#ef4444' }}>
                              {avg !== null ? `${avg}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Legend */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t text-xs text-muted-foreground">
                    <span>Davomat:</span>
                    {[['bg-red-500', '< 40%'], ['bg-orange-400', '40–59%'], ['bg-yellow-400', '60–79%'], ['bg-green-300 dark:bg-green-700', '80–94%'], ['bg-green-500', '95–100%']].map(([c, l]) => (
                      <span key={l} className="flex items-center gap-1">
                        <span className={`w-3 h-3 rounded-sm ${c} inline-block`} />
                        {l}
                      </span>
                    ))}
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-muted/30 inline-block" /> Ma'lumot yo'q
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
