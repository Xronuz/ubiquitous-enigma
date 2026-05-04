'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/store/confirm.store';
import {
  FileText, Plus, Calendar, CheckCircle, Clock, Loader2,
  Layers, Check, BarChart2, BookOpen, Trash2, HelpCircle,
  Users, Star, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { examsApi } from '@/lib/api/exams';
import { onlineExamApi, ExamQuestion } from '@/lib/api/online-exam';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { PageShell, PageHeader, PCard, Btn, DS, EmptyCard } from '@/components/ui/page-ui';

// ── Types (H-10) ─────────────────────────────────────────────────────────────
export interface Exam {
  id: string;
  title: string;
  frequency: string;
  maxScore: number;
  duration?: number;
  scheduledAt: string;
  isPublished: boolean;
  classId: string;
  subjectId: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string };
  _count?: { results: number };
}

const QTYPE_LABELS: Record<string, string> = {
  multiple_choice: "Ko'p variantli",
  true_false: "To'g'ri/Noto'g'ri",
  short_answer: 'Qisqa javob',
  essay: 'Insho',
};

// ── Exam Detail Dialog (Questions + Sessions) ─────────────────────────────────
function ExamDetailDialog({ exam, open, onClose, canManage }: {
  exam: any;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
}) {
  const ask = useConfirm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [addingQ, setAddingQ] = useState(false);
  const [qForm, setQForm] = useState({
    type: 'multiple_choice',
    text: '',
    points: '1',
    explanation: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ['online-exam', exam.id, 'questions'],
    queryFn: () => onlineExamApi.getQuestions(exam.id),
    enabled: open,
  });

  const { data: sessions = [], isLoading: sLoading } = useQuery({
    queryKey: ['online-exam', exam.id, 'sessions'],
    queryFn: () => onlineExamApi.getExamSessions(exam.id),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (payload: Parameters<typeof onlineExamApi.addQuestion>[1]) =>
      onlineExamApi.addQuestion(exam.id, payload),
    onSuccess: () => {
      toast({ title: '✅ Savol qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['online-exam', exam.id, 'questions'] });
      setAddingQ(false);
      setQForm({ type: 'multiple_choice', text: '', points: '1', explanation: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (qId: string) => onlineExamApi.deleteQuestion(exam.id, qId),
    onSuccess: () => {
      toast({ title: 'Savol o\'chirildi' });
      queryClient.invalidateQueries({ queryKey: ['online-exam', exam.id, 'questions'] });
    },
  });

  const handleAddQ = () => {
    if (!qForm.text.trim()) { toast({ variant: 'destructive', title: 'Savol matnini kiriting' }); return; }
    const needsOptions = ['multiple_choice', 'true_false'].includes(qForm.type);
    const validOptions = qForm.options.filter(o => o.text.trim());
    if (needsOptions && validOptions.length < 2) {
      toast({ variant: 'destructive', title: 'Kamida 2 ta variant kiriting' }); return;
    }
    if (needsOptions && !validOptions.some(o => o.isCorrect)) {
      toast({ variant: 'destructive', title: 'To\'g\'ri javobni belgilang' }); return;
    }
    addMutation.mutate({
      type: qForm.type,
      text: qForm.text.trim(),
      points: Number(qForm.points) || 1,
      explanation: qForm.explanation || undefined,
      options: needsOptions ? validOptions.map((o, i) => ({ text: o.text.trim(), isCorrect: o.isCorrect, order: i })) : undefined,
    });
  };

  const isTrueFalse = qForm.type === 'true_false';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> {exam.title}
          </DialogTitle>
          <DialogDescription>
            {exam.subject?.name && <span>{exam.subject.name} · </span>}
            {exam.class?.name && <span>{exam.class.name} · </span>}
            Max: {exam.maxScore} ball
            {exam.duration && <span> · {exam.duration} daqiqa</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="questions">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="questions">
              <HelpCircle className="mr-1.5 h-4 w-4" />
              Savollar {(questions as ExamQuestion[]).length > 0 && `(${(questions as ExamQuestion[]).length})`}
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Users className="mr-1.5 h-4 w-4" />
              Natijalar {(sessions as any[]).length > 0 && `(${(sessions as any[]).length})`}
            </TabsTrigger>
          </TabsList>

          {/* ── Questions tab ── */}
          <TabsContent value="questions" className="space-y-3 mt-4">
            {qLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (questions as ExamQuestion[]).length === 0 && !addingQ ? (
              <div className="py-8 text-center text-muted-foreground">
                <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Hali savollar yo&apos;q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(questions as ExamQuestion[]).map((q, i) => (
                  <div key={q.id} className="rounded-lg border bg-card">
                    <div className="flex items-start gap-3 p-3">
                      <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{QTYPE_LABELS[q.type]}</Badge>
                          <span className="text-xs text-muted-foreground">{q.points} ball</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                          {expandedQ === q.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        {canManage && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive"
                            onClick={async () => { if (await ask({ title: "Savolni o'chirasizmi?", variant: 'destructive', confirmText: "O'chirish" })) deleteMutation.mutate(q.id); }}
                            disabled={deleteMutation.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {expandedQ === q.id && q.options.length > 0 && (
                      <div className="px-3 pb-3 pt-0 space-y-1 border-t mt-1">
                        {q.options.map((opt, oi) => (
                          <div key={opt.id} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${opt.isCorrect ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                            <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                            <span>{opt.text}</span>
                            {opt.isCorrect && <CheckCircle className="ml-auto h-3.5 w-3.5 text-green-600 shrink-0" />}
                          </div>
                        ))}
                        {q.explanation && <p className="text-xs text-muted-foreground italic mt-2 px-2">Izoh: {q.explanation}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add question form */}
            {canManage && addingQ && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <p className="text-sm font-medium">Yangi savol</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tur</Label>
                    <Select value={qForm.type} onValueChange={v => setQForm(f => ({
                      ...f, type: v,
                      options: v === 'true_false'
                        ? [{ text: "To'g'ri", isCorrect: false }, { text: "Noto'g'ri", isCorrect: false }]
                        : f.options,
                    }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(QTYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ball</Label>
                    <Input type="number" min="0.5" step="0.5" value={qForm.points}
                      onChange={e => setQForm(f => ({ ...f, points: e.target.value }))}
                      className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Savol matni</Label>
                  <Textarea rows={2} placeholder="Savol matnini kiriting..." value={qForm.text}
                    onChange={e => setQForm(f => ({ ...f, text: e.target.value }))}
                    className="text-sm resize-none" />
                </div>
                {['multiple_choice', 'true_false'].includes(qForm.type) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Variantlar (to&apos;g&apos;ri javobni belgilang)</Label>
                    <div className="space-y-1.5">
                      {(isTrueFalse ? qForm.options.slice(0, 2) : qForm.options).map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox
                            checked={opt.isCorrect}
                            onCheckedChange={checked => {
                              setQForm(f => ({
                                ...f,
                                options: f.options.map((o, idx) => ({ ...o, isCorrect: idx === i ? !!checked : false })),
                              }));
                            }}
                          />
                          <Input
                            value={opt.text}
                            onChange={e => setQForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, text: e.target.value } : o) }))}
                            placeholder={isTrueFalse ? (i === 0 ? "To'g'ri" : "Noto'g'ri") : `Variant ${String.fromCharCode(65 + i)}`}
                            className="h-7 text-xs flex-1"
                            readOnly={isTrueFalse}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Izoh (ixtiyoriy)</Label>
                  <Input placeholder="To'g'ri javob izohi..." value={qForm.explanation}
                    onChange={e => setQForm(f => ({ ...f, explanation: e.target.value }))}
                    className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddQ} disabled={addMutation.isPending}>
                    {addMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                    Qo&apos;shish
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingQ(false)}>Bekor</Button>
                </div>
              </div>
            )}

            {canManage && !addingQ && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingQ(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Savol qo&apos;shish
              </Button>
            )}
          </TabsContent>

          {/* ── Sessions tab ── */}
          <TabsContent value="sessions" className="mt-4">
            {sLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (sessions as any[]).length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Hali hech kim imtihon topshirmagan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(sessions as any[]).map((s: any) => {
                  const statusColor = s.status === 'submitted' || s.status === 'graded' ? 'text-green-600' : s.status === 'timed_out' ? 'text-red-500' : 'text-blue-500';
                  const statusLabel = { in_progress: 'Jarayonda', submitted: 'Topshirildi', timed_out: 'Vaqt tugadi', graded: 'Baholandi', not_started: 'Boshlanmagan' }[s.status as string] ?? s.status;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-card">
                      <div>
                        <p className="text-sm font-medium">{s.student?.firstName} {s.student?.lastName}</p>
                        <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
                      </div>
                      <div className="text-right">
                        {s.score !== null && s.score !== undefined ? (
                          <p className="text-sm font-bold flex items-center gap-1 justify-end">
                            <Star className="h-3.5 w-3.5 text-yellow-500" /> {s.score} / {exam.maxScore}
                          </p>
                        ) : <p className="text-xs text-muted-foreground">—</p>}
                        {s.percentage !== null && s.percentage !== undefined && (
                          <p className="text-xs text-muted-foreground">{s.percentage}%</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Haftalik', monthly: 'Oylik', quarterly: 'Choraklik', final: 'Yakuniy', on_demand: 'Belgilangan',
};

const SINGLE_EMPTY = { classId: '', subjectId: '', title: '', frequency: '', maxScore: '100', scheduledAt: '', duration: '' };
const BULK_EMPTY = { title: '', frequency: '', maxScore: '100', scheduledAt: '', duration: '', classIds: [] as string[], subjectIds: [] as string[] };

export default function ExamsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = ['director', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? '');
  const isAdmin = ['director', 'vice_principal'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student';

  // Dialogs
  const [singleOpen, setSingleOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [managingExam, setManagingExam] = useState<any | null>(null);

  // Single form
  const [sForm, setSForm] = useState(SINGLE_EMPTY);
  const [sErrors, setSErrors] = useState<Record<string, string>>({});

  // Bulk form
  const [bForm, setBForm] = useState(BULK_EMPTY);
  const [bErrors, setBErrors] = useState<Record<string, string>>({});

  const anyOpen = singleOpen || bulkOpen;

  const { data: exams = [], isLoading, isError } = useQuery<Exam[]>({ queryKey: ['exams'], queryFn: () => examsApi.getAll() });
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => classesApi.getAll(), enabled: anyOpen });
  const { data: subjects = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.getAll(), enabled: anyOpen });

  // ─── Single create ─────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => {
      toast({ title: '✅ Imtihon qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setSingleOpen(false);
      setSForm(SINGLE_EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleSingleSubmit = () => {
    const e: Record<string, string> = {};
    if (!sForm.classId) e.classId = 'Sinf tanlang';
    if (!sForm.subjectId) e.subjectId = 'Fan tanlang';
    if (!sForm.title.trim()) e.title = 'Sarlavha kiriting';
    if (!sForm.frequency) e.frequency = 'Tur tanlang';
    if (!sForm.scheduledAt) e.scheduledAt = 'Sana kiriting';
    setSErrors(e);
    if (Object.keys(e).length) return;
    createMutation.mutate({
      classId: sForm.classId,
      subjectId: sForm.subjectId,
      title: sForm.title.trim(),
      frequency: sForm.frequency,
      maxScore: Number(sForm.maxScore) || 100,
      scheduledAt: new Date(sForm.scheduledAt).toISOString(),
      duration: sForm.duration ? Number(sForm.duration) : undefined,
    });
  };

  // ─── Bulk create ────────────────────────────────────────
  const bulkMutation = useMutation({
    mutationFn: examsApi.bulkCreate,
    onSuccess: (res: any) => {
      toast({ title: `✅ ${res.count ?? ''} ta imtihon yaratildi` });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setBulkOpen(false);
      setBForm(BULK_EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const toggleClass = (id: string) => setBForm(f => ({
    ...f, classIds: f.classIds.includes(id) ? f.classIds.filter(c => c !== id) : [...f.classIds, id],
  }));
  const toggleSubject = (id: string) => setBForm(f => ({
    ...f, subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter(s => s !== id) : [...f.subjectIds, id],
  }));

  const handleBulkSubmit = () => {
    const e: Record<string, string> = {};
    if (!bForm.title.trim()) e.title = 'Sarlavha kiriting';
    if (!bForm.frequency) e.frequency = 'Tur tanlang';
    if (!bForm.scheduledAt) e.scheduledAt = 'Sana kiriting';
    if (bForm.classIds.length === 0) e.classIds = 'Kamida 1 ta sinf tanlang';
    if (bForm.subjectIds.length === 0) e.subjectIds = 'Kamida 1 ta fan tanlang';
    setBErrors(e);
    if (Object.keys(e).length) return;
    bulkMutation.mutate({
      title: bForm.title.trim(),
      frequency: bForm.frequency,
      maxScore: Number(bForm.maxScore) || 100,
      scheduledAt: new Date(bForm.scheduledAt).toISOString(),
      duration: bForm.duration ? Number(bForm.duration) : undefined,
      classIds: bForm.classIds,
      subjectIds: bForm.subjectIds,
    });
  };

  // ─── Publish ─────────────────────────────────────────────
  const publishMutation = useMutation({
    mutationFn: (id: string) => examsApi.publish(id),
    onSuccess: () => {
      toast({ title: "✅ E'lon qilindi" });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const now = new Date();
  const upcoming = (exams as any[]).filter((e: any) => new Date(e.scheduledAt) >= now);
  const past = (exams as any[]).filter((e: any) => new Date(e.scheduledAt) < now);

  const sel = (setState: any) => (k: string) => (v: string) => setState((f: any) => ({ ...f, [k]: v }));
  const inp = (setState: any) => (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setState((f: any) => ({ ...f, [k]: e.target.value }));

  const actions = canManage ? (
    <div className="flex gap-2">
      {isAdmin && (
        <Btn variant="secondary" icon={<Layers className="h-4 w-4" />} onClick={() => { setBulkOpen(true); setBForm(BULK_EMPTY); setBErrors({}); }}>
          Ommaviy
        </Btn>
      )}
      <Btn variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setSingleOpen(true); setSForm(SINGLE_EMPTY); setSErrors({}); }}>
        Yangi imtihon
      </Btn>
    </div>
  ) : undefined;

  return (
    <PageShell>
      <PageHeader title="Imtihonlar" subtitle="Imtihon jadvali va natijalari" actions={actions} />

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-[20px]" />)}</div>
      ) : isError ? (
        <EmptyCard icon={<FileText className="h-6 w-6" />} title="Imtihonlar yuklanmadi" description="Server bilan bog'lanishda xato yuz berdi. Sahifani yangilang yoki qayta urinib ko'ring." />
      ) : (exams as any[]).length === 0 ? (
        <EmptyCard icon={<FileText className="h-6 w-6" />} title="Hali imtihonlar yo'q" description={canManage ? "Yuqoridagi '+ Yangi imtihon' tugmasini bosib birinchi imtihonni qo'shing" : "O'qituvchi tomonidan e'lon qilingan imtihonlar bu yerda ko'rinadi"} />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: DS.muted }}>Kelgusi imtihonlar</p>
              <div className="space-y-3">
                {upcoming.map((exam: any) => (
                  <PCard key={exam.id} hoverable padding="sm">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-[14px]" style={{ background: 'rgba(59,130,246,0.08)' }}>
                          <Clock className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-bold text-[15px]" style={{ color: DS.text }}>{exam.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: DS.primaryLight, color: DS.primary }}>
                              {FREQUENCY_LABELS[exam.frequency] ?? exam.frequency}
                            </span>
                            {exam.subject && <span className="text-[12px]" style={{ color: DS.muted }}>{exam.subject.name}</span>}
                            {exam.class && <span className="text-[12px]" style={{ color: DS.muted }}>· {exam.class.name}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-[13px] font-semibold flex items-center gap-1" style={{ color: DS.text }}>
                            <Calendar className="h-3.5 w-3.5" />{new Date(exam.scheduledAt).toLocaleDateString('uz-UZ')}
                          </p>
                          <p className="text-[12px]" style={{ color: DS.muted }}>{exam.duration ? `${exam.duration} daqiqa · ` : ''}Max: {exam.maxScore} ball</p>
                        </div>
                        {canManage && (
                          <Btn variant="secondary" icon={<BookOpen className="h-3.5 w-3.5" />} onClick={() => setManagingExam(exam)}>
                            Savollar
                          </Btn>
                        )}
                        {canManage && !exam.isPublished && (
                          <Btn variant="secondary" loading={publishMutation.isPending} onClick={() => publishMutation.mutate(exam.id)}>
                            E&apos;lon qilish
                          </Btn>
                        )}
                        {exam.isPublished && !isStudent && (
                          <span className="flex items-center gap-1 text-[12px] font-bold px-3 py-1 rounded-full" style={{ background: '#DDF5EA', color: DS.primary }}>
                            <CheckCircle className="h-3.5 w-3.5" />E&apos;lon qilingan
                          </span>
                        )}
                        {isStudent && exam.isPublished && (
                          <Btn variant="primary" onClick={() => router.push(`/exam/${exam.id}/take`)}>
                            Imtihonni boshlash
                          </Btn>
                        )}
                      </div>
                    </div>
                  </PCard>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-3" style={{ color: DS.muted }}>O&apos;tgan imtihonlar</p>
              <div className="space-y-2">
                {past.map((exam: any) => (
                  <PCard key={exam.id} hoverable padding="sm" className="opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle className="h-4 w-4 shrink-0" style={{ color: DS.muted }} />
                        <span className="text-[14px] font-semibold truncate" style={{ color: DS.text }}>{exam.title}</span>
                        {exam.subject && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(0,0,0,0.04)', color: DS.muted }}>{exam.subject.name}</span>}
                        {exam.class && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(0,0,0,0.04)', color: DS.muted }}>{exam.class.name}</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px]" style={{ color: DS.muted }}>{new Date(exam.scheduledAt).toLocaleDateString('uz-UZ')}</span>
                        {canManage && (
                          <>
                            <Btn variant="ghost" icon={<BarChart2 className="h-3.5 w-3.5" />} onClick={() => setManagingExam(exam)}>Natijalar</Btn>
                            <Btn variant="secondary" icon={<HelpCircle className="h-3.5 w-3.5" />} onClick={() => router.push(`/dashboard/exams/${exam.id}`)}>Savollar</Btn>
                          </>
                        )}
                        {isStudent && (
                          <Btn variant="ghost" icon={<BarChart2 className="h-3.5 w-3.5" />} onClick={() => router.push(`/dashboard/exams/${exam.id}`)}>Natijam</Btn>
                        )}
                      </div>
                    </div>
                  </PCard>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {managingExam && (
        <ExamDetailDialog exam={managingExam} open={!!managingExam} onClose={() => setManagingExam(null)} canManage={canManage} />
      )}

      {/* ── Single create dialog ── */}
      <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi imtihon qo'shish</DialogTitle>
            <DialogDescription>Bitta sinf va fan uchun imtihon</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sarlavha <span className="text-destructive">*</span></Label>
              <Input placeholder="Masalan: 1-chorak imtihoni" value={sForm.title} onChange={inp(setSForm)('title')} />
              {sErrors.title && <p className="text-xs text-destructive">{sErrors.title}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf <span className="text-destructive">*</span></Label>
                <Select value={sForm.classId} onValueChange={sel(setSForm)('classId')}>
                  <SelectTrigger><SelectValue placeholder="Sinf..." /></SelectTrigger>
                  <SelectContent>{(classes as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {sErrors.classId && <p className="text-xs text-destructive">{sErrors.classId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fan <span className="text-destructive">*</span></Label>
                <Select value={sForm.subjectId} onValueChange={sel(setSForm)('subjectId')}>
                  <SelectTrigger><SelectValue placeholder="Fan..." /></SelectTrigger>
                  <SelectContent>{(subjects as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {sErrors.subjectId && <p className="text-xs text-destructive">{sErrors.subjectId}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tur <span className="text-destructive">*</span></Label>
                <Select value={sForm.frequency} onValueChange={sel(setSForm)('frequency')}>
                  <SelectTrigger><SelectValue placeholder="Tur..." /></SelectTrigger>
                  <SelectContent>{Object.entries(FREQUENCY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
                {sErrors.frequency && <p className="text-xs text-destructive">{sErrors.frequency}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Max ball</Label>
                <Input type="number" min="1" value={sForm.maxScore} onChange={inp(setSForm)('maxScore')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sana va vaqt <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={sForm.scheduledAt} onChange={inp(setSForm)('scheduledAt')} />
                {sErrors.scheduledAt && <p className="text-xs text-destructive">{sErrors.scheduledAt}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Davomiyligi (daq.)</Label>
                <Input type="number" placeholder="90" min="1" value={sForm.duration} onChange={inp(setSForm)('duration')} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSingleOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSingleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk create dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Ommaviy imtihon yaratish</DialogTitle>
            <DialogDescription>Ko'p sinf × ko'p fan kombinatsiyasi uchun bir vaqtda imtihon yarating</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Sarlavha */}
            <div className="space-y-1.5">
              <Label>Sarlavha <span className="text-destructive">*</span></Label>
              <Input placeholder="Masalan: Oylik imtihon — Mart 2026" value={bForm.title} onChange={inp(setBForm)('title')} />
              {bErrors.title && <p className="text-xs text-destructive">{bErrors.title}</p>}
            </div>

            {/* Tur + Sana */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tur <span className="text-destructive">*</span></Label>
                <Select value={bForm.frequency} onValueChange={sel(setBForm)('frequency')}>
                  <SelectTrigger><SelectValue placeholder="Tur tanlang..." /></SelectTrigger>
                  <SelectContent>{Object.entries(FREQUENCY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
                {bErrors.frequency && <p className="text-xs text-destructive">{bErrors.frequency}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Sana <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={bForm.scheduledAt} onChange={inp(setBForm)('scheduledAt')} />
                {bErrors.scheduledAt && <p className="text-xs text-destructive">{bErrors.scheduledAt}</p>}
              </div>
            </div>

            {/* Max ball + Davomiylik */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max ball</Label>
                <Input type="number" min="1" value={bForm.maxScore} onChange={inp(setBForm)('maxScore')} />
              </div>
              <div className="space-y-1.5">
                <Label>Davomiyligi (daq.)</Label>
                <Input type="number" placeholder="90" min="1" value={bForm.duration} onChange={inp(setBForm)('duration')} />
              </div>
            </div>

            {/* Sinflar + Fanlar (side by side) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Sinflar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Sinflar <span className="text-destructive">*</span></Label>
                  <div className="flex gap-1.5">
                    {bForm.classIds.length > 0 && (
                      <span className="text-xs text-primary font-medium">{bForm.classIds.length} tanlandi</span>
                    )}
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-primary underline"
                      onClick={() => {
                        const allIds = (classes as any[]).map((c: any) => c.id);
                        setBForm(f => ({
                          ...f,
                          classIds: f.classIds.length === allIds.length ? [] : allIds,
                        }));
                      }}
                    >
                      {bForm.classIds.length === (classes as any[]).length ? 'Barchasini bekor' : 'Barchasini tanlash'}
                    </button>
                  </div>
                </div>
                {(classes as any[]).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Yuklanmoqda...</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-lg border p-2 space-y-0.5">
                    {(classes as any[]).map((c: any) => (
                      <label key={c.id} className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-sm transition-colors ${bForm.classIds.includes(c.id) ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                        <Checkbox checked={bForm.classIds.includes(c.id)} onCheckedChange={() => toggleClass(c.id)} />
                        <span className="flex-1">{c.name}</span>
                        {bForm.classIds.includes(c.id) && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </label>
                    ))}
                  </div>
                )}
                {bErrors.classIds && <p className="text-xs text-destructive">{bErrors.classIds}</p>}
              </div>

              {/* Fanlar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Fanlar <span className="text-destructive">*</span></Label>
                  <div className="flex gap-1.5">
                    {bForm.subjectIds.length > 0 && (
                      <span className="text-xs text-primary font-medium">{bForm.subjectIds.length} tanlandi</span>
                    )}
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-primary underline"
                      onClick={() => {
                        const allIds = (subjects as any[]).map((s: any) => s.id);
                        setBForm(f => ({
                          ...f,
                          subjectIds: f.subjectIds.length === allIds.length ? [] : allIds,
                        }));
                      }}
                    >
                      {bForm.subjectIds.length === (subjects as any[]).length ? 'Barchasini bekor' : 'Barchasini tanlash'}
                    </button>
                  </div>
                </div>
                {(subjects as any[]).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Yuklanmoqda...</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-lg border p-2 space-y-0.5">
                    {(subjects as any[]).map((s: any) => (
                      <label key={s.id} className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-sm transition-colors ${bForm.subjectIds.includes(s.id) ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                        <Checkbox checked={bForm.subjectIds.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                        <span className="flex-1">{s.name}</span>
                        {s.class && <Badge variant="secondary" className="text-xs">{s.class.name}</Badge>}
                        {bForm.subjectIds.includes(s.id) && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </label>
                    ))}
                  </div>
                )}
                {bErrors.subjectIds && <p className="text-xs text-destructive">{bErrors.subjectIds}</p>}
              </div>
            </div>

            {/* Preview count */}
            {bForm.classIds.length > 0 && bForm.subjectIds.length > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-center">
                Jami{' '}
                <span className="font-bold text-primary text-base">{bForm.classIds.length * bForm.subjectIds.length}</span>
                {' '}ta imtihon yaratiladi
                <span className="text-muted-foreground ml-1.5 block text-xs mt-0.5">
                  {bForm.classIds.length} ta sinf × {bForm.subjectIds.length} ta fan
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleBulkSubmit} disabled={bulkMutation.isPending}>
              {bulkMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yaratilmoqda...</> : <><Layers className="mr-2 h-4 w-4" />Yaratish</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
