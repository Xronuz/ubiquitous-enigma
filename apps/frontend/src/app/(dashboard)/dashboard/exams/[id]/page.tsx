'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/store/confirm.store';
import {
  ArrowLeft, Trophy, Users, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Calendar, Clock, BookOpen, Download,
  Edit3, Save, Loader2, FileQuestion, Upload, MonitorPlay,
  Plus, Trash2, ChevronDown, ChevronUp, FileUp, RefreshCw,
  ChevronLeft, ChevronRight, PlayCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { examsApi } from '@/lib/api/exams';
import { classesApi } from '@/lib/api/classes';
import { onlineExamApi, ExamQuestion, ExamSession, StartSessionResponse } from '@/lib/api/online-exam';
import { cn, getScoreColor } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { usePrint } from '@/hooks/use-print';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Grade {
  id: string;
  score: number;
  maxScore: number;
  comment?: string;
  student: { id: string; firstName: string; lastName: string };
}

interface ExamResult {
  exam: {
    id: string;
    title: string;
    frequency: string;
    maxScore: number;
    duration?: number;
    scheduledAt: string;
    isPublished: boolean;
    classId: string;
    class: { id: string; name: string };
    subject: { id: string; name: string };
  };
  grades: Grade[];
  stats: {
    total: number;
    avg: number;
    max: number;
    min: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FREQ_UZ: Record<string, string> = {
  WEEKLY: 'Haftalik',
  MONTHLY: 'Oylik',
  QUARTERLY: 'Choraklik',
  FINAL: 'Yakuniy',
};

const SCORE_COLORS = {
  excellent: '#22c55e',
  good: '#84cc16',
  average: '#f59e0b',
  poor: '#ef4444',
};

const scoreColor = getScoreColor;

function scoreBadgeVariant(pct: number): 'default' | 'secondary' | 'destructive' {
  if (pct >= 70) return 'default';
  if (pct >= 50) return 'secondary';
  return 'destructive';
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, icon: Icon, color, bg }: {
  label: string; value: string | number; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Score distribution ────────────────────────────────────────────────────────
function buildDistribution(grades: Grade[], maxScore: number) {
  const buckets = [
    { label: '90–100%', min: 90, count: 0, color: SCORE_COLORS.excellent },
    { label: '70–89%', min: 70, count: 0, color: SCORE_COLORS.good },
    { label: '50–69%', min: 50, count: 0, color: SCORE_COLORS.average },
    { label: '0–49%', min: 0, count: 0, color: SCORE_COLORS.poor },
  ];
  grades.forEach(g => {
    const pct = maxScore > 0 ? (g.score / maxScore) * 100 : 0;
    const b = pct >= 90 ? 0 : pct >= 70 ? 1 : pct >= 50 ? 2 : 3;
    buckets[b].count++;
  });
  return buckets;
}

function Loader() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

// ── Score Entry Tab ───────────────────────────────────────────────────────────
function ScoreEntryTab({ examId, exam, existingGrades }: {
  examId: string;
  exam: ExamResult['exam'];
  existingGrades: Grade[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['classes', exam.classId, 'students'],
    queryFn: () => classesApi.getStudents(exam.classId),
    enabled: !!exam.classId,
  });

  const students: any[] = Array.isArray(studentsData) ? studentsData : (studentsData as any)?.students ?? [];

  // Initialize scores from existing grades, keyed by studentId
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    existingGrades.forEach(g => { init[g.student.id] = String(g.score); });
    return init;
  });
  const [comments, setComments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    existingGrades.forEach(g => { if (g.comment) init[g.student.id] = g.comment; });
    return init;
  });

  const submitMutation = useMutation({
    mutationFn: (results: { studentId: string; score: number; comment?: string }[]) =>
      examsApi.submitBulkResults(examId, results),
    onSuccess: (data: { saved: number }) => {
      toast({ title: `✅ ${data.saved} ta natija saqlandi` });
      queryClient.invalidateQueries({ queryKey: ['exams', examId, 'results'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleSave = () => {
    const results = students
      .filter(s => scores[s.id] !== undefined && scores[s.id] !== '')
      .map(s => ({
        studentId: s.id,
        score: Math.min(exam.maxScore, Math.max(0, Number(scores[s.id]))),
        comment: comments[s.id] || undefined,
      }));
    if (results.length === 0) {
      toast({ variant: 'destructive', title: 'Kamida 1 ta ball kiriting' });
      return;
    }
    submitMutation.mutate(results);
  };

  if (studentsLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }

  if (students.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Bu sinfda o'quvchilar topilmadi</p>
      </div>
    );
  }

  const filledCount = students.filter(s => scores[s.id] !== undefined && scores[s.id] !== '').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filledCount} / {students.length} o'quvchi uchun ball kiritilgan
        </p>
        <Button onClick={handleSave} disabled={submitMutation.isPending}>
          {submitMutation.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saqlanmoqda...</>
            : <><Save className="mr-2 h-4 w-4" /> Saqlash</>}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">#</th>
              <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">O'quvchi</th>
              <th className="text-center py-2.5 px-4 font-medium text-muted-foreground w-36">
                Ball (maks: {exam.maxScore})
              </th>
              <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Izoh</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s: any, i: number) => {
              const score = scores[s.id] ?? '';
              const numScore = score !== '' ? Number(score) : null;
              const pct = numScore !== null && exam.maxScore > 0 ? (numScore / exam.maxScore) * 100 : null;
              return (
                <tr key={s.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-4 text-muted-foreground">{i + 1}</td>
                  <td className="py-2.5 px-4 font-medium">{s.firstName} {s.lastName}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2 justify-center">
                      <Input
                        type="number"
                        min={0}
                        max={exam.maxScore}
                        value={score}
                        onChange={e => setScores(prev => ({ ...prev, [s.id]: e.target.value }))}
                        className="w-20 text-center h-8 text-sm"
                        placeholder="—"
                      />
                      {pct !== null && (
                        <span className="text-xs font-medium w-10 text-right" style={{ color: scoreColor(pct) }}>
                          {Math.round(pct)}%
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <Input
                      value={comments[s.id] ?? ''}
                      onChange={e => setComments(prev => ({ ...prev, [s.id]: e.target.value }))}
                      className="h-8 text-sm"
                      placeholder="Ixtiyoriy izoh..."
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={submitMutation.isPending}>
          {submitMutation.isPending
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saqlanmoqda...</>
            : <><Save className="mr-2 h-4 w-4" /> Saqlash</>}
        </Button>
      </div>
    </div>
  );
}

// ── Questions Tab ─────────────────────────────────────────────────────────────
const QUESTION_TYPE_UZ: Record<string, string> = {
  multiple_choice: 'Ko\'p variantli',
  true_false: "To'g'ri/Noto'g'ri",
  short_answer: 'Qisqa javob',
  essay: 'Insho',
};

function QuestionsTab({ examId }: { examId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newQ, setNewQ] = useState({ type: 'multiple_choice', text: '', points: 1, explanation: '', options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]});

  const { data: questions = [], isLoading } = useQuery<ExamQuestion[]>({
    queryKey: ['online-exam', examId, 'questions'],
    queryFn: () => onlineExamApi.getQuestions(examId),
  });

  const deleteMut = useMutation({
    mutationFn: (qId: string) => onlineExamApi.deleteQuestion(examId, qId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-exam', examId, 'questions'] });
      toast({ title: "Savol o'chirildi" });
    },
  });

  const addMut = useMutation({
    mutationFn: () => onlineExamApi.addQuestion(examId, {
      type: newQ.type,
      text: newQ.text,
      points: newQ.points,
      explanation: newQ.explanation || undefined,
      options: newQ.type === 'multiple_choice' || newQ.type === 'true_false'
        ? newQ.options.filter(o => o.text.trim())
        : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['online-exam', examId, 'questions'] });
      toast({ title: 'Savol qo\'shildi' });
      setShowForm(false);
      setNewQ({ type: 'multiple_choice', text: '', points: 1, explanation: '', options: [
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
        { text: '', isCorrect: false }, { text: '', isCorrect: false },
      ]});
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{questions.length} ta savol</p>
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus className="mr-1.5 h-4 w-4" /> Savol qo'shish
        </Button>
      </div>

      {/* Add question form */}
      {showForm && (
        <Card className="border-dashed border-primary/50">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">Savol turi</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={newQ.type}
                  onChange={e => setNewQ(p => ({ ...p, type: e.target.value }))}
                >
                  {Object.entries(QUESTION_TYPE_UZ).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Ball</label>
                <Input
                  type="number" min={0.5} max={100} step={0.5}
                  value={newQ.points}
                  onChange={e => setNewQ(p => ({ ...p, points: Number(e.target.value) }))}
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Savol matni</label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                placeholder="Savol matnini kiriting..."
                value={newQ.text}
                onChange={e => setNewQ(p => ({ ...p, text: e.target.value }))}
              />
            </div>
            {(newQ.type === 'multiple_choice' || newQ.type === 'true_false') && (
              <div className="space-y-2">
                <label className="text-xs font-medium block">
                  Variantlar (to'g'ri javobni belgilang)
                </label>
                {newQ.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">
                      {String.fromCharCode(65 + i)})
                    </span>
                    <Input
                      value={opt.text}
                      onChange={e => setNewQ(p => ({
                        ...p,
                        options: p.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o),
                      }))}
                      className="h-8 text-sm flex-1"
                      placeholder={`Variant ${String.fromCharCode(65 + i)}`}
                    />
                    <input
                      type="checkbox"
                      checked={opt.isCorrect}
                      onChange={e => setNewQ(p => ({
                        ...p,
                        options: p.options.map((o, j) =>
                          newQ.type === 'true_false'
                            ? { ...o, isCorrect: j === i ? e.target.checked : false }
                            : j === i ? { ...o, isCorrect: e.target.checked } : o
                        ),
                      }))}
                      className="h-4 w-4 cursor-pointer"
                      title="To'g'ri javob"
                    />
                  </div>
                ))}
              </div>
            )}
            <Input
              placeholder="Izoh (ixtiyoriy)..."
              value={newQ.explanation}
              onChange={e => setNewQ(p => ({ ...p, explanation: e.target.value }))}
              className="h-8 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Bekor</Button>
              <Button size="sm" disabled={!newQ.text.trim() || addMut.isPending} onClick={() => addMut.mutate()}>
                {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Qo\'shish'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileQuestion className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Hali savollar qo'shilmagan</p>
          <p className="text-xs mt-1">Yuqoridagi tugma orqali qo'lda qo'shing yoki DocX import qiling</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <Card key={q.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-sm font-bold text-muted-foreground min-w-[24px]">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-xs">{QUESTION_TYPE_UZ[q.type] ?? q.type}</Badge>
                      <Badge variant="secondary" className="text-xs">{q.points} ball</Badge>
                    </div>
                    <p className="text-sm font-medium">{q.text}</p>
                    {q.options.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((o, j) => (
                          <li key={o.id} className={`text-xs flex items-center gap-1.5 ${o.isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                            <span className="font-bold">{String.fromCharCode(65 + j)})</span>
                            {o.text}
                            {o.isCorrect && <CheckCircle className="h-3 w-3" />}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-1 italic">💡 {q.explanation}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="text-destructive hover:text-destructive h-7 w-7 shrink-0"
                    onClick={() => deleteMut.mutate(q.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DocX Import Tab ──────────────────────────────────────────────────────────
function DocxImportTab({ examId }: { examId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const importMut = useMutation({
    mutationFn: (file: File) => onlineExamApi.importFromDocx(examId, file),
    onSuccess: (data) => {
      setResult({ imported: data.imported });
      queryClient.invalidateQueries({ queryKey: ['online-exam', examId, 'questions'] });
      toast({ title: `✅ ${data.imported} ta savol import qilindi` });
    },
    onError: (e: any) => toast({
      variant: 'destructive',
      title: 'Import xatosi',
      description: e?.response?.data?.message ?? 'Hujjatni tekshiring',
    }),
  });

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (!file.name.endsWith('.docx')) {
      toast({ variant: 'destructive', title: 'Faqat .docx fayl qabul qilinadi' });
      return;
    }
    setResult(null);
    importMut.mutate(file);
  }, [importMut, toast]);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <Card className="border-dashed">
        <CardContent className="pt-6 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className={`p-4 rounded-full transition-colors ${dragging ? 'bg-primary/20' : 'bg-muted'}`}>
              <FileUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium">Word hujjatini yuklang</p>
            <p className="text-sm text-muted-foreground mt-1">Savollar avtomatik ajratib olinadi (.docx)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={importMut.isPending}
            className="w-full"
          >
            {importMut.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Import qilinmoqda...</>
              : <><Upload className="mr-2 h-4 w-4" /> Fayl tanlash</>}
          </Button>
          {result && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium justify-center bg-green-50 dark:bg-green-950/30 py-2 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              {result.imported} ta savol muvaffaqiyatli import qilindi
            </div>
          )}
        </CardContent>
      </Card>

      {/* Format guide */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fayl formati</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Ko'p variantli savol:</p>
          <pre className="bg-muted rounded p-2 text-xs overflow-auto leading-relaxed">{`1. Savol matni?
A) Birinchi variant
B) Ikkinchi variant
C) To'g'ri javob *
D) To'rtinchi variant`}</pre>
          <p className="font-medium text-foreground mt-3">To'g'ri / Noto'g'ri:</p>
          <pre className="bg-muted rounded p-2 text-xs overflow-auto leading-relaxed">{`2. Bu gap to'g'rimi? [to'g'ri]
3. Bu noto'g'rimi? [noto'g'ri]`}</pre>
          <p className="text-xs mt-2">
            <span className="text-primary font-medium">*</span> — to'g'ri javob belgisi<br />
            <span className="text-primary font-medium">[to'g'ri]</span> — T/F savolda to'g'ri javob
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Student Exam View ─────────────────────────────────────────────────────────
type ExamPhase = 'pre' | 'taking' | 'result';

function StudentExamView({ examId, exam }: {
  examId: string;
  exam: ExamResult['exam'];
}) {
  const ask = useConfirm();
  const { toast } = useToast();
  const [phase, setPhase] = useState<ExamPhase>('pre');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<StartSessionResponse['questions']>([] as StartSessionResponse['questions']);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; textAnswer?: string }>>({});
  const [result, setResult] = useState<{ score: number; total: number; percentage: number; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'taking' || !exam.duration) return;
    setTimeLeft(exam.duration * 60);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-submit when timer hits 0
  const submitRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (timeLeft === 0 && phase === 'taking') {
      toast({ title: '⏰ Vaqt tugadi! Imtihon avtomatik topshirildi.' });
      submitRef.current?.();
    }
  }, [timeLeft, phase, toast]);

  const startMutation = useMutation({
    mutationFn: () => onlineExamApi.startSession(examId),
    onSuccess: (data) => {
      setSession(data.session);
      setQuestions(data.questions);
      setCurrentIdx(0);
      setAnswers({});
      setPhase('taking');
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Imtihonni boshlashda xato' }),
  });

  const saveAnswerMutation = useMutation({
    mutationFn: (payload: { questionId: string; selectedOptionId?: string; textAnswer?: string }) =>
      onlineExamApi.saveAnswer(session!.id, payload),
  });

  const submitMutation = useMutation({
    mutationFn: () => onlineExamApi.submitSession(session!.id),
    onSuccess: (data) => {
      setResult(data);
      setPhase('result');
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Topshirishda xato' }),
  });

  // Wire submit ref for auto-submit
  useEffect(() => {
    submitRef.current = () => { if (!submitMutation.isPending) submitMutation.mutate(); };
  });

  const handleAnswer = (questionId: string, selectedOptionId?: string, textAnswer?: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: { selectedOptionId, textAnswer } }));
    if (session) saveAnswerMutation.mutate({ questionId, selectedOptionId, textAnswer });
  };

  const handleSubmit = () => {
    if (!session || submitMutation.isPending) return;
    submitMutation.mutate();
  };

  // ── PRE phase ────────────────────────────────────────────────────────────────
  if (phase === 'pre') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center max-w-md mx-auto">
        <div className="p-5 rounded-full bg-primary/10">
          <PlayCircle className="h-14 w-14 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">{exam.title}</h2>
          <p className="text-muted-foreground mt-1">{exam.subject?.name ?? ''}</p>
        </div>
        <div className="flex gap-6 text-sm flex-wrap justify-center">
          {exam.duration && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" /> {exam.duration} daqiqa
            </div>
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Trophy className="h-4 w-4" /> Maks: {exam.maxScore} ball
          </div>
        </div>
        <div className="w-full text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          ⚠️ Imtihon boshlanganidan so&apos;ng uni to&apos;xtatib bo&apos;lmaydi. Barcha savollarni diqqat bilan o&apos;qing.
        </div>
        <Button size="lg" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
          {startMutation.isPending
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Yuklanmoqda...</>
            : 'Imtihonni boshlash'}
        </Button>
      </div>
    );
  }

  // ── TAKING phase ─────────────────────────────────────────────────────────────
  if (phase === 'taking') {
    const q = questions[currentIdx];
    if (!q) return null;
    const currentAnswer = answers[q.id] ?? {};
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="space-y-4">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Savol {currentIdx + 1} / {questions.length}
            {' · '}
            <span className="text-foreground font-medium">{answeredCount} ta javob</span>
          </span>
          {timeLeft !== null && (
            <span className={cn(
              'flex items-center gap-1.5 text-sm font-mono font-bold',
              timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-foreground',
            )}>
              <Clock className="h-4 w-4" />
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                {currentIdx + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-base leading-relaxed whitespace-pre-wrap">{q.text}</p>
                <p className="text-xs text-muted-foreground mt-1">{q.points} ball</p>
              </div>
            </div>

            {/* Multiple choice / True-false */}
            {(q.type === 'multiple_choice' || q.type === 'true_false') && (
              <div className="space-y-2 pl-11">
                {q.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleAnswer(q.id, opt.id, undefined)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border text-sm transition-all',
                      currentAnswer.selectedOptionId === opt.id
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50',
                    )}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            )}

            {/* Short answer / Essay */}
            {(q.type === 'short_answer' || q.type === 'essay') && (
              <div className="pl-11">
                <textarea
                  value={currentAnswer.textAnswer ?? ''}
                  onChange={e => handleAnswer(q.id, undefined, e.target.value)}
                  placeholder={q.type === 'essay' ? 'Keng javob yozing...' : 'Qisqa javob...'}
                  rows={q.type === 'essay' ? 6 : 3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Oldingi
          </Button>

          {/* Question dots */}
          <div className="flex gap-1 flex-wrap justify-center">
            {questions.map((qItem, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                title={`Savol ${i + 1}`}
                className={cn(
                  'w-7 h-7 rounded text-xs font-medium transition-all',
                  i === currentIdx
                    ? 'bg-primary text-primary-foreground'
                    : answers[qItem.id]
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground hover:bg-muted/60',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {currentIdx < questions.length - 1 ? (
            <Button onClick={() => setCurrentIdx(i => Math.min(questions.length - 1, i + 1))}>
              Keyingi <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={async () => {
                if (await ask({ title: 'Imtihonni topshirasizmi?', description: `${answeredCount}/${questions.length} ta savolga javob berdingiz.`, confirmText: 'Topshirish' })) {
                  handleSubmit();
                }
              }}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Topshirilmoqda...</>
                : 'Topshirish ✓'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── RESULT phase ─────────────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const passed = result.percentage >= 50;
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div className={cn('p-5 rounded-full', passed ? 'bg-green-500/10' : 'bg-red-500/10')}>
          {passed
            ? <Trophy className="h-16 w-16 text-green-500" />
            : <XCircle className="h-16 w-16 text-red-500" />}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{passed ? 'Tabriklaymiz! 🎉' : "Afsuski..."}</h2>
          <p className="text-muted-foreground mt-1">{result.message}</p>
        </div>
        <div className="flex gap-10 text-center flex-wrap justify-center">
          <div>
            <p className="text-4xl font-bold" style={{ color: scoreColor(result.percentage) }}>
              {result.score}
            </p>
            <p className="text-xs text-muted-foreground mt-1">/ {result.total} ball</p>
          </div>
          <div>
            <p className="text-4xl font-bold" style={{ color: scoreColor(result.percentage) }}>
              {result.percentage}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Foiz</p>
          </div>
          <div>
            <p className={cn('text-4xl font-bold', passed ? 'text-green-600' : 'text-red-500')}>
              {passed ? "O'tdi" : "O'tmadi"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Natija</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          O&apos;qituvchingiz natijalaringizni tekshirgach, to&apos;liq ball ko&apos;rsatiladi.
        </p>
      </div>
    );
  }

  return null;
}

// ── Session Monitor Tab ───────────────────────────────────────────────────────
const SESSION_STATUS_UZ: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'Jarayonda', color: 'text-blue-600' },
  submitted:   { label: 'Topshirildi', color: 'text-green-600' },
  timed_out:   { label: 'Vaqt tugadi', color: 'text-orange-500' },
  graded:      { label: 'Baholandi', color: 'text-purple-600' },
};

function SessionMonitorTab({ examId }: { examId: string }) {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<ExamSession[]>({
    queryKey: ['online-exam', examId, 'sessions'],
    queryFn: () => onlineExamApi.getExamSessions(examId),
    refetchInterval: 10_000,
  });

  const submitted = sessions.filter(s => s.status === 'submitted' || s.status === 'graded');
  const inProgress = sessions.filter(s => s.status === 'in_progress');

  if (isLoading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="text-sm">
            <span className="font-bold text-blue-600">{inProgress.length}</span>
            <span className="text-muted-foreground ml-1">jarayonda</span>
          </div>
          <div className="text-sm">
            <span className="font-bold text-green-600">{submitted.length}</span>
            <span className="text-muted-foreground ml-1">topshirildi</span>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['online-exam', examId, 'sessions'] })}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <MonitorPlay className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Hali birorta o'quvchi imtihon boshlamagan</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">#</th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">O'quvchi</th>
                <th className="text-center py-2.5 px-4 font-medium text-muted-foreground">Holat</th>
                <th className="text-center py-2.5 px-4 font-medium text-muted-foreground">Ball</th>
                <th className="text-center py-2.5 px-4 font-medium text-muted-foreground">%</th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => {
                const st = SESSION_STATUS_UZ[s.status] ?? { label: s.status, color: '' };
                return (
                  <tr key={s.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{i + 1}</td>
                    <td className="py-3 px-4 font-medium">
                      {s.student ? `${s.student.firstName} ${s.student.lastName}` : s.studentId}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {s.score != null ? s.score : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.percentage != null ? `${s.percentage}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {s.submittedAt
                        ? new Date(s.submittedAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                        : new Date(s.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExamResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const canEdit = ['school_admin', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student';

  const { data, isLoading, isError } = useQuery<ExamResult>({
    queryKey: ['exams', id, 'results'],
    queryFn: () => examsApi.getResults(id),
    enabled: !!id,
  });

  const { printRef, handlePrint } = usePrint({
    title: data ? `${data.exam.title} — Natijalar` : 'Imtihon natijalari',
  });

  if (isLoading) return <div className="space-y-6"><Loader /></div>;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="text-5xl">😔</div>
        <p className="text-xl font-bold">Ma&apos;lumot topilmadi</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
        </Button>
      </div>
    );
  }

  const { exam, grades, stats } = data;
  const distribution = buildDistribution(grades, exam.maxScore);
  const pieData = [
    { name: 'O\'tdi', value: stats.passed, color: SCORE_COLORS.excellent },
    { name: 'O\'tmadi', value: stats.failed, color: SCORE_COLORS.poor },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              <Badge variant={exam.isPublished ? 'default' : 'secondary'}>
                {exam.isPublished ? 'Nashr qilingan' : 'Qoralama'}
              </Badge>
              <Badge variant="outline">{FREQ_UZ[exam.frequency] ?? exam.frequency}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> {exam.subject.name}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {exam.class.name}-sinf
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(exam.scheduledAt).toLocaleDateString('uz-UZ', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
              {exam.duration && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {exam.duration} daqiqa
                </span>
              )}
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={handlePrint}>
          <Download className="mr-2 h-4 w-4" /> PDF eksport
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={isStudent ? 'take' : 'results'}>
        <TabsList className="flex-wrap h-auto gap-1">
          {isStudent && (
            <TabsTrigger value="take">
              <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Imtihon topshirish
            </TabsTrigger>
          )}
          <TabsTrigger value="results">Natijalar ({grades.length})</TabsTrigger>
          {canEdit && (
            <TabsTrigger value="entry">
              <Edit3 className="mr-1.5 h-3.5 w-3.5" /> Ball kiritish
            </TabsTrigger>
          )}
          {canEdit && (
            <TabsTrigger value="questions">
              <FileQuestion className="mr-1.5 h-3.5 w-3.5" /> Savollar
            </TabsTrigger>
          )}
          {canEdit && (
            <TabsTrigger value="docx-import">
              <FileUp className="mr-1.5 h-3.5 w-3.5" /> DocX import
            </TabsTrigger>
          )}
          {canEdit && (
            <TabsTrigger value="sessions">
              <MonitorPlay className="mr-1.5 h-3.5 w-3.5" /> Monitoring
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Student take exam tab ──────────────────────────────────────── */}
        {isStudent && (
          <TabsContent value="take" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Online imtihon</CardTitle>
                <CardDescription>
                  {exam.title} · {exam.subject.name}
                  {exam.duration ? ` · ${exam.duration} daqiqa` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentExamView examId={id} exam={exam} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Results tab ────────────────────────────────────────────────── */}
        <TabsContent value="results" className="mt-4">
          <div ref={printRef} className="space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPI label="Jami ishtirokchi" value={stats.total} icon={Users}
                color="text-primary" bg="bg-primary/10" />
              <KPI label="O'rtacha ball" value={`${stats.avg} / ${exam.maxScore}`} icon={TrendingUp}
                color="text-blue-500" bg="bg-blue-500/10" />
              <KPI label="O'tdi" value={`${stats.passed} (${stats.passRate}%)`} icon={CheckCircle}
                color="text-green-500" bg="bg-green-500/10" />
              <KPI label="O'tmadi" value={stats.failed} icon={XCircle}
                color="text-red-500" bg="bg-red-500/10" />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Ball taqsimoti</CardTitle>
                  <CardDescription>Toifalar bo'yicha o'quvchilar soni</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={distribution} barSize={52}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [`${v} o'quvchi`, 'Soni']}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="count" name="O'quvchilar" radius={[6, 6, 0, 0]}>
                        {distribution.map((b, i) => <Cell key={i} fill={b.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {pieData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">O'tdi / O'tmadi</CardTitle>
                    <CardDescription>
                      O'tish chegarasi: {exam.maxScore * 0.5} ball (50%)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                          labelLine={false}
                        >
                          {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Legend />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Min / Max / Avg */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10">
                    <Trophy className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Eng yuqori ball</p>
                    <p className="text-xl font-bold text-green-600">{stats.max} / {exam.maxScore}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">O'rtacha</p>
                    <p className="text-xl font-bold text-blue-600">
                      {stats.avg} / {exam.maxScore}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        ({exam.maxScore > 0 ? Math.round((stats.avg / exam.maxScore) * 100) : 0}%)
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-red-500/10">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Eng past ball</p>
                    <p className="text-xl font-bold text-red-600">{stats.min} / {exam.maxScore}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Natijalar jadvali ({grades.length} ta)
                </CardTitle>
                <CardDescription>Ball bo'yicha kamayish tartibida</CardDescription>
              </CardHeader>
              <CardContent>
                {grades.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Hali natijalar kiritilmagan</p>
                    {canEdit && (
                      <p className="text-xs mt-1">
                        <strong>Ball kiritish</strong> tabini bosib natijalar kiriting
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2.5 font-medium text-muted-foreground pr-4">#</th>
                          <th className="text-left py-2.5 font-medium text-muted-foreground">O&apos;quvchi</th>
                          <th className="text-center py-2.5 font-medium text-muted-foreground">Ball</th>
                          <th className="text-center py-2.5 font-medium text-muted-foreground">%</th>
                          <th className="text-center py-2.5 font-medium text-muted-foreground">Holat</th>
                          {grades.some(g => g.comment) && (
                            <th className="text-left py-2.5 font-medium text-muted-foreground">Izoh</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((g, i) => {
                          const pct = exam.maxScore > 0 ? Math.round((g.score / exam.maxScore) * 100) : 0;
                          const passed = g.score >= exam.maxScore * 0.5;
                          return (
                            <tr key={g.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-3 text-muted-foreground pr-4">{i + 1}</td>
                              <td className="py-3 font-medium">
                                {g.student.firstName} {g.student.lastName}
                              </td>
                              <td className="py-3 text-center">
                                <span className="font-bold text-base" style={{ color: scoreColor(pct) }}>
                                  {g.score}
                                </span>
                                <span className="text-muted-foreground text-xs">/{exam.maxScore}</span>
                              </td>
                              <td className="py-3 text-center">
                                <Badge variant={scoreBadgeVariant(pct)} className="text-xs">
                                  {pct}%
                                </Badge>
                              </td>
                              <td className="py-3 text-center">
                                {passed ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                                    <CheckCircle className="h-3.5 w-3.5" /> O&apos;tdi
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                                    <XCircle className="h-3.5 w-3.5" /> O&apos;tmadi
                                  </span>
                                )}
                              </td>
                              {grades.some(g2 => g2.comment) && (
                                <td className="py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                                  {g.comment ?? '—'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Score Entry tab ────────────────────────────────────────────── */}
        {canEdit && (
          <TabsContent value="entry" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ball kiritish</CardTitle>
                <CardDescription>
                  {exam.class.name}-sinf · {exam.subject.name} · Maks ball: {exam.maxScore}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScoreEntryTab examId={id} exam={exam} existingGrades={grades} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Questions tab ──────────────────────────────────────────────── */}
        {canEdit && (
          <TabsContent value="questions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Online imtihon savollari</CardTitle>
                <CardDescription>
                  Savollarni qo'lda qo'shing yoki DocX import qiling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionsTab examId={id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── DocX Import tab ────────────────────────────────────────────── */}
        {canEdit && (
          <TabsContent value="docx-import" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Word hujjatidan import</CardTitle>
                <CardDescription>
                  .docx fayl yuklang — savollar avtomatik ajratib olinadi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocxImportTab examId={id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Session Monitor tab ────────────────────────────────────────── */}
        {canEdit && (
          <TabsContent value="sessions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Real-vaqt monitoring</CardTitle>
                <CardDescription>
                  O'quvchilar imtihon jarayoni — har 10 soniyada yangilanadi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SessionMonitorTab examId={id} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
