'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { classesApi } from '@/lib/api/classes';
import { attendanceApi } from '@/lib/api/attendance';
import { subjectsApi } from '@/lib/api/subjects';
import { gradesApi } from '@/lib/api/grades';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import {
  School, Users, ClipboardCheck, BarChart2,
  BookOpen, CheckCircle2, XCircle, Clock,
  AlertCircle, ChevronRight, Loader2, UserCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Lowercase enum values matching the backend
type AttStatus = 'present' | 'absent' | 'late' | 'excused';
type GradeTypeVal = 'homework' | 'classwork' | 'test' | 'exam' | 'quarterly' | 'final';

const STATUS_CONFIG: Record<AttStatus, { label: string; color: string; icon: React.ElementType }> = {
  present:  { label: 'Keldi',     color: 'bg-green-100 text-green-700 border-green-200',   icon: CheckCircle2 },
  absent:   { label: 'Kelmadi',   color: 'bg-red-100 text-red-700 border-red-200',          icon: XCircle },
  late:     { label: 'Kechikdi',  color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  excused:  { label: 'Uzrli',     color: 'bg-blue-100 text-blue-700 border-blue-200',        icon: AlertCircle },
};

const GRADE_TYPES: { value: GradeTypeVal; label: string }[] = [
  { value: 'classwork', label: 'Darsda' },
  { value: 'homework',  label: 'Uy vazifa' },
  { value: 'test',      label: 'Test' },
  { value: 'exam',      label: 'Imtihon' },
  { value: 'quarterly', label: 'Choraklik' },
  { value: 'final',     label: 'Yakuniy' },
];

export default function MyClassPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  // ─── Fetch my class ───────────────────────────────────────────────────────
  const { data: cls, isLoading } = useQuery({
    queryKey: ['my-class'],
    queryFn: classesApi.getMyClass,
    enabled: user?.role === 'class_teacher',
    staleTime: 60_000,
  });

  // ─── Fetch my subjects ────────────────────────────────────────────────────
  const { data: mySubjects = [] } = useQuery({
    queryKey: ['subjects', 'mine'],
    queryFn: subjectsApi.getMine,
    enabled: user?.role === 'class_teacher',
    staleTime: 60_000,
  });

  // ─── Attendance state ─────────────────────────────────────────────────────
  const [attStatus, setAttStatus] = useState<Record<string, AttStatus>>({});
  const [attDate, setAttDate] = useState(today);

  const markAttMutation = useMutation({
    mutationFn: (entries: { studentId: string; status: AttStatus }[]) =>
      attendanceApi.mark({
        classId: cls!.id,
        date: attDate,
        entries: entries.map((e) => ({ studentId: e.studentId, status: e.status as any })),
      }),
    onSuccess: () => {
      toast({ title: 'Davomat saqlandi ✓' });
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: () => toast({ title: 'Xatolik', description: 'Davomat saqlanmadi', variant: 'destructive' }),
  });

  // ─── Grade dialog state ───────────────────────────────────────────────────
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    studentId: '',
    subjectId: '',
    score: '',
    maxScore: '10',
    type: 'classwork' as GradeTypeVal,
    comment: '',
  });

  const gradeMutation = useMutation({
    mutationFn: () =>
      gradesApi.create({
        studentId: gradeForm.studentId,
        classId: cls!.id,
        subjectId: gradeForm.subjectId,
        type: gradeForm.type as any,
        score: Number(gradeForm.score),
        maxScore: Number(gradeForm.maxScore),
        date: today,
        comment: gradeForm.comment || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Baho saqlandi ✓' });
      setGradeOpen(false);
      setGradeForm({ studentId: '', subjectId: '', score: '', maxScore: '10', type: 'classwork', comment: '' });
      qc.invalidateQueries({ queryKey: ['grades'] });
    },
    onError: () => toast({ title: 'Xatolik', description: 'Baho saqlanmadi', variant: 'destructive' }),
  });

  // ─── Loading / no class ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <School className="h-16 w-16 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold">Sinfingiz topilmadi</p>
          <p className="text-sm text-muted-foreground">Siz hali birorta sinfga sinf rahbari sifatida biriktirilmagansiz.</p>
        </div>
      </div>
    );
  }

  const students: any[] = cls.students?.map((e: any) => e.student) ?? [];
  const studentCount = cls._count?.students ?? students.length;

  const presentCount = Object.values(attStatus).filter((s) => s === 'present').length;
  const absentCount  = Object.values(attStatus).filter((s) => s === 'absent').length;
  const allMarked    = students.length > 0 && students.every((s) => attStatus[s.id]);

  const handleAllPresent = () => {
    const next: Record<string, AttStatus> = {};
    students.forEach((s) => (next[s.id] = 'present'));
    setAttStatus(next);
  };

  const handleSaveAttendance = () => {
    const entries = Object.entries(attStatus).map(([studentId, status]) => ({ studentId, status }));
    if (entries.length === 0) {
      toast({ title: 'Davomat belgilanmadi', description: 'Avval o\'quvchilar holatini belgilang', variant: 'destructive' });
      return;
    }
    markAttMutation.mutate(entries);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <School className="h-7 w-7 text-primary" />
            Mening sinfim — {cls.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {cls.gradeLevel}-sinf · {cls.academicYear} o'quv yili
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1 self-start">
          <Users className="h-4 w-4 mr-1" />
          {studentCount} o'quvchi
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 shrink-0"><Users className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-2xl font-bold">{studentCount}</p>
                <p className="text-xs text-muted-foreground">Jami o'quvchi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 shrink-0"><BookOpen className="h-5 w-5 text-purple-600" /></div>
              <div>
                <p className="text-2xl font-bold">{(mySubjects as any[]).length}</p>
                <p className="text-xs text-muted-foreground">Fanlarim</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 shrink-0"><ClipboardCheck className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Bugun keldi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 shrink-0"><XCircle className="h-5 w-5 text-red-600" /></div>
              <div>
                <p className="text-2xl font-bold">{absentCount}</p>
                <p className="text-xs text-muted-foreground">Bugun kelmadi</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="attendance">
            <ClipboardCheck className="h-4 w-4 mr-1" /> Davomat
          </TabsTrigger>
          <TabsTrigger value="students">
            <Users className="h-4 w-4 mr-1" /> O'quvchilar
          </TabsTrigger>
          <TabsTrigger value="grades">
            <BarChart2 className="h-4 w-4 mr-1" /> Baholar
          </TabsTrigger>
        </TabsList>

        {/* ── ATTENDANCE TAB ─────────────────────────────────────────────── */}
        <TabsContent value="attendance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Davomat belgilash</CardTitle>
                  <CardDescription>
                    {format(new Date(attDate), 'd MMMM yyyy', { locale: uz })}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-36"
                  />
                  <Button variant="outline" size="sm" onClick={handleAllPresent}>
                    Hammasi keldi
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveAttendance}
                    disabled={markAttMutation.isPending || !allMarked}
                  >
                    {markAttMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Saqlash
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">O'quvchilar topilmadi</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-2 text-left w-8 text-muted-foreground font-medium">#</th>
                        <th className="py-2 px-2 text-left text-muted-foreground font-medium">O'quvchi</th>
                        {(Object.keys(STATUS_CONFIG) as AttStatus[]).map((s) => (
                          <th key={s} className="py-2 px-2 text-center text-muted-foreground font-medium">
                            {STATUS_CONFIG[s].label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {students.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 px-2 font-medium">
                            {student.firstName} {student.lastName}
                          </td>
                          {(Object.keys(STATUS_CONFIG) as AttStatus[]).map((status) => (
                            <td key={status} className="py-2 px-2">
                              <button
                                onClick={() => setAttStatus((prev) => ({ ...prev, [student.id]: status }))}
                                className={cn(
                                  'h-7 w-7 rounded-full border-2 mx-auto flex items-center justify-center transition-all',
                                  attStatus[student.id] === status
                                    ? cn(STATUS_CONFIG[status].color, 'scale-110')
                                    : 'border-muted-foreground/20 hover:border-muted-foreground/50',
                                )}
                              >
                                {attStatus[student.id] === status && (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STUDENTS TAB ───────────────────────────────────────────────── */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>O'quvchilar ro'yxati</CardTitle>
              <CardDescription>{studentCount} ta o'quvchi</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">O'quvchilar topilmadi</p>
              ) : (
                <div className="divide-y">
                  {students.map((student, idx) => (
                    <div key={student.id} className="flex items-center gap-3 py-3">
                      <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {student.firstName} {student.lastName}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGradeForm((f) => ({ ...f, studentId: student.id }));
                          setGradeOpen(true);
                        }}
                      >
                        <BarChart2 className="h-4 w-4 mr-1" />
                        Baho qo'y
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── GRADES TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="grades" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Baho qo'yish</CardTitle>
                <CardDescription>O'quvchiga fan bo'yicha baho qo'ying</CardDescription>
              </div>
              <Button onClick={() => setGradeOpen(true)}>
                <BarChart2 className="h-4 w-4 mr-1" /> Baho qo'y
              </Button>
            </CardHeader>
            <CardContent>
              {(mySubjects as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Sizga biriktirilgan fan topilmadi
                </p>
              ) : (
                <div className="space-y-2">
                  {(mySubjects as any[]).map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{sub.name}</p>
                        {sub.class && (
                          <p className="text-xs text-muted-foreground">{sub.class.name}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGradeForm((f) => ({ ...f, subjectId: sub.id }));
                          setGradeOpen(true);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Grade Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Baho qo'yish</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Student */}
            <div className="space-y-1">
              <Label>O'quvchi</Label>
              <Select
                value={gradeForm.studentId}
                onValueChange={(v) => setGradeForm((f) => ({ ...f, studentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="O'quvchini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <Label>Fan</Label>
              <Select
                value={gradeForm.subjectId}
                onValueChange={(v) => setGradeForm((f) => ({ ...f, subjectId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fanni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {(mySubjects as any[]).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade type */}
            <div className="space-y-1">
              <Label>Baho turi</Label>
              <Select
                value={gradeForm.type}
                onValueChange={(v) => setGradeForm((f) => ({ ...f, type: v as GradeTypeVal }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ball</Label>
                <Input
                  type="number"
                  min="0"
                  max={gradeForm.maxScore}
                  value={gradeForm.score}
                  onChange={(e) => setGradeForm((f) => ({ ...f, score: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Maksimal ball</Label>
                <Input
                  type="number"
                  min="1"
                  value={gradeForm.maxScore}
                  onChange={(e) => setGradeForm((f) => ({ ...f, maxScore: e.target.value }))}
                />
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1">
              <Label>Izoh (ixtiyoriy)</Label>
              <Input
                value={gradeForm.comment}
                onChange={(e) => setGradeForm((f) => ({ ...f, comment: e.target.value }))}
                placeholder="Masalan: Faol ishtirok etdi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={() => gradeMutation.mutate()}
              disabled={
                gradeMutation.isPending ||
                !gradeForm.studentId ||
                !gradeForm.subjectId ||
                !gradeForm.score
              }
            >
              {gradeMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
