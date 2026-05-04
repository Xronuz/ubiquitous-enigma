'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck, Plus, Trash2, CheckCircle2, Clock,
  Video, Phone, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { meetingsApi, MeetingStatus, MeetingMedium } from '@/lib/api/meetings';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string }> = {
  scheduled: { label: 'Rejalashtirilgan', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  completed:  { label: 'Bajarildi',        color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  cancelled:  { label: 'Bekor qilindi',    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

const MEDIUM_CONFIG: Record<MeetingMedium, { label: string; icon: React.ElementType }> = {
  in_person: { label: 'Bevosita',  icon: Users },
  phone:     { label: 'Telefon',   icon: Phone },
  video:     { label: 'Video qo\'ng\'iroq', icon: Video },
};

const EMPTY_FORM = {
  teacherId: '',
  parentId: '',
  studentId: '',
  scheduledAt: '',
  duration: '30',
  medium: 'in_person' as MeetingMedium,
  agenda: '',
};

const LIMIT = 15;

export default function MeetingsPage() {
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<MeetingStatus | ''>('');

  const canManage = ['director', 'vice_principal'].includes(user?.role ?? '');

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: meetingsData, isLoading, error } = useQuery({
    queryKey: ['meetings', page, filterStatus, activeBranchId],
    queryFn: () => meetingsApi.getAll({ status: filterStatus || undefined, page, limit: LIMIT }),
    retry: 1,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['users', 'teachers', activeBranchId],
    queryFn: () => usersApi.getAll({ role: 'teacher', limit: 100 }),
    enabled: open,
    select: (d: any) => d?.data ?? [],
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['users', 'parents', activeBranchId],
    queryFn: () => usersApi.getAll({ role: 'parent', limit: 100 }),
    enabled: open,
    select: (d: any) => d?.data ?? [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ['users', 'students', activeBranchId],
    queryFn: () => usersApi.getAll({ role: 'student', limit: 200 }),
    enabled: open,
    select: (d: any) => d?.data ?? [],
  });

  const meetings: any[] = meetingsData?.data ?? [];
  const meta = meetingsData?.meta;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: meetingsApi.create,
    onSuccess: () => {
      toast({ title: '✅ Uchrashuv rejalashtirildi' });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MeetingStatus }) =>
      meetingsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: meetingsApi.remove,
    onSuccess: () => {
      toast({ title: "Uchrashuv o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  // ── Validate & submit ────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.teacherId) e.teacherId = "O'qituvchi tanlang";
    if (!form.parentId) e.parentId = 'Ota-ona tanlang';
    if (!form.studentId) e.studentId = "O'quvchi tanlang";
    if (!form.scheduledAt) e.scheduledAt = 'Sana va vaqt kiriting';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sel = (k: string) => (v: string) => {
    setForm(f => {
      const update: typeof f = { ...f, [k]: v };
      // When parent changes, auto-populate studentId if the parent record carries it
      if (k === 'parentId') {
        const parent = (parents as any[]).find((p: any) => p.id === v);
        const linkedStudentId: string | undefined = parent?.studentId ?? parent?.children?.[0]?.id;
        update.studentId = linkedStudentId ?? '';
      }
      return update;
    });
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  // Stats
  const upcoming = meetings.filter(m => m.status === 'scheduled' && new Date(m.scheduledAt) >= new Date()).length;
  const completedCount = meetings.filter(m => m.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-blue-500" /> Ota-ona uchrashuvlari
          </h1>
          <p className="text-muted-foreground">O&apos;qituvchi — ota-ona muloqot jadvali</p>
        </div>
        {canManage && (
          <Button onClick={() => { setForm(EMPTY_FORM); setErrors({}); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Uchrashuv rejalashtirish
          </Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10"><CalendarCheck className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-xs text-muted-foreground">Yaqin uchrashuvlar</p><p className="text-2xl font-bold">{upcoming}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Bajarilgan</p><p className="text-2xl font-bold">{completedCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10"><Users className="h-5 w-5 text-violet-500" /></div>
            <div><p className="text-xs text-muted-foreground">Jami uchrashuvlar</p><p className="text-2xl font-bold">{meta?.total ?? meetings.length}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        <Button variant={!filterStatus ? 'secondary' : 'ghost'} size="sm" onClick={() => { setFilterStatus(''); setPage(1); }}>Barchasi</Button>
        {(Object.keys(STATUS_CONFIG) as MeetingStatus[]).map(s => (
          <Button key={s} variant={filterStatus === s ? 'secondary' : 'ghost'} size="sm"
            onClick={() => { setFilterStatus(s); setPage(1); }}>
            {STATUS_CONFIG[s].label}
          </Button>
        ))}
      </div>

      {/* Meetings list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Uchrashuvlar jadvali</CardTitle>
          {meta && <CardDescription>{meta.total} ta uchrashuv</CardDescription>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <CalendarCheck className="h-10 w-10 opacity-30" />
              <p className="text-sm">Uchrashuvlar API hali mavjud emas</p>
              <p className="text-xs">Backend moduli keyingi versiyada qo&apos;shiladi</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <CalendarCheck className="h-10 w-10 opacity-40" />
              <p className="text-sm">Uchrashuvlar yo&apos;q</p>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY_FORM); setOpen(true); }}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> Uchrashuv rejalashtirish
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((meeting: any) => {
                const MediumIcon = MEDIUM_CONFIG[meeting.medium as MeetingMedium]?.icon ?? Users;
                const statusCfg = STATUS_CONFIG[meeting.status as MeetingStatus];
                const d = new Date(meeting.scheduledAt);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={meeting.id} className="flex items-center justify-between rounded-lg border p-3 gap-4 hover:bg-muted/20 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-full bg-primary/10 shrink-0">
                        <MediumIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {meeting.teacher?.firstName} {meeting.teacher?.lastName}
                          <span className="text-muted-foreground mx-1">↔</span>
                          {meeting.parent?.firstName} {meeting.parent?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {meeting.student?.firstName} {meeting.student?.lastName} · {meeting.student?.class?.name}
                        </p>
                        {meeting.agenda && <p className="text-xs text-muted-foreground truncate mt-0.5">📋 {meeting.agenda}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                          {isToday ? 'Bugun' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />{d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                          {meeting.duration && ` · ${meeting.duration} min`}
                        </p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                      {canManage && meeting.status === 'scheduled' && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50"
                            onClick={() => statusMutation.mutate({ id: meeting.id, status: 'completed' })} title="Bajarildi">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteMutation.mutate(meeting.id)} title="O'chirish">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} / {meta.total}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uchrashuv rejalashtirish</DialogTitle>
            <DialogDescription>O&apos;qituvchi va ota-ona o&apos;rtasidagi uchrashuvni belgilang</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>O&apos;qituvchi <span className="text-destructive">*</span></Label>
              <Select value={form.teacherId} onValueChange={sel('teacherId')}>
                <SelectTrigger><SelectValue placeholder="O'qituvchi tanlang..." /></SelectTrigger>
                <SelectContent>{(teachers as any[]).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>)}</SelectContent>
              </Select>
              {errors.teacherId && <p className="text-xs text-destructive">{errors.teacherId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Ota-ona <span className="text-destructive">*</span></Label>
              <Select value={form.parentId} onValueChange={sel('parentId')}>
                <SelectTrigger><SelectValue placeholder="Ota-ona tanlang..." /></SelectTrigger>
                <SelectContent>{(parents as any[]).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent>
              </Select>
              {errors.parentId && <p className="text-xs text-destructive">{errors.parentId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>O&apos;quvchi <span className="text-destructive">*</span></Label>
              <Select value={form.studentId} onValueChange={sel('studentId')}>
                <SelectTrigger><SelectValue placeholder="O'quvchi tanlang..." /></SelectTrigger>
                <SelectContent>{(students as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sana va vaqt <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={form.scheduledAt}
                  onChange={e => { setForm(f => ({ ...f, scheduledAt: e.target.value })); setErrors(e2 => { const n = { ...e2 }; delete n.scheduledAt; return n; }); }} />
                {errors.scheduledAt && <p className="text-xs text-destructive">{errors.scheduledAt}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Davomiylik (min)</Label>
                <Input type="number" min="10" max="120" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Uchrashuv usuli</Label>
              <Select value={form.medium} onValueChange={v => setForm(f => ({ ...f, medium: v as MeetingMedium }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MEDIUM_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kun tartibi</Label>
              <Textarea placeholder="Nima haqida gaplashiladi?" value={form.agenda}
                onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
            <Button onClick={() => { if (validate()) createMutation.mutate({ ...form, duration: Number(form.duration) || 30 }); }}
              disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saqlanmoqda...' : 'Rejalashtirish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
