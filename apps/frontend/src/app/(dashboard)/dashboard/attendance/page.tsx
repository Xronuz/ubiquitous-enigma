'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  CalendarDays, CheckCircle2, XCircle, Clock, AlertCircle,
  Users, CheckCheck, BarChart2, TrendingUp, TrendingDown, FileUp, ClipboardX,
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageShell, PageHeader, PCard, Btn, DS, EmptyCard } from '@/components/ui/page-ui';
import { attendanceApi } from '@/lib/api/attendance';
import { classesApi } from '@/lib/api/classes';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { cn, getScoreColor } from '@/lib/utils';
import { AttendanceStatus } from '@eduplatform/types';
import { ImportDialog } from '@/components/import/import-dialog';

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
  const { user , activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canMark = ['director', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? '');
  const today = format(new Date(), 'yyyy-MM-dd');

  const [selectedClass, setSelectedClass] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Status>>({});
  const [view, setView] = useState<'mark' | 'history'>('mark');

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: classes, isError: classesError } = useQuery<ClassInfo[]>({ queryKey: ['classes', activeBranchId], queryFn: classesApi.getAll });
  const classList: ClassInfo[] = Array.isArray(classes) ? classes : [];

  const { data: classStudents } = useQuery<ClassStudent[]>({
    queryKey: ['class-students', selectedClass, activeBranchId],
    queryFn: () => classesApi.getStudents(selectedClass),
    enabled: !!selectedClass,
  });
  const students = (Array.isArray(classStudents) ? classStudents : []).map(
    (s) => (s.student ?? s) as { id: string; firstName: string; lastName: string },
  );

  // Today's report for current class
  const { data: reportData, isLoading: reportLoading, isError: reportError } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'report', selectedClass, selectedDate, activeBranchId],
    queryFn: () => attendanceApi.getReport({ classId: selectedClass || undefined, startDate: selectedDate, endDate: selectedDate }),
    enabled: !!selectedClass,
  });
  const report: AttendanceRecord[] = Array.isArray(reportData) ? reportData : [];

  // Last 28 days history for heat-map
  const { data: historyData } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'history28', selectedClass, activeBranchId],
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

  if (classesError) {
    return (
      <PageShell>
        <EmptyCard
          icon={<AlertCircle className="h-6 w-6" />}
          title="Ma'lumot yuklanmadi"
          description="Server bilan bog'lanishda xato yuz berdi. Sahifani yangilang yoki keyinroq urinib ko'ring."
        />
      </PageShell>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* View toggle pill */}
      <div className="inline-flex items-center gap-1 rounded-[14px] p-1" style={{ background: 'rgba(0,0,0,0.05)' }}>
        {(['mark', 'history'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="whitespace-nowrap rounded-[10px] px-4 py-1.5 text-[13px] font-semibold transition-all duration-200"
            style={view === v
              ? { background: '#fff', color: DS.text, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }
              : { color: DS.muted }}
          >
            {v === 'mark' ? 'Belgilash' : 'Tarix'}
          </button>
        ))}
      </div>
      {canMark && (
        <Btn variant="secondary" icon={<FileUp className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
          Excel import
        </Btn>
      )}
      {canMark && (
        <Btn variant="secondary" icon={<Users className="h-4 w-4" />} asChild>
          <Link href="/dashboard/attendance/bulk">Guruh davomati</Link>
        </Btn>
      )}
    </div>
  );

  return (
    <PageShell>
      <PageHeader title="Davomat" subtitle="Kunlik davomat belgilash va tahlil" actions={headerActions} />

      {reportError && selectedClass && (
        <div className="flex items-center gap-2 rounded-[14px] border px-4 py-3 text-sm mb-2"
          style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#dc2626' }}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          Davomat ma'lumotlari yuklanmadi — internet aloqangizni tekshiring va qayta urinib ko'ring.
        </div>
      )}

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
                className="whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all duration-200"
                style={active
                  ? { background: DS.primaryLight, color: DS.primary }
                  : { background: '#fff', color: DS.muted, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                {cls.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="date-picker" className="text-sm shrink-0" style={{ color: DS.muted }}>Sana:</Label>
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
        <EmptyCard
          icon={<CalendarDays className="h-6 w-6" />}
          title="Sinf tanlang"
          description="Davomat belgilash yoki tarixni ko'rish uchun yuqoridan sinf tanlang"
        />
      ) : view === 'mark' ? (
        /* ── MARK VIEW ────────────────────────────────────────────────────────── */
        <div className="space-y-4">
          {/* Stats summary */}
          {totalMarked > 0 && (
            <PCard padding="sm">
              <div className="grid grid-cols-4 gap-6 divide-x" style={{ borderColor: DS.border }}>
                <StatCard label="Keldi" value={stats.present} total={totalMarked} color="text-green-600" />
                <div className="pl-6"><StatCard label="Kelmadi" value={stats.absent} total={totalMarked} color="text-red-500" /></div>
                <div className="pl-6"><StatCard label="Kechikdi" value={stats.late} total={totalMarked} color="text-yellow-500" /></div>
                <div className="pl-6"><StatCard label="Uzrli" value={stats.excused} total={totalMarked} color="text-blue-500" /></div>
              </div>
            </PCard>
          )}

          {canMark && (
            <PCard>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                  <p className="text-[15px] font-bold" style={{ color: DS.text }}>Davomat belgilash</p>
                  <p className="text-[13px] mt-0.5" style={{ color: DS.muted }}>
                    {students.length} ta o&apos;quvchi · {selectedDate === today ? 'Bugun' : selectedDate}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {report.length > 0 && (
                    <Btn variant="ghost" onClick={initFromReport}>Avvalgi yuklash</Btn>
                  )}
                  <Btn variant="soft" icon={<CheckCheck className="h-4 w-4" />} onClick={markAllPresent}>
                    Hammasi keldi
                  </Btn>
                  <Btn variant="primary" loading={markMutation.isPending} onClick={handleSubmit} disabled={students.length === 0}>
                    Saqlash
                  </Btn>
                </div>
              </div>
              {reportLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-[16px]" />)}</div>
              ) : students.length === 0 ? (
                <EmptyCard icon={<Users className="h-6 w-6" />} title="Bu sinfda o'quvchilar yo'q" description="Sinfga o'quvchi qo'shish uchun 'Sinflar' bo'limiga o'ting" />
              ) : (
                <div className="space-y-2">
                  {students.map((s: any, idx: number) => {
                    const current: Status = attendanceMap[s.id] ?? 'present';
                    const cfg = STATUS_CONFIG[current];
                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-[16px] px-4 py-2.5 transition-all border-2"
                        style={current !== 'present'
                          ? { borderColor: current === 'absent' ? '#fca5a5' : current === 'late' ? '#fde68a' : '#93c5fd', background: current === 'absent' ? 'rgba(239,68,68,0.04)' : current === 'late' ? 'rgba(234,179,8,0.04)' : 'rgba(59,130,246,0.04)' }
                          : { borderColor: DS.border, background: '#fff' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-[13px] font-mono" style={{ color: DS.muted }}>{idx + 1}</span>
                          <div className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                          <span className="font-semibold text-[14px]" style={{ color: DS.text }}>
                            {s.firstName} {s.lastName}
                          </span>
                          {current !== 'present' && (
                            <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', cfg.color)}
                              style={{ background: current === 'absent' ? 'rgba(239,68,68,0.08)' : current === 'late' ? 'rgba(234,179,8,0.08)' : 'rgba(59,130,246,0.08)' }}>
                              {cfg.label}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([status, c]) => {
                            const Icon = c.icon;
                            const isActive = current === status;
                            return (
                              <button
                                key={status}
                                className={cn('h-8 w-8 flex items-center justify-center rounded-[10px] transition-colors', isActive ? 'bg-slate-800 text-white' : cn('hover:bg-slate-100', c.color))}
                                onClick={() => setStatus(s.id, status)}
                                title={c.label}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </PCard>
          )}

          {/* Today's summary table */}
          {report.length > 0 && (
            <PCard>
              <p className="text-[14px] font-bold mb-3" style={{ color: DS.text }}>
                {selectedDate === today ? 'Bugungi' : selectedDate} hisobot
              </p>
              <div className="space-y-1.5">
                {report.map((r: any) => {
                  const cfg = STATUS_CONFIG[r.status as Status] ?? STATUS_CONFIG.present;
                  return (
                    <div key={r.id} className="flex items-center justify-between text-[13px] py-1.5 border-b last:border-0" style={{ borderColor: DS.border }}>
                      <span className="font-semibold" style={{ color: DS.text }}>{r.student?.firstName} {r.student?.lastName}</span>
                      <div className="flex items-center gap-2">
                        {r.note && <span className="text-xs italic" style={{ color: DS.muted }}>&ldquo;{r.note}&rdquo;</span>}
                        <span className={cn('flex items-center gap-1 text-[12px] font-semibold', cfg.color)}>
                          <cfg.icon className="h-3.5 w-3.5" />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PCard>
          )}
        </div>
      ) : (
        /* ── HISTORY VIEW (Heat-map) ─────────────────────────────────────────── */
        <PCard>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="h-4 w-4" style={{ color: DS.primary }} />
            <p className="text-[15px] font-bold" style={{ color: DS.text }}>So&apos;nggi 28 kun davomati</p>
          </div>
          <p className="text-[12px] mb-4" style={{ color: DS.muted }}>Yashil = yuqori davomat · Qizil = past davomat</p>
          {heatMapData.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" style={{ color: DS.muted }} />
              <p className="text-[13px]" style={{ color: DS.muted }}>Ma&apos;lumot yo&apos;q yoki yuklanmoqda...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr>
                    <th className="text-left py-1 pr-3 font-semibold w-36" style={{ color: DS.muted }}>O&apos;quvchi</th>
                    {Array.from({ length: 28 }, (_, i) => {
                      const d = subDays(new Date(), 27 - i);
                      return (
                        <th key={i} className="px-0.5 text-center font-normal" style={{ color: DS.muted }} title={format(d, 'dd.MM')}>
                          {i % 7 === 0 || i === 27 ? format(d, 'dd') : ''}
                        </th>
                      );
                    })}
                    <th className="text-right pl-3 font-semibold" style={{ color: DS.muted }}>O&apos;rt.</th>
                  </tr>
                </thead>
                <tbody>
                  {heatMapData.map(({ name, days }) => {
                    const valid = days.filter(d => d !== null) as number[];
                    const avg = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                    return (
                      <tr key={name} className="border-t" style={{ borderColor: DS.border }}>
                        <td className="py-1 pr-3 font-semibold truncate max-w-[144px]" style={{ color: DS.text }}>{name}</td>
                        {days.map((d, i) => (
                          <td key={i} className="px-0.5 py-1">
                            <HeatCell pct={d} />
                          </td>
                        ))}
                        <td className="pl-3 text-right font-bold" style={{ color: avg !== null ? getScoreColor(avg) : DS.muted }}>
                          {avg !== null ? `${avg}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Legend */}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t text-[11px]" style={{ borderColor: DS.border, color: DS.muted }}>
                <span>Davomat:</span>
                {[['bg-red-500', '< 40%'], ['bg-orange-400', '40–59%'], ['bg-yellow-400', '60–79%'], ['bg-green-300', '80–94%'], ['bg-green-500', '95–100%']].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-sm ${c} inline-block`} />
                    {l}
                  </span>
                ))}
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-slate-200 inline-block" /> Ma&apos;lumot yo&apos;q
                </span>
              </div>
            </div>
          )}
        </PCard>
      )}
    </PageShell>
  );
}
