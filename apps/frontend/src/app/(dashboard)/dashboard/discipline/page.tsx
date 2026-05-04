'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert, Plus, Trash2, CheckCircle2, AlertTriangle,
  Filter, Search, ChevronLeft, ChevronRight, X,
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
import { disciplineApi, DisciplineType, DisciplineSeverity, DisciplineAction } from '@/lib/api/discipline';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<DisciplineType, string> = {
  behavior: 'Xulq-atvor',
  absence: 'Darsga kelmagan',
  academic: 'Akademik',
  dress_code: 'Kiyim-kechak',
  other: 'Boshqa',
};

const SEVERITY_CONFIG: Record<DisciplineSeverity, { label: string; color: string }> = {
  low:    { label: 'Past',    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  medium: { label: "O'rta",  color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  high:   { label: 'Yuqori', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

const ACTION_LABELS: Record<DisciplineAction, string> = {
  warning:        'Ogohlantirish',
  detention:      'Qolib ishlash',
  parent_call:    'Ota-onaga qo\'ng\'iroq',
  parent_meeting: 'Ota-ona yig\'ilishi',
  suspension:     'Maktabdan chetlatish',
  other:          'Boshqa',
};

const EMPTY_FORM = {
  studentId: '',
  type: 'behavior' as DisciplineType,
  severity: 'low' as DisciplineSeverity,
  action: 'warning' as DisciplineAction,
  description: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

const LIMIT = 15;

// ── Severity Badge ─────────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: DisciplineSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DisciplinePage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [filterClass, setFilterClass] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);

  const canManage = ['director', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? '');

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
    enabled: canManage,
  });
  const classList: any[] = Array.isArray(classes) ? classes : [];

  const { data: studentsData } = useQuery({
    queryKey: ['class-students', filterClass],
    queryFn: () => classesApi.getStudents(filterClass),
    enabled: !!filterClass,
  });
  const allStudents: any[] = Array.isArray(studentsData) ? studentsData : [];

  const { data: disciplineData, isLoading, error } = useQuery({
    queryKey: ['discipline', page, filterClass],
    queryFn: () => disciplineApi.getAll({ classId: filterClass || undefined, page, limit: LIMIT }),
    retry: 1,
  });

  const incidents: any[] = disciplineData?.data ?? [];
  const meta = disciplineData?.meta;

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: disciplineApi.create,
    onSuccess: () => {
      toast({ title: '✅ Hodisa qayd etildi' });
      queryClient.invalidateQueries({ queryKey: ['discipline'] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => disciplineApi.resolve(id, notes),
    onSuccess: () => {
      toast({ title: '✅ Hodisa yechildi' });
      queryClient.invalidateQueries({ queryKey: ['discipline'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: disciplineApi.remove,
    onSuccess: () => {
      toast({ title: "Hodisa o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['discipline'] });
    },
  });

  // ── Validate & submit ───────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = "O'quvchi tanlang";
    if (!form.description.trim()) e.description = 'Tavsif kiriting';
    if (!form.date) e.date = 'Sana kiriting';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      studentId: form.studentId,
      type: form.type,
      severity: form.severity,
      action: form.action,
      description: form.description,
      date: form.date,
      notes: form.notes || undefined,
    });
  };

  // Stats
  const totalIncidents = meta?.total ?? incidents.length;
  const unresolvedCount = incidents.filter(i => !i.resolved).length;
  const highSeverityCount = incidents.filter(i => i.severity === 'high').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-orange-500" /> Intizom jurnali
          </h1>
          <p className="text-muted-foreground">O'quvchilar xulq-atvor hodisalari qaydnomasi</p>
        </div>
        {canManage && (
          <Button onClick={() => { setForm(EMPTY_FORM); setErrors({}); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Hodisa qo&apos;shish
          </Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jami hodisalar</p>
              <p className="text-2xl font-bold">{totalIncidents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/10">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yechilmagan</p>
              <p className="text-2xl font-bold">{unresolvedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10">
              <X className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Yuqori darajali</p>
              <p className="text-2xl font-bold">{highSeverityCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-44 text-sm"
            placeholder="O'quvchi qidirish..."
            value={searchStudent}
            onChange={e => setSearchStudent(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button variant={!filterClass ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterClass('')}>Barchasi</Button>
          {classList.slice(0, 6).map((c: any) => (
            <Button key={c.id} variant={filterClass === c.id ? 'secondary' : 'ghost'} size="sm" onClick={() => { setFilterClass(c.id); setPage(1); }}>
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Hodisalar ro&apos;yxati</CardTitle>
          {meta && <CardDescription>{meta.total} ta hodisa qayd etilgan</CardDescription>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <ShieldAlert className="h-10 w-10 opacity-30" />
              <p className="text-sm">Intizom jurnali API hali mavjud emas</p>
              <p className="text-xs">Backend moduli keyingi versiyada qo&apos;shiladi</p>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY_FORM); setOpen(true); }}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> Hodisa qo&apos;shish (demo)
                </Button>
              )}
            </div>
          ) : incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-green-400" />
              <p className="text-sm font-medium">Hodisalar yo&apos;q — intizom yaxshi!</p>
              {canManage && (
                <Button variant="outline" size="sm" onClick={() => { setForm(EMPTY_FORM); setOpen(true); }}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> Hodisa qo&apos;shish
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 font-medium text-muted-foreground pr-3">O&apos;quvchi</th>
                    <th className="text-left py-2.5 font-medium text-muted-foreground">Tur</th>
                    <th className="text-center py-2.5 font-medium text-muted-foreground">Daraja</th>
                    <th className="text-left py-2.5 font-medium text-muted-foreground">Chora</th>
                    <th className="text-center py-2.5 font-medium text-muted-foreground">Sana</th>
                    <th className="text-center py-2.5 font-medium text-muted-foreground">Holat</th>
                    {canManage && <th className="w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {incidents
                    .filter(i => !searchStudent || `${i.student?.firstName} ${i.student?.lastName}`.toLowerCase().includes(searchStudent.toLowerCase()))
                    .map((incident: any) => (
                      <tr key={incident.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                        <td className="py-2.5 pr-3">
                          <div>
                            <p className="font-medium">{incident.student?.firstName} {incident.student?.lastName}</p>
                            <p className="text-xs text-muted-foreground">{incident.student?.class?.name ?? '—'}</p>
                          </div>
                        </td>
                        <td className="py-2.5">{TYPE_LABELS[incident.type as DisciplineType] ?? incident.type}</td>
                        <td className="py-2.5 text-center">
                          <SeverityBadge severity={incident.severity as DisciplineSeverity} />
                        </td>
                        <td className="py-2.5 text-sm text-muted-foreground">
                          {ACTION_LABELS[incident.action as DisciplineAction] ?? incident.action}
                        </td>
                        <td className="py-2.5 text-center text-xs text-muted-foreground">
                          {new Date(incident.date).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="py-2.5 text-center">
                          {incident.resolved ? (
                            <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20 text-xs">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Yechildi
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Ochiq</Badge>
                          )}
                        </td>
                        {canManage && (
                          <td className="py-2.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!incident.resolved && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Yechildi deb belgilash"
                                  onClick={() => resolveMutation.mutate({ id: incident.id })}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="O'chirish"
                                onClick={() => deleteMutation.mutate(incident.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} / {meta.total}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" /> Hodisa qayd etish
            </DialogTitle>
            <DialogDescription>O&apos;quvchiga oid intizom hodisasini tizimga kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Class + Student */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf</Label>
                <Select value={filterClass} onValueChange={v => { setFilterClass(v); setForm(f => ({ ...f, studentId: '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Sinf tanlang..." /></SelectTrigger>
                  <SelectContent>
                    {classList.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>O&apos;quvchi <span className="text-destructive">*</span></Label>
                <Select value={form.studentId} onValueChange={v => { setForm(f => ({ ...f, studentId: v })); setErrors(e => { const n = { ...e }; delete n.studentId; return n; }); }}>
                  <SelectTrigger><SelectValue placeholder="O'quvchi..." /></SelectTrigger>
                  <SelectContent>
                    {allStudents.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
              </div>
            </div>

            {/* Type + Severity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hodisa turi</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as DisciplineType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Darajasi</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v as DisciplineSeverity }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ko&apos;rilgan chora</Label>
                <Select value={form.action} onValueChange={v => setForm(f => ({ ...f, action: v as DisciplineAction }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sana <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Tavsif <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Nima bo'ldi? Batafsil yozing..."
                value={form.description}
                onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setErrors(e2 => { const n = { ...e2 }; delete n.description; return n; }); }}
                rows={3}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Qo&apos;shimcha izoh</Label>
              <Input placeholder="Ixtiyoriy..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
