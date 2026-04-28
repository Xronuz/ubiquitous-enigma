'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart2, Plus, Loader2, Trash2, TrendingUp, Filter,
  BookOpen, Award, ChevronLeft, ChevronRight, Search, LayoutList, Save, Pencil, Check, X as XIcon,
  Download, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { gradesApi } from '@/lib/api/grades';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, getScoreColor } from '@/lib/utils';
import { GradeType } from '@eduplatform/types';
import { usePrint } from '@/hooks/use-print';
import { EmptyState } from '@/components/ui/empty-state';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell,
} from 'recharts';

// ── Constants ─────────────────────────────────────────────────────────────────
const GRADE_TYPES = [
  { value: GradeType.CLASSWORK, label: 'Joriy' },
  { value: GradeType.HOMEWORK, label: 'Uy vazifasi' },
  { value: GradeType.TEST, label: 'Test' },
  { value: GradeType.EXAM, label: 'Imtihon' },
  { value: GradeType.QUARTERLY, label: 'Choraklik' },
  { value: GradeType.FINAL, label: 'Yakuniy' },
];

const TYPE_COLORS: Record<string, string> = {
  classwork: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  homework:  'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  test:      'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  exam:      'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  quarterly: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  final:     'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300',
};

const EMPTY = {
  studentId: '', classId: '', subjectId: '',
  type: GradeType.CLASSWORK as string,
  score: '', maxScore: '100',
  date: new Date().toISOString().split('T')[0],
  comment: '',
};

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, max = 100, size = 'sm' }: { score: number; max?: number; size?: 'sm' | 'lg' }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color =
    pct >= 90 ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40' :
    pct >= 70 ? 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40' :
    pct >= 50 ? 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/40' :
                'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40';
  return (
    <span className={`inline-flex items-center rounded-full font-bold ${color} ${size === 'lg' ? 'px-3 py-1 text-base' : 'px-2 py-0.5 text-xs'}`}>
      {score}<span className="opacity-60 font-normal">/{max}</span>
    </span>
  );
}

// ── Inline Score Editor ───────────────────────────────────────────────────────
function InlineScoreEdit({
  gradeId, score, maxScore, canEdit,
}: {
  gradeId: string;
  score: number;
  maxScore: number;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(score));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const n = Number(draft);
    if (isNaN(n) || n < 0 || n > maxScore) {
      toast({ variant: 'destructive', title: `Ball 0–${maxScore} oralig'ida bo'lishi kerak` });
      return;
    }
    setSaving(true);
    try {
      await gradesApi.update(gradeId, { score: n });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast({ title: '✅ Ball yangilandi' });
      setEditing(false);
    } catch {
      toast({ variant: 'destructive', title: 'Xato', description: 'Saqlashda xato yuz berdi' });
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(String(score));
    setEditing(false);
  };

  if (!canEdit) return <ScoreBadge score={score} max={maxScore} />;

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={maxScore}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
          autoFocus
          className="w-14 rounded border border-primary px-1.5 py-0.5 text-xs font-bold text-center bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground">/{maxScore}</span>
        <button
          onClick={save}
          disabled={saving}
          className="rounded p-0.5 text-green-600 hover:bg-green-50 disabled:opacity-50"
          title="Saqlash"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={cancel}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          title="Bekor"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(score)); setEditing(true); }}
      className="group/score inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      title="Tahrirlash uchun bosing"
    >
      <ScoreBadge score={score} max={maxScore} />
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/score:opacity-60 transition-opacity" />
    </button>
  );
}

// ── GPA indicator ─────────────────────────────────────────────────────────────
function GpaBar({ gpa }: { gpa: number }) {
  const color = gpa >= 80 ? 'bg-green-500' : gpa >= 60 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${gpa}%` }} />
      </div>
      <span className="text-sm font-bold w-12 text-right">{gpa}%</span>
    </div>
  );
}

// ── Bulk Grade Dialog ─────────────────────────────────────────────────────────
function BulkGradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser , activeBranchId } = useAuthStore();
  const isBulkTeacher = ['teacher', 'class_teacher'].includes(currentUser?.role ?? '');

  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  const [bulkType, setBulkType] = useState(GradeType.CLASSWORK as string);
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkMaxScore, setBulkMaxScore] = useState('100');
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [bulkComments, setBulkComments] = useState<Record<string, string>>({});

  const { data: classes = [] } = useQuery({ queryKey: ['classes', activeBranchId], queryFn: classesApi.getAll });
  const classList: any[] = Array.isArray(classes) ? classes : [];

  // Teacher uchun faqat o'z fanlari; admin uchun sinfdagi barcha fanlar
  const { data: myBulkSubjects = [] } = useQuery({
    queryKey: ['subjects', 'mine', activeBranchId],
    queryFn: () => subjectsApi.getMine(),
    enabled: isBulkTeacher,
    staleTime: 60_000,
  });
  const { data: allBulkSubjects = [] } = useQuery({
    queryKey: ['subjects', bulkClassId, activeBranchId],
    queryFn: () => subjectsApi.getAll(bulkClassId || undefined),
    enabled: !isBulkTeacher && !!bulkClassId,
  });
  const subjectList: any[] = (isBulkTeacher ? myBulkSubjects : allBulkSubjects) as any[];

  const { data: studentsData } = useQuery({
    queryKey: ['class-students-bulk', bulkClassId, activeBranchId],
    queryFn: () => classesApi.getStudents(bulkClassId),
    enabled: !!bulkClassId,
  });
  const students: any[] = Array.isArray(studentsData) ? studentsData : [];

  const bulkMutation = useMutation({
    mutationFn: gradesApi.bulkCreate,
    onSuccess: (data: { saved: number }) => {
      toast({ title: `✅ ${data.saved} ta baho saqlandi` });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      onClose();
      setBulkScores({});
      setBulkComments({});
      setBulkClassId('');
      setBulkSubjectId('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleBulkSubmit = () => {
    const items = students
      .filter(s => {
        const st = s.student ?? s;
        return bulkScores[st.id] !== undefined && bulkScores[st.id] !== '';
      })
      .map(s => {
        const st = s.student ?? s;
        return {
          studentId: st.id,
          score: Math.max(0, Math.min(Number(bulkMaxScore), Number(bulkScores[st.id]))),
          comment: bulkComments[st.id] || undefined,
        };
      });
    if (!bulkClassId || !bulkSubjectId) {
      toast({ variant: 'destructive', title: 'Sinf va fanni tanlang' });
      return;
    }
    if (items.length === 0) {
      toast({ variant: 'destructive', title: 'Kamida 1 ta ball kiriting' });
      return;
    }
    bulkMutation.mutate({
      classId: bulkClassId,
      subjectId: bulkSubjectId,
      type: bulkType as GradeType,
      date: bulkDate,
      maxScore: Number(bulkMaxScore) || 100,
      items,
    });
  };

  const filledCount = students.filter(s => {
    const st = s.student ?? s;
    return bulkScores[st.id] !== undefined && bulkScores[st.id] !== '';
  }).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-primary" />
            Toplu baho kiritish
          </DialogTitle>
          <DialogDescription>Butun sinf uchun bir vaqtda baho kiriting</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Config row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sinf *</Label>
              <Select value={bulkClassId} onValueChange={v => { setBulkClassId(v); setBulkSubjectId(''); setBulkScores({}); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sinf..." /></SelectTrigger>
                <SelectContent>{classList.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fan *</Label>
              <Select value={bulkSubjectId} onValueChange={setBulkSubjectId} disabled={!bulkClassId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Fan..." /></SelectTrigger>
                <SelectContent>{subjectList.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Turi</Label>
              <Select value={bulkType} onValueChange={setBulkType}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{GRADE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sana</Label>
              <Input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Maks. ball:</Label>
            <Input type="number" min={1} max={1000} value={bulkMaxScore} onChange={e => setBulkMaxScore(e.target.value)} className="w-24 h-8 text-xs" />
            {filledCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {filledCount} / {students.length} ta kiritilgan
              </span>
            )}
          </div>

          {/* Students table */}
          {!bulkClassId ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Sinf tanlang</div>
          ) : students.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Bu sinfda o'quvchilar yo'q</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">#</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">O'quvchi</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs w-28">Ball</th>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s: any, i: number) => {
                    const student = s.student ?? s;
                    const score = bulkScores[student.id] ?? '';
                    const pct = score !== '' && Number(bulkMaxScore) > 0
                      ? Math.round((Number(score) / Number(bulkMaxScore)) * 100)
                      : null;
                    return (
                      <tr key={student.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="py-2 px-3 font-medium text-sm">{student.firstName} {student.lastName}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5 justify-center">
                            <Input
                              type="number" min={0} max={Number(bulkMaxScore)}
                              value={score}
                              onChange={e => setBulkScores(prev => ({ ...prev, [student.id]: e.target.value }))}
                              className="w-16 h-7 text-center text-xs"
                              placeholder="—"
                            />
                            {pct !== null && (
                              <span className={`text-xs font-medium w-8 ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {pct}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <Input
                            value={bulkComments[student.id] ?? ''}
                            onChange={e => setBulkComments(prev => ({ ...prev, [student.id]: e.target.value }))}
                            className="h-7 text-xs"
                            placeholder="Ixtiyoriy..."
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Bekor</Button>
          <Button onClick={handleBulkSubmit} disabled={bulkMutation.isPending}>
            {bulkMutation.isPending
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saqlanmoqda...</>
              : <><Save className="mr-2 h-4 w-4" /> Saqlash</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GradesPage() {
  const { user , activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isStudent = user?.role === 'student';
  const isTeacher = ['teacher', 'class_teacher'].includes(user?.role ?? '');
  const canManage = ['school_admin', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? '');

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const [activeTab, setActiveTab] = useState('view');
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { printRef, handlePrint } = usePrint({
    title: `Baholar jurnali${selectedClass ? ' — ' + selectedClass : ''}`,
  });

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: classes } = useQuery({ queryKey: ['classes', activeBranchId], queryFn: classesApi.getAll, enabled: !isStudent });
  const classList: any[] = Array.isArray(classes) ? classes : [];

  // Teacher/class_teacher: faqat o'z fanlari; admin: barcha fanlar
  const { data: mySubjects = [] } = useQuery({
    queryKey: ['subjects', 'mine', activeBranchId],
    queryFn: () => subjectsApi.getMine(),
    enabled: isTeacher,
    staleTime: 60_000,
  });
  const { data: allSubjects = [] } = useQuery({
    queryKey: ['subjects', form.classId || selectedClass, activeBranchId],
    queryFn: () => subjectsApi.getAll(form.classId || selectedClass || undefined),
    enabled: !isTeacher && (open || !!selectedClass),
  });
  const subjectList: any[] = (isTeacher ? mySubjects : allSubjects) as any[];

  const { data: classStudents = [] } = useQuery({
    queryKey: ['class-students-grades', form.classId, activeBranchId],
    queryFn: () => classesApi.getStudents(form.classId),
    enabled: open && !!form.classId,
  });
  const studentList: any[] = classStudents as any[];

  // My grades (student view)
  const { data: studentGrades, isLoading: studentLoading, isError: studentGradesError } = useQuery({
    queryKey: ['grades', 'student', user?.id, activeBranchId],
    queryFn: () => gradesApi.getStudentGrades(user!.id),
    enabled: isStudent && !!user?.id,
  });

  // Class journal (teacher/admin view)
  const { data: classReport, isLoading: classLoading, isError: classReportError } = useQuery({
    queryKey: ['grades', 'class', selectedClass, selectedSubject, page, activeBranchId],
    queryFn: () => gradesApi.getClassReport(selectedClass, selectedSubject || undefined, page, LIMIT),
    enabled: !isStudent && !!selectedClass,
  });

  const grades: any[] = classReport?.data ?? [];
  const meta = classReport?.meta;

  // ── Subject averages (from grades) ───────────────────────────────────────────
  const subjectStats = useMemo(() => {
    if (!grades.length) return [];
    const map = new Map<string, { name: string; total: number; count: number }>();
    grades.forEach(g => {
      const name = g.subject?.name ?? '—';
      const pct = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0;
      const existing = map.get(name) ?? { name, total: 0, count: 0 };
      map.set(name, { name, total: existing.total + pct, count: existing.count + 1 });
    });
    return Array.from(map.values())
      .map(v => ({ name: v.name, avg: Math.round(v.total / v.count) }))
      .sort((a, b) => b.avg - a.avg);
  }, [grades]);

  // ── Filter grades by student search ──────────────────────────────────────────
  const filteredGrades = useMemo(() => {
    if (!studentSearch) return grades;
    const q = studentSearch.toLowerCase();
    return grades.filter(g =>
      `${g.student?.firstName} ${g.student?.lastName}`.toLowerCase().includes(q)
    );
  }, [grades, studentSearch]);

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: gradesApi.create,
    onSuccess: () => {
      toast({ title: "✅ Baho qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: gradesApi.remove,
    onSuccess: () => {
      toast({ title: "Baho o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
  });

  // ── Validation & submit ───────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.studentId) e.studentId = "O'quvchi tanlang";
    if (!form.classId) e.classId = 'Sinf tanlang';
    if (!form.subjectId) e.subjectId = 'Fan tanlang';
    if (!form.score || isNaN(Number(form.score))) e.score = 'Ball kiriting';
    if (Number(form.score) > Number(form.maxScore)) e.score = 'Ball maksimumdan oshmasligi kerak';
    if (!form.date) e.date = 'Sana tanlang';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const sel = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      studentId: form.studentId,
      classId: form.classId,
      subjectId: form.subjectId,
      type: form.type as GradeType,
      score: Number(form.score),
      maxScore: Number(form.maxScore) || 100,
      date: form.date,
      comment: form.comment || undefined,
    });
  };

  // ── Student view ──────────────────────────────────────────────────────────────
  if (isStudent) {
    if (studentGradesError) {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Baholar yuklanmadi"
          description="Server bilan bog'lanishda xato yuz berdi. Sahifani yangilang"
        />
      );
    }

    const myGrades = studentGrades?.grades ?? [];
    const gpa = studentGrades?.gpa ?? 0;

    const bySubject = (myGrades as any[]).reduce<Record<string, { name: string; grades: any[] }>>((acc: Record<string, { name: string; grades: any[] }>, g: any) => {
      const name = g.subject?.name ?? '—';
      if (!acc[name]) acc[name] = { name, grades: [] };
      acc[name].grades.push(g);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart2 className="h-6 w-6 text-primary" /> Mening baholarim
            </h1>
            <p className="text-muted-foreground">O'quv yili natijalari</p>
          </div>
          {myGrades.length > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="mr-2 h-4 w-4" /> PDF yuklash
            </Button>
          )}
        </div>

        <div ref={printRef} className="space-y-6">

        {/* GPA summary */}
        {!studentLoading && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Umumiy o'rtacha ball</p>
                  <GpaBar gpa={gpa} />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">{gpa}%</p>
                  <p className="text-xs text-muted-foreground">{myGrades.length} ta baho</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Charts ── */}
        {!studentLoading && myGrades.length >= 3 && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Line chart: score trend over time */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Ball dinamikasi</CardTitle>
                <CardDescription>Oxirgi 20 ta baho bo'yicha</CardDescription>
              </CardHeader>
              <CardContent className="h-52 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...myGrades]
                      .reverse()
                      .slice(-20)
                      .map((g: any) => ({
                        date: new Date(g.date).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
                        pct: g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0,
                        subject: g.subject?.name,
                      }))}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip
                      formatter={(val: any, _: any, props: any) => [`${val}%`, props.payload?.subject ?? 'Ball']}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pct"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar chart: average per subject */}
            {Object.values(bySubject).length >= 3 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Fanlar bo'yicha radar</CardTitle>
                  <CardDescription>O'rtacha ball (100 balldan)</CardDescription>
                </CardHeader>
                <CardContent className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={(Object.values(bySubject) as { name: string; grades: any[] }[]).map(({ name, grades: gs }) => ({
                        subject: name.length > 8 ? name.slice(0, 8) + '…' : name,
                        value: gs.length > 0
                          ? Math.round(gs.reduce((s: number, g: any) => s + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / gs.length)
                          : 0,
                      }))}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
                      <Tooltip formatter={(val: any) => [`${val}%`, "O'rtacha"]} contentStyle={{ fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {studentLoading ? <Skeleton className="h-64" /> : (
          <div className="space-y-4">
            {(Object.values(bySubject) as { name: string; grades: any[] }[]).map(({ name, grades: gs }) => {
              const avg = gs.length > 0
                ? Math.round(gs.reduce((s: number, g: any) => s + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / gs.length)
                : 0;
              return (
                <Card key={name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" /> {name}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{gs.length} ta baho</span>
                        <ScoreBadge score={avg} max={100} />
                      </div>
                    </div>
                    <GpaBar gpa={avg} />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {gs.map((g: any) => (
                        <div key={g.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[g.type] ?? ''}`}>
                              {GRADE_TYPES.find(t => t.value === g.type)?.label ?? g.type}
                            </span>
                            <span className="text-muted-foreground text-xs">{formatDate(g.date)}</span>
                            {g.comment && <span className="text-xs italic text-muted-foreground">"{g.comment}"</span>}
                          </div>
                          <ScoreBadge score={g.score} max={g.maxScore} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!myGrades.length && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Baholar yo'q</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        </div>{/* /printRef */}
      </div>
    );
  }

  // ── Teacher / Admin view ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary" /> Baholar jurnali
          </h1>
          <p className="text-muted-foreground">Sinf bo'yicha baholar</p>
        </div>
        {selectedClass && grades.length > 0 && (
          <Button variant="outline" size="sm" onClick={handlePrint}>
            🖨️ Chop etish
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-sm">
          <TabsTrigger value="view">Ko'rish</TabsTrigger>
          {canManage && <TabsTrigger value="entry">Baho kirish</TabsTrigger>}
          {canManage && <TabsTrigger value="quarterly">Choraklik</TabsTrigger>}
        </TabsList>

        {/* ── Tab: Ko'rish ────────────────────────────────────────────── */}
        <TabsContent value="view" className="space-y-4 mt-4">
          {/* Class filter */}
          <div className="flex flex-wrap gap-2">
            {classList.map((cls: any) => (
              <Button
                key={cls.id}
                variant={selectedClass === cls.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setSelectedClass(cls.id); setSelectedSubject(''); setPage(1); }}
              >
                {cls.name}
              </Button>
            ))}
          </div>

          {selectedClass && (
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={!selectedSubject ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => { setSelectedSubject(''); setPage(1); }}
              >
                Barcha fanlar
              </Button>
              {subjectList.map(s => (
                <Button
                  key={s.id}
                  variant={selectedSubject === s.id ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => { setSelectedSubject(s.id); setPage(1); }}
                >
                  {s.name}
                </Button>
              ))}
            </div>
          )}

          {!selectedClass ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-lg font-medium text-muted-foreground">Sinf tanlang</p>
                <p className="text-sm text-muted-foreground mt-1">Baholarni ko'rish uchun yuqoridan sinf tanlang</p>
              </CardContent>
            </Card>
          ) : classLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : classReportError ? (
            <EmptyState
              icon={AlertCircle}
              title="Baholar yuklanmadi"
              description="Server bilan bog'lanishda xato yuz berdi. Sinf tanlash yoki sahifani yangilang"
            />
          ) : (
            <div ref={printRef} className="space-y-4">
              {/* Subject averages */}
              {subjectStats.length > 1 && !selectedSubject && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Fanlar bo'yicha o'rtacha ball</CardTitle>
                    </CardHeader>
                    <CardContent className="h-48 -ml-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={subjectStats} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                          <Tooltip formatter={(v: any) => [`${v}%`, "O'rtacha"]} contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                            {subjectStats.map((s, i) => (
                              <Cell
                                key={i}
                                fill={getScoreColor(s.avg)}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {subjectStats.map(s => (
                      <Card key={s.name} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => {
                          const found = subjectList.find(sub => sub.name === s.name);
                          if (found) { setSelectedSubject(found.id); setPage(1); }
                        }}>
                        <CardContent className="p-3">
                          <p className="text-xs text-muted-foreground truncate">{s.name}</p>
                          <p className="text-xl font-bold" style={{ color: getScoreColor(s.avg) }}>
                            {s.avg}%
                          </p>
                          <div className="h-1 rounded-full bg-muted mt-1 overflow-hidden">
                            <div className="h-full bg-primary/70" style={{ width: `${s.avg}%` }} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Grades table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        {selectedSubject
                          ? subjectList.find(s => s.id === selectedSubject)?.name + ' — Baholar'
                          : 'Barcha baholar'
                        }
                      </CardTitle>
                      {meta && (
                        <CardDescription>
                          Jami {meta.total} ta baho · {meta.totalPages} sahifa
                        </CardDescription>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        className="pl-8 h-8 w-44 text-sm"
                        placeholder="O'quvchi qidirish..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredGrades.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>Bu sinf uchun baholar yo'q</p>
                      {canManage && (
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => { setActiveTab('entry'); setForm({ ...EMPTY, classId: selectedClass }); setOpen(true); }}>
                          <Plus className="mr-2 h-3.5 w-3.5" /> Birinchi bahoni kiriting
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-6 px-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2.5 font-medium text-muted-foreground pr-4">O'quvchi</th>
                            <th className="text-left py-2.5 font-medium text-muted-foreground">Fan</th>
                            <th className="text-center py-2.5 font-medium text-muted-foreground">Tur</th>
                            <th className="text-center py-2.5 font-medium text-muted-foreground">Sana</th>
                            <th className="text-right py-2.5 font-medium text-muted-foreground">Ball</th>
                            {canManage && <th className="w-8" />}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredGrades.map((g: any) => (
                            <tr key={g.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors group">
                              <td className="py-2.5 font-medium pr-4">
                                {g.student?.firstName} {g.student?.lastName}
                              </td>
                              <td className="py-2.5 text-muted-foreground">{g.subject?.name}</td>
                              <td className="py-2.5 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[g.type] ?? ''}`}>
                                  {GRADE_TYPES.find(t => t.value === g.type)?.label ?? g.type}
                                </span>
                              </td>
                              <td className="py-2.5 text-center text-muted-foreground text-xs">
                                {formatDate(g.date)}
                              </td>
                              <td className="py-2.5 text-right">
                                <InlineScoreEdit
                                  gradeId={g.id}
                                  score={g.score}
                                  maxScore={g.maxScore}
                                  canEdit={canManage}
                                />
                              </td>
                              {canManage && (
                                <td className="py-2.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteMutation.mutate(g.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
                        {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, meta.total)} / {meta.total} ta
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
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Baho kirish ─────────────────────────────────────────── */}
        {canManage && (
          <TabsContent value="entry" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Single grade entry */}
              <Card className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                onClick={() => { setOpen(true); setForm(EMPTY); setErrors({}); }}>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="rounded-xl bg-primary/10 p-3 shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Yakka baho kiritish</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Bitta o'quvchiga baho qo'shish — sinf, fan, ball va izoh bilan
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk grade entry */}
              <Card className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                onClick={() => setBulkOpen(true)}>
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="rounded-xl bg-blue-500/10 p-3 shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <LayoutList className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Toplu baho kiritish</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Butun sinf uchun bir vaqtda baho kiriting — jadval ko'rinishida
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Grade types reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Baho turlari</CardTitle>
                <CardDescription className="text-xs">Har bir baho turi qachon ishlatilishi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {GRADE_TYPES.map(t => (
                    <div key={t.value} className="flex items-center gap-2 py-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[t.value] ?? ''}`}>{t.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.value === GradeType.CLASSWORK && 'Darsda bajarish'}
                        {t.value === GradeType.HOMEWORK && 'Uy vazifasi natijasi'}
                        {t.value === GradeType.TEST && 'Test yoki nazorat ishi'}
                        {t.value === GradeType.EXAM && 'Imtihon bahosi'}
                        {t.value === GradeType.QUARTERLY && 'Choraklik yakuniy baho'}
                        {t.value === GradeType.FINAL && 'Yillik yakuniy baho'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── Tab: Choraklik ───────────────────────────────────────────── */}
        {canManage && (
          <TabsContent value="quarterly" className="mt-4">
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-400" />
              <CardContent className="flex items-start gap-5 p-6">
                <div className="rounded-xl bg-green-500/10 p-4 shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold">Choraklik baholar</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Har chorak uchun yakuniy baholarni ko'rish, kiritish va tasdiqlash.
                      O'quvchilar reytingi, o'rtacha ball va taqqoslash grafiklari.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['I chorak', 'II chorak', 'III chorak', 'IV chorak'].map((q, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{q}</Badge>
                    ))}
                  </div>
                  <Button asChild>
                    <Link href="/dashboard/grades/quarterly">
                      <TrendingUp className="mr-2 h-4 w-4" /> Choraklik sahifasiga o'tish
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Bulk grade dialog */}
      <BulkGradeDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Baho qo'shish</DialogTitle>
            <DialogDescription>O'quvchiga yangi baho kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf <span className="text-destructive">*</span></Label>
                <Select value={form.classId} onValueChange={v => { sel('classId')(v); setForm(f => ({ ...f, studentId: '', subjectId: '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Sinf..." /></SelectTrigger>
                  <SelectContent>{classList.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.classId && <p className="text-xs text-destructive">{errors.classId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fan <span className="text-destructive">*</span></Label>
                <Select value={form.subjectId} onValueChange={sel('subjectId')}>
                  <SelectTrigger><SelectValue placeholder="Fan..." /></SelectTrigger>
                  <SelectContent>{subjectList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.subjectId && <p className="text-xs text-destructive">{errors.subjectId}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>O'quvchi <span className="text-destructive">*</span></Label>
              <Select value={form.studentId} onValueChange={sel('studentId')}>
                <SelectTrigger><SelectValue placeholder="O'quvchi tanlang..." /></SelectTrigger>
                <SelectContent>
                  {studentList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Turi</Label>
                <Select value={form.type} onValueChange={sel('type')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ball <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min={0} placeholder="85"
                  value={form.score}
                  onChange={e => { setForm(f => ({ ...f, score: e.target.value })); setErrors(er => { const n = { ...er }; delete n.score; return n; }); }}
                />
                {errors.score && <p className="text-xs text-destructive">{errors.score}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Maks.</Label>
                <Input type="number" min={1} value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Sana <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.date} onChange={e => { setForm(f => ({ ...f, date: e.target.value })); setErrors(er => { const n = { ...er }; delete n.date; return n; }); }} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input placeholder="Ixtiyoriy..." value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
