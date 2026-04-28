'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Clock, AlertCircle, Users, Save, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { classesApi } from '@/lib/api/classes';
import { attendanceApi } from '@/lib/api/attendance';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { AttendanceStatus } from '@eduplatform/types';
import { getInitials } from '@/lib/utils';

const STATUSES = [
  { value: AttendanceStatus.PRESENT,  label: 'Keldi',    icon: CheckCircle2, active: 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-400' },
  { value: AttendanceStatus.ABSENT,   label: 'Kelmadi',  icon: XCircle,      active: 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-400' },
  { value: AttendanceStatus.LATE,     label: 'Kechikdi', icon: Clock,        active: 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400' },
  { value: AttendanceStatus.EXCUSED,  label: 'Uzrli',    icon: AlertCircle,  active: 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-400' },
] as const;

const ALLOWED = ['school_admin', 'vice_principal', 'teacher', 'class_teacher'];

export default function BulkAttendancePage() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today);
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    if (user && !ALLOWED.includes(user.role)) router.replace('/dashboard');
  }, [user, router]);

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', classId, activeBranchId],
    queryFn: () => classesApi.getStudents(classId),
    enabled: !!classId,
  });

  const classList: any[] = Array.isArray(classes) ? classes : [];
  const studentList: any[] = Array.isArray(students) ? students : [];

  useEffect(() => {
    if (studentList.length > 0) {
      const defaults: Record<string, AttendanceStatus> = {};
      studentList.forEach((s: any) => {
        const id = s.student?.id ?? s.id;
        if (id) defaults[id] = AttendanceStatus.PRESENT;
      });
      setStatusMap(defaults);
    }
  }, [classId, students]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAll = (status: AttendanceStatus) => {
    const m: Record<string, AttendanceStatus> = {};
    studentList.forEach((s: any) => {
      const id = s.student?.id ?? s.id;
      if (id) m[id] = status;
    });
    setStatusMap(m);
  };

  const setOne = (id: string, status: AttendanceStatus) =>
    setStatusMap(prev => ({ ...prev, [id]: status }));

  const mutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(statusMap).map(([studentId, status]) => ({ studentId, status }));
      return attendanceApi.mark({ classId, date, entries });
    },
    onSuccess: () => {
      toast({ title: '✅ Davomat saqlandi' });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const counts = Object.values(statusMap).reduce<Record<string, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1; return acc;
  }, {});

  if (user && !ALLOWED.includes(user.role)) return null;

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/attendance"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Guruh davomati</h1>
          <p className="text-muted-foreground">Butun sinf uchun bir vaqtda davomat belgilash</p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Sinf *</Label>
              {classesLoading ? <Skeleton className="h-10" /> : (
                <Select value={classId} onValueChange={v => { setClassId(v); setStatusMap({}); }}>
                  <SelectTrigger><SelectValue placeholder="Sinf tanlang..." /></SelectTrigger>
                  <SelectContent>
                    {classList.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Sana *</Label>
              <input
                type="date"
                value={date}
                max={today}
                onChange={e => setDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tezkor</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => markAll(AttendanceStatus.PRESENT)}
                  className="flex-1 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                  ✅ Barchasi keldi
                </Button>
                <Button size="sm" variant="outline" onClick={() => markAll(AttendanceStatus.ABSENT)}
                  className="flex-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                  ❌ Barchasi kelmadi
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students */}
      {!classId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Avval sinf tanlang</p>
        </CardContent></Card>
      ) : studentsLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : studentList.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Bu sinfda o'quvchilar yo'q</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {studentList.map((item: any, idx: number) => {
            const student = item.student ?? item;
            const id = student.id;
            const cur = statusMap[id] ?? AttendanceStatus.PRESENT;
            return (
              <Card key={id}>
                <CardContent className="flex items-center gap-3 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                  </Avatar>
                  <p className="flex-1 min-w-0 font-medium text-sm truncate">
                    {student.firstName} {student.lastName}
                  </p>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {STATUSES.map(({ value, label, icon: Icon, active }) => (
                      <button
                        key={value}
                        onClick={() => setOne(id, value)}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                          cur === value ? active : 'border-transparent text-muted-foreground hover:border-border hover:bg-accent'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky footer */}
      {studentList.length > 0 && classId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-2xl border bg-background/95 backdrop-blur px-5 py-3 shadow-xl">
          <div className="flex gap-3 text-sm">
            <span className="text-green-600 font-semibold">✅ {counts[AttendanceStatus.PRESENT] ?? 0}</span>
            <span className="text-red-600 font-semibold">❌ {counts[AttendanceStatus.ABSENT] ?? 0}</span>
            <span className="text-yellow-600 font-semibold">⏰ {counts[AttendanceStatus.LATE] ?? 0}</span>
            <span className="text-blue-600 font-semibold">📋 {counts[AttendanceStatus.EXCUSED] ?? 0}</span>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} size="sm" className="gap-2">
            {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Saqlash ({studentList.length})
          </Button>
        </div>
      )}
    </div>
  );
}
