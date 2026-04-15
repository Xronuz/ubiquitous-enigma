'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Plus, Loader2, Trash2, LayoutGrid, List, AlertTriangle, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { scheduleApi } from '@/lib/api/schedule';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { DayOfWeek } from '@eduplatform/types';
import { ImportDialog } from '@/components/import/import-dialog';

const DAYS: { key: DayOfWeek; label: string; short: string }[] = [
  { key: DayOfWeek.MONDAY,    label: 'Dushanba',   short: 'Du' },
  { key: DayOfWeek.TUESDAY,   label: 'Seshanba',   short: 'Se' },
  { key: DayOfWeek.WEDNESDAY, label: 'Chorshanba', short: 'Ch' },
  { key: DayOfWeek.THURSDAY,  label: 'Payshanba',  short: 'Pa' },
  { key: DayOfWeek.FRIDAY,    label: 'Juma',       short: 'Ju' },
  { key: DayOfWeek.SATURDAY,  label: 'Shanba',     short: 'Sh' },
];

const SLOT_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: '08:00', end: '08:45' },
  2: { start: '09:00', end: '09:45' },
  3: { start: '10:00', end: '10:45' },
  4: { start: '11:00', end: '11:45' },
  5: { start: '12:00', end: '12:45' },
  6: { start: '13:00', end: '13:45' },
  7: { start: '14:00', end: '14:45' },
};

// 10 distinct colors for subjects
const SUBJECT_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-200',
  'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/40 dark:border-green-700 dark:text-green-200',
  'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-200',
  'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/40 dark:border-orange-700 dark:text-orange-200',
  'bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/40 dark:border-pink-700 dark:text-pink-200',
  'bg-teal-100 border-teal-300 text-teal-800 dark:bg-teal-900/40 dark:border-teal-700 dark:text-teal-200',
  'bg-indigo-100 border-indigo-300 text-indigo-800 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-200',
  'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-200',
  'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-200',
  'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-900/40 dark:border-cyan-700 dark:text-cyan-200',
];

const EMPTY = {
  classId: '', subjectId: '', teacherId: '', dayOfWeek: '' as DayOfWeek | '',
  timeSlot: '', startTime: '08:00', endTime: '08:45', roomNumber: '',
};

// ─── Weekly Grid View ─────────────────────────────────────────────────────────
function WeeklyGrid({
  schedule, canManage, onDelete, onAdd,
}: {
  schedule: any[];
  canManage: boolean;
  onDelete: (id: string) => void;
  onAdd: (day: DayOfWeek, slot: number) => void;
}) {
  // Map subjectId → color index
  const subjectColorMap = new Map<string, number>();
  let colorIdx = 0;
  for (const s of schedule) {
    if (s.subjectId && !subjectColorMap.has(s.subjectId)) {
      subjectColorMap.set(s.subjectId, colorIdx++ % SUBJECT_COLORS.length);
    }
  }

  const getSlot = (day: DayOfWeek, slot: number) =>
    schedule.filter((s) => s.dayOfWeek === day && s.timeSlot === slot);

  const todayKey = DAYS[new Date().getDay() === 0 ? 4 : new Date().getDay() - 1]?.key;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {/* Time column header */}
          <div className="flex items-center justify-center text-xs font-medium text-muted-foreground py-2">
            Soat
          </div>
          {DAYS.map(({ key, label, short }) => (
            <div
              key={key}
              className={`text-center py-2 rounded-lg text-sm font-semibold ${
                key === todayKey ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'
              }`}
            >
              <span className="hidden sm:block">{label}</span>
              <span className="sm:hidden">{short}</span>
            </div>
          ))}
        </div>

        {/* Slot rows */}
        {[1, 2, 3, 4, 5, 6, 7].map((slot) => (
          <div key={slot} className="grid grid-cols-7 gap-1 mb-1">
            {/* Time label */}
            <div className="flex flex-col items-center justify-center py-2 px-1">
              <span className="text-xs font-bold text-muted-foreground">{slot}</span>
              <span className="text-[10px] text-muted-foreground">{SLOT_TIMES[slot].start}</span>
            </div>

            {/* Day cells */}
            {DAYS.map(({ key: day }) => {
              const cells = getSlot(day, slot);
              const isToday = day === todayKey;

              if (cells.length === 0) {
                return (
                  <div
                    key={day}
                    onClick={() => canManage && onAdd(day, slot)}
                    className={`min-h-[72px] rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors group
                      ${isToday ? 'border-primary/20 bg-primary/5' : 'border-muted hover:border-primary/30 hover:bg-muted/30'}
                      ${canManage ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    {canManage && (
                      <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                );
              }

              // Flag conflict: same teacher or same room in same day+slot
              const hasConflict = cells.length > 1;
              const teacherIds = cells.map((c: any) => c.teacherId).filter(Boolean);
              const roomNums = cells.map((c: any) => c.roomNumber).filter(Boolean);
              const teacherConflict = new Set(teacherIds).size < teacherIds.length;
              const roomConflict = new Set(roomNums).size < roomNums.length;

              return (
                <div key={day} className="space-y-1">
                  {hasConflict && (
                    <div className="flex items-center gap-1 rounded px-1 py-0.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
                      <AlertTriangle className="h-2.5 w-2.5 text-red-500 shrink-0" />
                      <span className="text-[9px] text-red-600 dark:text-red-400 font-medium leading-tight">
                        {teacherConflict ? "O'qituvchi ziddiyati" : roomConflict ? 'Xona ziddiyati' : 'Ziddiyat'}
                      </span>
                    </div>
                  )}
                  {cells.map((cell: any) => {
                    const cIdx = subjectColorMap.get(cell.subjectId) ?? 0;
                    const colorCls = SUBJECT_COLORS[cIdx];
                    return (
                      <div
                        key={cell.id}
                        className={`relative rounded-lg border p-2 text-xs group transition-shadow hover:shadow-md ${colorCls} ${hasConflict ? 'ring-1 ring-red-400 dark:ring-red-600' : ''}`}
                      >
                        <p className="font-semibold truncate">{cell.subject?.name}</p>
                        <p className="opacity-70 truncate">{cell.class?.name}</p>
                        {cell.roomNumber && (
                          <p className="opacity-60 text-[10px]">Xona: {cell.roomNumber}</p>
                        )}
                        {canManage && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(cell.id); }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        {subjectColorMap.size > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
            {Array.from(subjectColorMap.entries()).map(([subjectId, idx]) => {
              const s = schedule.find((x) => x.subjectId === subjectId);
              if (!s) return null;
              return (
                <div key={subjectId} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${SUBJECT_COLORS[idx]}`}>
                  <span className="font-medium">{s.subject?.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({
  schedule, activeDay, onDayChange, canManage, onDelete,
}: {
  schedule: any[];
  activeDay: DayOfWeek;
  onDayChange: (d: DayOfWeek) => void;
  canManage: boolean;
  onDelete: (id: string) => void;
}) {
  const LIST_COLORS = [
    'bg-blue-100 dark:bg-blue-900/40',
    'bg-green-100 dark:bg-green-900/40',
    'bg-purple-100 dark:bg-purple-900/40',
    'bg-orange-100 dark:bg-orange-900/40',
    'bg-pink-100 dark:bg-pink-900/40',
  ];

  const slots = schedule
    .filter((s: any) => s.dayOfWeek === activeDay)
    .sort((a: any, b: any) => a.timeSlot - b.timeSlot);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {DAYS.map(({ key, label }) => {
          const count = schedule.filter((s: any) => s.dayOfWeek === key).length;
          return (
            <Button key={key} variant={activeDay === key ? 'default' : 'outline'} size="sm" onClick={() => onDayChange(key)} className="relative">
              {label}
              {count > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{count}</Badge>}
            </Button>
          );
        })}
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p>Bu kun uchun darslar yo'q</p>
            {canManage && <p className="text-sm mt-1">Yuqoridagi "Dars qo'shish" tugmasini bosing</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {slots.map((slot: any, idx: number) => (
            <div key={slot.id} className={`flex items-center gap-4 rounded-xl p-4 ${LIST_COLORS[idx % LIST_COLORS.length]}`}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/50 dark:bg-black/20 font-bold text-lg">
                {slot.timeSlot}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{slot.subject?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {slot.class?.name}
                  {slot.subject?.teacher && <> · {slot.subject.teacher.firstName} {slot.subject.teacher.lastName}</>}
                </p>
              </div>
              <div className="text-right text-sm flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {slot.startTime} – {slot.endTime}
                  </div>
                  {slot.roomNumber && <p className="text-xs text-muted-foreground">Xona: {slot.roomNumber}</p>}
                </div>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(slot.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Student Schedule View ────────────────────────────────────────────────────
function StudentScheduleView() {
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const { data: classes = [], isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  // Auto-select first class when loaded
  const classId = selectedClassId || (classes as any[])[0]?.id || '';

  const { data: weekData, isLoading: schedLoading } = useQuery({
    queryKey: ['schedule', 'week', classId],
    queryFn: () => scheduleApi.getWeek(classId),
    enabled: !!classId,
    select: (data: any) => (Array.isArray(data) ? data : []),
  });

  const schedule: any[] = weekData ?? [];

  // Subject color map
  const subjectColorMap = new Map<string, number>();
  let colorIdx = 0;
  for (const s of schedule) {
    const sid = s.subjectId ?? s.subject?.id;
    if (sid && !subjectColorMap.has(sid)) {
      subjectColorMap.set(sid, colorIdx++ % SUBJECT_COLORS.length);
    }
  }

  const todayKey = (() => {
    const i = new Date().getDay();
    return DAYS[i === 0 ? 4 : i - 1]?.key ?? DayOfWeek.MONDAY;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dars jadvali</h1>
          <p className="text-muted-foreground">Haftalik dars jadvali</p>
        </div>
        {(classes as any[]).length > 1 && (
          <Select value={classId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sinf tanlang..." />
            </SelectTrigger>
            <SelectContent>
              {(classes as any[]).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {classesLoading || schedLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : schedule.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Bu sinf uchun dars jadvali tuzilmagan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {DAYS.map(({ key: day, label }) => {
            const daySlots = [...schedule.filter(s => s.dayOfWeek === day)]
              .sort((a, b) => (a.timeSlot ?? 0) - (b.timeSlot ?? 0));
            if (daySlots.length === 0) return null;
            const isToday = day === todayKey;
            return (
              <Card key={day} className={isToday ? 'border-primary shadow-sm' : ''}>
                <CardHeader className="py-3 px-4 flex flex-row items-center gap-2">
                  <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                  {isToday && (
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Bugun</Badge>
                  )}
                  <Badge variant="secondary" className="text-xs ml-auto">{daySlots.length} dars</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {daySlots.map((slot: any) => {
                      const sid = slot.subjectId ?? slot.subject?.id ?? '';
                      const colorClass = SUBJECT_COLORS[subjectColorMap.get(sid) ?? 0];
                      const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                      const [sh, sm] = (slot.startTime ?? SLOT_TIMES[slot.timeSlot]?.start ?? '0:0').split(':').map(Number);
                      const [eh, em] = (slot.endTime ?? SLOT_TIMES[slot.timeSlot]?.end ?? '0:0').split(':').map(Number);
                      const isNow = isToday && nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
                      return (
                        <div key={slot.id} className={`flex items-center gap-4 px-4 py-3 transition-colors ${isNow ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                            {slot.timeSlot}
                          </div>
                          <div className={`flex-1 rounded-lg border px-3 py-2 text-sm ${colorClass}`}>
                            <p className="font-semibold leading-tight">{slot.subject?.name ?? '—'}</p>
                            <p className="text-xs opacity-70 mt-0.5">
                              {slot.subject?.teacher
                                ? `${slot.subject.teacher.firstName} ${slot.subject.teacher.lastName}`
                                : slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : ''}
                              {slot.roomNumber && ` · ${slot.roomNumber}-xona`}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {slot.startTime ?? SLOT_TIMES[slot.timeSlot]?.start ?? ''}–
                            {slot.endTime ?? SLOT_TIMES[slot.timeSlot]?.end ?? ''}
                          </span>
                          {isNow && (
                            <Badge className="shrink-0 text-xs bg-primary text-primary-foreground">Hozir</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = ['school_admin', 'vice_principal'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student' || user?.role === 'parent';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => {
    const i = new Date().getDay();
    return DAYS[i === 0 ? 4 : i - 1]?.key ?? DayOfWeek.MONDAY;
  });

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: weekSchedule, isLoading } = useQuery({
    queryKey: ['schedule', 'week'],
    queryFn: () => scheduleApi.getWeek(),
  });

  // Conflict check — runs when dayOfWeek + timeSlot are filled
  const canCheck = open && !!form.dayOfWeek && !!form.timeSlot;
  const { data: conflictData } = useQuery({
    queryKey: ['schedule-conflict', form.dayOfWeek, form.timeSlot, form.teacherId, form.roomNumber, form.classId],
    queryFn: () => scheduleApi.checkConflict({
      dayOfWeek:  form.dayOfWeek as string,
      timeSlot:   Number(form.timeSlot),
      teacherId:  form.teacherId || undefined,
      roomNumber: form.roomNumber || undefined,
      classId:    form.classId   || undefined,
    }),
    enabled: canCheck,
    staleTime: 0,
  });

  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: classesApi.getAll, enabled: open });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.getAll(), enabled: open });
  const { data: usersData } = useQuery({ queryKey: ['users', 1], queryFn: () => usersApi.getAll({ page: 1, limit: 100 }), enabled: open });
  const teachers: any[] = (usersData?.data ?? []).filter((u: any) => ['teacher', 'class_teacher'].includes(u.role));

  const createMutation = useMutation({
    mutationFn: scheduleApi.create,
    onSuccess: () => {
      toast({ title: '✅ Dars jadvali qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: scheduleApi.remove,
    onSuccess: () => {
      toast({ title: "Dars o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.classId) e.classId = 'Sinf tanlang';
    if (!form.subjectId) e.subjectId = 'Fan tanlang';
    if (!form.teacherId) e.teacherId = "O'qituvchi tanlang";
    if (!form.dayOfWeek) e.dayOfWeek = 'Kun tanlang';
    if (!form.timeSlot) e.timeSlot = 'Dars raqami tanlang';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      classId:    form.classId,
      subjectId:  form.subjectId,
      teacherId:  form.teacherId,
      dayOfWeek:  form.dayOfWeek as DayOfWeek,
      timeSlot:   Number(form.timeSlot),
      startTime:  form.startTime,
      endTime:    form.endTime,
      roomNumber: form.roomNumber || undefined,
    });
  };

  const openForDaySlot = (day: DayOfWeek, slot: number) => {
    const times = SLOT_TIMES[slot];
    setForm({ ...EMPTY, dayOfWeek: day, timeSlot: String(slot), startTime: times.start, endTime: times.end });
    setErrors({});
    setOpen(true);
  };

  const sel = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const schedule: any[] = Array.isArray(weekSchedule) ? weekSchedule : [];
  const totalSlots = schedule.length;

  // Detect all conflicts across the schedule
  const conflictCount = (() => {
    let count = 0;
    DAYS.forEach(({ key: day }) => {
      [1, 2, 3, 4, 5, 6, 7].forEach(slot => {
        const cells = schedule.filter(s => s.dayOfWeek === day && s.timeSlot === slot);
        if (cells.length > 1) count++;
      });
    });
    return count;
  })();

  if (isStudent) return <StudentScheduleView />;

  return (
    <div className="space-y-6">
      {conflictCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {conflictCount} ta ziddiyat aniqlandi
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500">
              Bir xil vaqtda bir nechta dars belgilangan. Jadval gridda qizil belgi bilan ko&apos;rsatilgan.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dars jadvali</h1>
          <p className="text-muted-foreground">Haftalik dars jadvali · {totalSlots} ta slot</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border p-1 gap-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode('grid')}
              title="Grid ko'rinish"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode('list')}
              title="Ro'yxat ko'rinish"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Excel import
              </Button>
              <Button onClick={() => { setForm(EMPTY); setErrors({}); setOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Dars qo'shish
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="space-y-2">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        )
      ) : (
        <Card>
          <CardContent className={viewMode === 'grid' ? 'pt-4' : 'pt-4 space-y-4'}>
            {viewMode === 'grid' ? (
              <WeeklyGrid
                schedule={schedule}
                canManage={canManage}
                onDelete={(id) => deleteMutation.mutate(id)}
                onAdd={openForDaySlot}
              />
            ) : (
              <ListView
                schedule={schedule}
                activeDay={activeDay}
                onDayChange={setActiveDay}
                canManage={canManage}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Create modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dars qo'shish</DialogTitle>
            <DialogDescription>Haftalik jadvalga yangi dars kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf <span className="text-destructive">*</span></Label>
                <Select value={form.classId} onValueChange={sel('classId')}>
                  <SelectTrigger><SelectValue placeholder="Sinf..." /></SelectTrigger>
                  <SelectContent>{(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.classId && <p className="text-xs text-destructive">{errors.classId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fan <span className="text-destructive">*</span></Label>
                <Select value={form.subjectId} onValueChange={sel('subjectId')}>
                  <SelectTrigger><SelectValue placeholder="Fan..." /></SelectTrigger>
                  <SelectContent>{(subjects as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>O'qituvchi <span className="text-destructive">*</span></Label>
              <Select value={form.teacherId} onValueChange={sel('teacherId')}>
                <SelectTrigger><SelectValue placeholder="O'qituvchi..." /></SelectTrigger>
                <SelectContent>{teachers.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
              </Select>
              {errors.teacherId && <p className="text-xs text-destructive">{errors.teacherId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kun <span className="text-destructive">*</span></Label>
                <Select value={form.dayOfWeek} onValueChange={sel('dayOfWeek')}>
                  <SelectTrigger><SelectValue placeholder="Kun..." /></SelectTrigger>
                  <SelectContent>{DAYS.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
                {errors.dayOfWeek && <p className="text-xs text-destructive">{errors.dayOfWeek}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Dars raqami <span className="text-destructive">*</span></Label>
                <Select value={form.timeSlot} onValueChange={(v) => {
                  const times = SLOT_TIMES[Number(v)];
                  setForm(f => ({ ...f, timeSlot: v, startTime: times?.start ?? f.startTime, endTime: times?.end ?? f.endTime }));
                  setErrors(e => { const n = { ...e }; delete n.timeSlot; return n; });
                }}>
                  <SelectTrigger><SelectValue placeholder="1-7..." /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7].map(n => <SelectItem key={n} value={String(n)}>{n}-dars ({SLOT_TIMES[n]?.start})</SelectItem>)}</SelectContent>
                </Select>
                {errors.timeSlot && <p className="text-xs text-destructive">{errors.timeSlot}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Boshlanish</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tugash</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Xona</Label>
                <Input placeholder="101" value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))} />
              </div>
            </div>
          </div>
          {conflictData?.hasConflict && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-3 py-2 space-y-1">
              <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Ziddiyat aniqlandi
              </div>
              {conflictData.conflicts.map((c, i) => (
                <p key={i} className="text-xs text-amber-600 dark:text-amber-500 pl-5">{c.message}</p>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              variant={conflictData?.hasConflict ? 'destructive' : 'default'}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {conflictData?.hasConflict ? 'Baribir qo\'shish' : 'Qo\'shish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="schedule"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['schedule-week'] })}
      />
    </div>
  );
}
