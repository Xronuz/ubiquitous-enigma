'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, School, CreditCard, TrendingUp, TrendingDown,
  AlertCircle, Globe, CheckCircle2, Building2, LayoutGrid,
  BookOpen, BookMarked, ClipboardCheck, Calendar, GraduationCap, ChevronRight,
  Rocket, X, Library, BookCopy, Hourglass, DollarSign, BarChart2,
  CalendarOff, ShieldAlert, CalendarCheck, Activity,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { paymentsApi } from '@/lib/api/payments';
import { superAdminApi } from '@/lib/api/super-admin';
import { parentApi } from '@/lib/api/parent';
import { scheduleApi } from '@/lib/api/schedule';
import { attendanceApi } from '@/lib/api/attendance';
import { examsApi } from '@/lib/api/exams';
import { homeworkApi } from '@/lib/api/homework';
import { subjectsApi } from '@/lib/api/subjects';
import { gradesApi } from '@/lib/api/grades';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, getRoleLabel } from '@/lib/utils';
import { useRouter } from 'next/navigation';

function StatCard({
  title, value, description, icon: Icon, trend, loading, color,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  loading?: boolean;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${color ?? 'bg-primary/10'}`}>
          <Icon className={`h-4 w-4 ${color ? 'text-white' : 'text-primary'}`} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {description && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Onboarding Checklist ─────────────────────────────────────────────────

function OnboardingChecklist({ classList, usersData, subjectsCount }: {
  classList: any[];
  usersData: any;
  subjectsCount: number;
}) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') return !!localStorage.getItem('onboarding_dismissed');
    return false;
  });

  const totalUsers = usersData?.meta?.total ?? 0;
  const teacherCount = usersData?.data?.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length ?? 0;

  const steps = [
    {
      id: 'classes',
      label: 'Sinflar yarating',
      description: 'Maktabingiz uchun kamida 1 ta sinf yarating',
      href: '/dashboard/classes',
      done: classList.length > 0,
    },
    {
      id: 'teachers',
      label: "O'qituvchilar qo'shing",
      description: "Kamida 1 ta o'qituvchi hisobini yarating",
      href: '/dashboard/users',
      done: teacherCount > 0,
    },
    {
      id: 'subjects',
      label: 'Fanlar kiriting',
      description: 'Dars jadvaliga fan qo\'shing',
      href: '/dashboard/subjects',
      done: subjectsCount > 0,
    },
    {
      id: 'schedule',
      label: 'Dars jadvali tuzing',
      description: 'Haftalik dars jadvalini tuzib chiqing',
      href: '/dashboard/schedule',
      done: false,
    },
  ];

  const allDone = steps.every(s => s.done);
  if (dismissed || allDone) return null;

  const doneCount = steps.filter(s => s.done).length;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Maktabni sozlash</CardTitle>
            <Badge variant="secondary" className="text-xs">{doneCount}/{steps.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
            localStorage.setItem('onboarding_dismissed', '1');
            setDismissed(true);
          }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Quyidagi qadamlarni bajaring va tizimni to'liq ishga tushiring.{' '}
          <a href="/dashboard/onboarding" className="text-primary underline underline-offset-2">Sozlash ustasi →</a>
        </CardDescription>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted mt-2">
          <div
            className="h-1.5 rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => !step.done && router.push(step.href)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                step.done
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 cursor-default'
                  : 'border-border hover:border-primary/50 hover:bg-accent cursor-pointer'
              }`}
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : ''}`}>
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{step.description}</p>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Super Admin Dashboard ─────────────────────────────────────────────────

function SuperAdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-admin', 'stats'],
    queryFn: superAdminApi.getStats,
  });

  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ['super-admin', 'schools'],
    queryFn: () => superAdminApi.getSchools({ limit: 5 }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform boshqaruvi</h1>
          <p className="text-muted-foreground">EduPlatform — Super Admin paneli</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/schools">
            <Building2 className="mr-2 h-4 w-4" />
            Maktablar
          </Link>
        </Button>
      </div>

      {/* Platform KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Jami maktablar"
          value={isLoading ? '...' : (stats?.schoolCount ?? 0)}
          icon={School}
          description="Aktiv maktablar"
          color="bg-blue-500"
          loading={isLoading}
        />
        <StatCard
          title="Jami foydalanuvchilar"
          value={isLoading ? '...' : (stats?.userCount ?? 0)}
          icon={Users}
          description="Barcha maktablar bo'yicha"
          color="bg-violet-500"
          loading={isLoading}
        />
        <StatCard
          title="Aktiv subscriptionlar"
          value={isLoading ? '...' : (stats?.activeSubscriptions ?? 0)}
          icon={CheckCircle2}
          description="To'lov qilayotgan maktablar"
          color="bg-green-500"
          loading={isLoading}
        />
      </div>

      {/* Recent schools + Quick links */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent schools */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">So'nggi maktablar</CardTitle>
              <CardDescription>Platformdagi barcha maktablar</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/schools">Barchasi →</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {schoolsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(schools?.data ?? []).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={s.isActive ? 'success' : 'destructive'}>
                        {s.isActive ? 'Aktiv' : 'Bloklangan'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {s._count?.users ?? 0} user
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!schools?.data || schools.data.length === 0) && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Maktablar yo'q
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tezkor harakatlar</CardTitle>
            <CardDescription>Platforma boshqaruv bo'limlari</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Yangi maktab', href: '/dashboard/schools/new', icon: Building2, color: 'text-blue-500' },
                { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, color: 'text-violet-500' },
                { label: 'Modullar', href: '/dashboard/schools', icon: LayoutGrid, color: 'text-orange-500' },
                { label: 'Sozlamalar', href: '/dashboard/settings', icon: Globe, color: 'text-green-500' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-medium hover:bg-accent transition-colors"
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                  {label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Today's Schedule Widget ───────────────────────────────────────────────
const DAY_UZ: Record<string, string> = {
  monday: 'Dushanba', tuesday: 'Seshanba', wednesday: 'Chorshanba',
  thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba', sunday: 'Yakshanba',
};

function TodayScheduleWidget() {
  const { data: todaySlots, isLoading } = useQuery({
    queryKey: ['schedule', 'today'],
    queryFn: scheduleApi.getToday,
    staleTime: 10 * 60_000, // Bugungi jadval kun davomida o'zgarmaydi
  });
  const slots: any[] = Array.isArray(todaySlots) ? todaySlots : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Bugungi darslar</CardTitle>
          <CardDescription>{new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/schedule">Jadval <ChevronRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : slots.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Bugun dars yo'q</p>
        ) : (
          <div className="space-y-2">
            {slots.slice(0, 6).map((slot: any) => (
              <div key={slot.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {slot.timeSlot}
                  </span>
                  <div>
                    <p className="font-medium">{slot.subject?.name}</p>
                    <p className="text-xs text-muted-foreground">{slot.class?.name}{slot.roomNumber ? ` — ${slot.roomNumber}-xona` : ''}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{slot.startTime}–{slot.endTime}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Attendance Summary Widget ─────────────────────────────────────────────
function AttendanceSummaryWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'today-summary'],
    queryFn: attendanceApi.getTodaySummary,
    refetchInterval: 60_000, // refresh every minute
  });

  const pct = data?.presentPct ?? 0;
  const color = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base">Bugungi davomat</CardTitle>
          <CardDescription>Maktab bo'yicha</CardDescription>
        </div>
        <div className="rounded-lg bg-green-500/10 p-2">
          <ClipboardCheck className="h-4 w-4 text-green-600" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : (
          <>
            <div className={`text-3xl font-bold ${color}`}>{pct}%</div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
              <div className="rounded-md bg-green-50 p-1.5">
                <div className="font-bold text-green-700">{data?.present ?? 0}</div>
                <div className="text-muted-foreground">Keldi</div>
              </div>
              <div className="rounded-md bg-red-50 p-1.5">
                <div className="font-bold text-red-700">{data?.absent ?? 0}</div>
                <div className="text-muted-foreground">Kelmadi</div>
              </div>
              <div className="rounded-md bg-yellow-50 p-1.5">
                <div className="font-bold text-yellow-700">{data?.late ?? 0}</div>
                <div className="text-muted-foreground">Kechikdi</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground text-right">
              Jami: {data?.marked ?? 0} / {data?.totalStudents ?? 0} o'quvchi
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Upcoming Exams Widget ─────────────────────────────────────────────────
const FREQ_UZ: Record<string, string> = {
  weekly: 'Haftalik', monthly: 'Oylik', quarterly: 'Choraklik',
  midterm: 'Yarim yillik', final: 'Yakuniy', custom: 'Maxsus',
};

function UpcomingExamsWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['exams', 'upcoming'],
    queryFn: () => examsApi.getUpcoming(7),
  });
  const exams: any[] = Array.isArray(data) ? data : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Yaqin imtihonlar</CardTitle>
          <CardDescription>Keyingi 7 kun ichida</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/exams">Barchasi <ChevronRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : exams.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Yaqin imtihonlar yo'q</p>
        ) : (
          <div className="space-y-2">
            {exams.map((exam: any) => {
              const d = new Date(exam.scheduledAt);
              const isToday = d.toDateString() === new Date().toDateString();
              const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
              const label = isToday ? 'Bugun' : isTomorrow ? 'Ertaga' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
              return (
                <div key={exam.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <div>
                    <p className="font-medium">{exam.subject?.name}</p>
                    <p className="text-xs text-muted-foreground">{exam.class?.name} — {FREQ_UZ[exam.frequency] ?? exam.frequency}</p>
                  </div>
                  <Badge variant={isToday ? 'destructive' : isTomorrow ? 'warning' : 'secondary'}>
                    {label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Class Teacher My Class Section ────────────────────────────────────────

function ClassTeacherMyClassSection() {
  const router = useRouter();

  const { data: myClass, isLoading } = useQuery({
    queryKey: ['classes', 'my-class'],
    queryFn: () => classesApi.getMyClass(),
  });

  const { data: gpaData } = useQuery({
    queryKey: ['grades', 'class-gpa', myClass?.id],
    queryFn: () => gradesApi.getClassGpa(myClass!.id),
    enabled: !!myClass?.id,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (!myClass) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground text-center">
          Sizga hali sinf biriktirilmagan. Admin orqali sinf biriktiring.
        </CardContent>
      </Card>
    );
  }

  const studentCount = myClass._count?.students ?? 0;
  const classAvg = gpaData?.classAvg ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Mening sinfim — {myClass.name}</h2>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/my-class`)}>
          Batafsil <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/attendance')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/10">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">O'quvchilar</p>
              <p className="text-2xl font-bold">{studentCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/grades')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">O'rtacha GPA</p>
              <p className="text-2xl font-bold">{classAvg.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/homework')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <BookMarked className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sinf kodi</p>
              <p className="text-2xl font-bold">{myClass.gradeLevel || '—'}</p>
              <p className="text-xs text-muted-foreground">{myClass.academicYear}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Top/Bottom students by GPA */}
      {gpaData && gpaData.students.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Eng yuqori GPA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {gpaData.students.slice(0, 3).map((s, i) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${i === 0 ? 'bg-yellow-400 text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                    {s.name}
                  </span>
                  <span className="font-bold text-green-600">{s.gpa.toFixed(1)}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Diqqat talab qiluvchi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {gpaData.students.slice(-3).reverse().filter(s => s.gpa < 70).map((s, i) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-bold text-red-500">{s.gpa.toFixed(1)}%</span>
                </div>
              ))}
              {gpaData.students.slice(-3).filter(s => s.gpa < 70).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Barcha o'quvchilar yaxshi! 🎉</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Teacher KPI Section ───────────────────────────────────────────────────

function TeacherKPISection() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: todaySlots, isLoading: schedLoading } = useQuery({
    queryKey: ['schedule', 'today'],
    queryFn: scheduleApi.getToday,
    staleTime: 10 * 60_000, // TodayScheduleWidget bilan bir xil key — cache share qiladi
  });

  const { data: homeworks = [] } = useQuery({
    queryKey: ['homework'],
    queryFn: () => homeworkApi.getAll(),
    staleTime: 5 * 60_000,
  });

  const myLessonsToday = (Array.isArray(todaySlots) ? todaySlots : [])
    .filter((s: any) => s.teacherId === user?.id).length;

  const hwList = homeworks as any[];
  const pendingGrade = hwList.reduce((acc: number, hw: any) => {
    const subs = hw.submissions ?? [];
    return acc + subs.filter((s: any) => s.score === null || s.score === undefined).length;
  }, 0);

  const isClassTeacher = user?.role === 'class_teacher';

  const teacherKpis = [
    ...(isClassTeacher ? [{
      title: 'Mening sinfim',
      value: '→',
      icon: School,
      description: 'Sinf ro\'yxati, davomat va baholar',
      href: '/dashboard/my-class',
    }] : []),
    {
      title: 'Bugun darslarim',
      value: schedLoading ? '...' : myLessonsToday,
      icon: Calendar,
      description: 'Bugungi dars jadvalidagi soatlar',
      href: '/dashboard/schedule',
    },
    {
      title: 'Baholanmagan vazifalar',
      value: pendingGrade,
      icon: BookMarked,
      description: 'Baholashni kutayotgan topshiriqlar',
      href: '/dashboard/homework',
    },
    {
      title: 'Jami uy vazifalari',
      value: hwList.length,
      icon: ClipboardCheck,
      description: 'Berilgan uy vazifalari',
      href: '/dashboard/homework',
    },
  ];

  return (
    <div className={`grid gap-4 ${isClassTeacher ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {teacherKpis.map(({ title, value, icon: Icon, description, href }) => (
        <Card
          key={title}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(href)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Vice Principal Section ────────────────────────────────────────────────

function VicePrincipalSection() {
  const router = useRouter();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data: leaveData } = useQuery({
    queryKey: ['leave-requests', 'pending'],
    queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }),
  });
  const { data: disciplineData } = useQuery({
    queryKey: ['discipline', 'week'],
    queryFn: () => disciplineApi.getAll({ from: weekAgo, to: today, limit: 50 }),
  });

  const pendingLeaves: any[] = leaveData?.data ?? (Array.isArray(leaveData) ? leaveData : []);
  const disciplineList: any[] = disciplineData?.data ?? [];
  const unresolvedDiscipline = disciplineList.filter((d: any) => !d.resolved);

  const items = [
    {
      title: "Ta'til so'rovlari",
      value: pendingLeaves.length,
      desc: 'Kutilayotgan so\'rovlar',
      icon: CalendarOff,
      color: pendingLeaves.length > 0 ? 'bg-orange-500' : 'bg-muted',
      href: '/dashboard/leave-requests',
      alert: pendingLeaves.length > 0,
    },
    {
      title: "Intizom hodisalari",
      value: unresolvedDiscipline.length,
      desc: 'Hal qilinmagan (7 kun)',
      icon: ShieldAlert,
      color: unresolvedDiscipline.length > 3 ? 'bg-red-500' : unresolvedDiscipline.length > 0 ? 'bg-yellow-500' : 'bg-muted',
      href: '/dashboard/discipline',
      alert: unresolvedDiscipline.length > 0,
    },
    {
      title: "Ota-ona uchrashuvlari",
      value: '→',
      desc: 'Uchrashuvlar jadvalini ko\'rish',
      icon: CalendarCheck,
      color: 'bg-blue-500',
      href: '/dashboard/meetings',
      alert: false,
    },
    {
      title: 'Ish yuklamasi',
      value: '→',
      desc: "O'qituvchilar yuklamasi",
      icon: Activity,
      color: 'bg-violet-500',
      href: '/dashboard/reports/workload',
      alert: false,
    },
  ];

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">O'rinbosar ko'rsatkichlari</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ title, value, desc, icon: Icon, color, href, alert }) => (
          <Card
            key={title}
            className={`cursor-pointer hover:shadow-md transition-shadow ${alert ? 'border-orange-300 dark:border-orange-800' : ''}`}
            onClick={() => router.push(href)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <div className={`rounded-lg p-2 ${color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${alert ? 'text-orange-600' : ''}`}>{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Admin Charts Section ──────────────────────────────────────────────────

const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function AdminChartsSection() {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  const { data: paymentHistory, isLoading: payLoading } = useQuery({
    queryKey: ['payments', 'history', 'trend'],
    queryFn: () => paymentsApi.getHistory({ from: sixMonthsAgo, status: 'paid', limit: 500 }),
  });

  const { data: attendanceReport, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'report', 'trend'],
    queryFn: () => attendanceApi.getReport({
      startDate: new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }),
  });

  // Build monthly revenue data from history
  const revenueData = (() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }
    const list: any[] = paymentHistory?.data ?? [];
    list.forEach((p: any) => {
      const key = (p.paidAt ?? p.createdAt ?? '').slice(0, 7);
      if (key in months) months[key] = (months[key] ?? 0) + (p.amount ?? 0);
    });
    return Object.entries(months).map(([key, val]) => {
      const [, mo] = key.split('-');
      return { month: MONTH_LABELS[parseInt(mo) - 1], amount: val };
    });
  })();

  // Build 7-day attendance trend
  const attendanceTrend = (() => {
    const records: any[] = Array.isArray(attendanceReport) ? attendanceReport : (attendanceReport?.data ?? []);
    const byDate: Record<string, { present: number; absent: number; total: number }> = {};
    records.forEach((r: any) => {
      const d = r.date?.slice(0, 10) ?? '';
      if (!d) return;
      if (!byDate[d]) byDate[d] = { present: 0, absent: 0, total: 0 };
      byDate[d].total++;
      if (r.status === 'present') byDate[d].present++;
      else if (r.status === 'absent') byDate[d].absent++;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, v]) => ({
        day: new Date(date).toLocaleDateString('uz-UZ', { weekday: 'short' }),
        pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
      }));
  })();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Revenue trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-blue-500" />
            Oylik daromad (so&apos;m)
          </CardTitle>
          <CardDescription>So&apos;nggi 6 oy bo&apos;yicha tushum</CardDescription>
        </CardHeader>
        <CardContent>
          {payLoading ? <Skeleton className="h-44" /> : (
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={revenueData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Tushum']} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Attendance trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Davomat trendi (%)
          </CardTitle>
          <CardDescription>So&apos;nggi 7 kun davomati</CardDescription>
        </CardHeader>
        <CardContent>
          {attLoading ? <Skeleton className="h-44" /> : attendanceTrend.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
              Ma&apos;lumot yo&apos;q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={176}>
              <LineChart data={attendanceTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Davomat']} />
                <Line type="monotone" dataKey="pct" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Accountant Dashboard ──────────────────────────────────────────────────

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

function AccountantDashboard() {
  const { user } = useAuthStore();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  const { data: paymentReport, isLoading: reportLoading } = useQuery({
    queryKey: ['payments', 'report'],
    queryFn: paymentsApi.getReport,
  });

  const { data: paymentHistory, isLoading: histLoading } = useQuery({
    queryKey: ['payments', 'history', 'trend'],
    queryFn: () => paymentsApi.getHistory({ from: sixMonthsAgo, limit: 500 }),
  });

  // Monthly breakdown for BarChart
  const monthlyData = (() => {
    const months: Record<string, { paid: number; pending: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { paid: 0, pending: 0 };
    }
    const list: any[] = paymentHistory?.data ?? [];
    list.forEach((p: any) => {
      const key = (p.paidAt ?? p.createdAt ?? '').slice(0, 7);
      if (!(key in months)) return;
      if (p.status === 'paid') months[key].paid += p.amount ?? 0;
      else months[key].pending += p.amount ?? 0;
    });
    return Object.entries(months).map(([key, val]) => {
      const [, mo] = key.split('-');
      return { month: MONTH_LABELS[parseInt(mo) - 1], ...val };
    });
  })();

  // Pie chart data
  const pieData = [
    { name: "To'langan", value: paymentReport?.monthly?.paid ?? 0 },
    { name: 'Kechikkan', value: paymentReport?.overdue ?? 0 },
    { name: 'Kutilmoqda', value: paymentReport?.monthly?.pending ?? 0 },
  ].filter(d => d.value > 0);

  const totalRevenue = paymentReport?.monthly?.paid ?? 0;
  const overdueAmt = paymentReport?.overdue ?? 0;
  const debtors: any[] = paymentReport?.debtors ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moliya boshqaruvi</h1>
          <p className="text-muted-foreground">Hisobchi — {user?.firstName}</p>
        </div>
        <Button asChild>
          <a href="/dashboard/payments"><CreditCard className="mr-2 h-4 w-4" />To&apos;lovlar</a>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Bu oy tushumi"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          trend="up"
          description="Oylik tushum"
          loading={reportLoading}
          color="bg-green-500"
        />
        <StatCard
          title="Kechikkan to'lovlar"
          value={formatCurrency(overdueAmt)}
          icon={AlertCircle}
          trend="down"
          description="Qarzdorlik miqdori"
          loading={reportLoading}
          color="bg-red-500"
        />
        <StatCard
          title="Qarzdorlar soni"
          value={debtors.length}
          icon={Users}
          description="Aktiv qarzdorlar"
          loading={reportLoading}
          color="bg-orange-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly BarChart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Oylik tushum dinamikasi</CardTitle>
            <CardDescription>So&apos;nggi 6 oy (so&apos;m)</CardDescription>
          </CardHeader>
          <CardContent>
            {histLoading ? <Skeleton className="h-52" /> : (
              <ResponsiveContainer width="100%" height={208}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'paid' ? "To'langan" : 'Kutilmoqda']} />
                  <Bar dataKey="paid" fill="#22c55e" radius={[4, 4, 0, 0]} name="paid" stackId="a" />
                  <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="pending" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">To&apos;lov holati (bu oy)</CardTitle>
            <CardDescription>To&apos;langan / Kutilmoqda / Kechikkan</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {reportLoading ? <Skeleton className="h-52 w-52 rounded-full" /> : pieData.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">Ma&apos;lumot yo&apos;q</p>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top debtors */}
      {debtors.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Qarzdorlar ro&apos;yxati</CardTitle>
              <CardDescription>Eng katta qarzdorliklar</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href="/dashboard/payments">Barchasi <ChevronRight className="ml-1 h-3 w-3" /></a>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {debtors.slice(0, 8).map((d: any, i: number) => (
                <div key={d.id ?? i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                    <div>
                      <p className="font-medium">{d.student?.firstName} {d.student?.lastName}</p>
                      <p className="text-xs text-muted-foreground">{d.student?.class?.name ?? ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-destructive">{formatCurrency(d.amount)}</span>
                    <Badge variant={d.status === 'overdue' ? 'destructive' : 'warning'}>
                      {d.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Librarian Dashboard ───────────────────────────────────────────────────

function LibrarianDashboard() {
  const { user } = useAuthStore();

  const { data: libStats, isLoading } = useQuery({
    queryKey: ['library', 'stats'],
    queryFn: async () => {
      try {
        const { data } = await (await import('@/lib/api/client')).apiClient.get('/library/stats');
        return data;
      } catch {
        return { totalBooks: 0, activeLoans: 0, overdueLoans: 0, availableBooks: 0 };
      }
    },
  });

  const { data: overdueLoans = [], isLoading: overdueLoading } = useQuery({
    queryKey: ['library', 'overdue'],
    queryFn: async () => {
      try {
        const { data } = await (await import('@/lib/api/client')).apiClient.get('/library/loans', { params: { status: 'overdue', limit: 10 } });
        return data?.data ?? [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kutubxona boshqaruvi</h1>
          <p className="text-muted-foreground">Kutubxonachi — {user?.firstName}</p>
        </div>
        <Button asChild>
          <a href="/dashboard/library"><Library className="mr-2 h-4 w-4" />Kutubxona</a>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Jami kitoblar"
          value={isLoading ? '...' : (libStats?.totalBooks ?? 0)}
          icon={BookOpen}
          description="Katalogdagi kitoblar"
          loading={isLoading}
          color="bg-blue-500"
        />
        <StatCard
          title="Mavjud kitoblar"
          value={isLoading ? '...' : (libStats?.availableBooks ?? 0)}
          icon={BookCopy}
          description="Berilishi mumkin"
          loading={isLoading}
          color="bg-green-500"
        />
        <StatCard
          title="Faol ijaralar"
          value={isLoading ? '...' : (libStats?.activeLoans ?? 0)}
          icon={ClipboardCheck}
          description="Berilgan kitoblar"
          loading={isLoading}
          color="bg-violet-500"
        />
        <StatCard
          title="Muddati o'tgan"
          value={isLoading ? '...' : (libStats?.overdueLoans ?? 0)}
          icon={Hourglass}
          description="Qaytarilmagan kitoblar"
          loading={isLoading}
          color="bg-red-500"
        />
      </div>

      {/* Overdue loans */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-red-500" />
              Muddati o&apos;tgan kitoblar
            </CardTitle>
            <CardDescription>Qaytarilmagan va kechikkan ijaralar</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href="/dashboard/library">Barchasi <ChevronRight className="ml-1 h-3 w-3" /></a>
          </Button>
        </CardHeader>
        <CardContent>
          {overdueLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (overdueLoans as any[]).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm">Hamma kitoblar o&apos;z vaqtida qaytarilgan!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(overdueLoans as any[]).map((loan: any, i: number) => (
                <div key={loan.id ?? i} className="flex items-center justify-between rounded-lg border border-red-200 p-3 text-sm">
                  <div>
                    <p className="font-medium">{loan.book?.title ?? 'Noma\'lum kitob'}</p>
                    <p className="text-xs text-muted-foreground">
                      {loan.user?.firstName} {loan.user?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive">
                      {loan.dueDate ? `${Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / 86400000)} kun` : 'Kechikkan'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('uz-UZ') : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tezkor harakatlar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Kitob qo\'sh', href: '/dashboard/library', icon: BookOpen, color: 'text-blue-500' },
              { label: 'Ijara bering', href: '/dashboard/library', icon: BookCopy, color: 'text-green-500' },
              { label: 'Qaytarish', href: '/dashboard/library', icon: ClipboardCheck, color: 'text-violet-500' },
              { label: 'Hisobot', href: '/dashboard/reports', icon: BarChart2, color: 'text-orange-500' },
            ].map(({ label, href, icon: Icon, color }) => (
              <a key={href + label} href={href} className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-medium hover:bg-accent transition-colors">
                <Icon className={`h-6 w-6 ${color}`} />
                {label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── School Admin / Teacher Dashboard ─────────────────────────────────────

function SchoolDashboard() {
  const { user } = useAuthStore();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'count'],
    queryFn: () => usersApi.getAll({ limit: 100 }),
    enabled: ['school_admin', 'vice_principal'].includes(user?.role ?? ''),
  });

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
    enabled: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? ''),
  });

  const { data: paymentReport, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', 'report'],
    queryFn: paymentsApi.getReport,
    enabled: ['school_admin', 'accountant'].includes(user?.role ?? ''),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', 'count'],
    queryFn: () => subjectsApi.getAll(),
    enabled: user?.role === 'school_admin',
  });

  const classList = Array.isArray(classesData) ? classesData : [];
  const subjectsCount = Array.isArray(subjectsData) ? subjectsData.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Xush kelibsiz, {user?.firstName}!</h1>
        <p className="text-muted-foreground">{getRoleLabel(user?.role ?? '')} — EduPlatform</p>
      </div>

      {/* Onboarding checklist for new school admins */}
      {user?.role === 'school_admin' && (
        <OnboardingChecklist
          classList={classList}
          usersData={usersData}
          subjectsCount={subjectsCount}
        />
      )}

      {/* Vice principal specific KPIs */}
      {user?.role === 'vice_principal' && <VicePrincipalSection />}

      {/* Admin/VP charts */}
      {['school_admin', 'vice_principal'].includes(user?.role ?? '') && (
        <AdminChartsSection />
      )}

      {/* Class teacher: my class overview */}
      {user?.role === 'class_teacher' && (
        <ClassTeacherMyClassSection />
      )}

      {/* Teacher-specific KPIs */}
      {['teacher', 'class_teacher'].includes(user?.role ?? '') && (
        <TeacherKPISection />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['school_admin', 'vice_principal'].includes(user?.role ?? '') && (
          <StatCard
            title="Foydalanuvchilar"
            value={usersData?.meta.total ?? 0}
            icon={Users}
            description="Aktiv foydalanuvchilar"
            loading={usersLoading}
          />
        )}
        {!['student', 'parent'].includes(user?.role ?? '') && (
          <StatCard
            title="Sinflar"
            value={classList.length}
            icon={School}
            description="Aktiv sinflar"
            loading={classesLoading}
          />
        )}
        {['school_admin', 'accountant'].includes(user?.role ?? '') && (
          <>
            <StatCard
              title="Bu oy tushumi"
              value={formatCurrency(paymentReport?.monthly?.paid ?? 0)}
              icon={CreditCard}
              trend="up"
              description="Oylik tushum"
              loading={paymentsLoading}
            />
            <StatCard
              title="Qarzdorlar"
              value={formatCurrency(paymentReport?.overdue ?? 0)}
              icon={AlertCircle}
              trend="down"
              description="Kechikkan to'lovlar"
              loading={paymentsLoading}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Bugungi davomat xulosasi */}
        {['school_admin', 'vice_principal', 'class_teacher', 'teacher'].includes(user?.role ?? '') && (
          <AttendanceSummaryWidget />
        )}

        {/* Yaqin imtihonlar */}
        {['school_admin', 'vice_principal', 'teacher', 'class_teacher'].includes(user?.role ?? '') && (
          <UpcomingExamsWidget />
        )}

        {/* Bugungi darslar — teacher/class_teacher/vice_principal uchun */}
        {['teacher', 'class_teacher', 'vice_principal', 'school_admin'].includes(user?.role ?? '') && (
          <TodayScheduleWidget />
        )}

        {/* Qarzdorlar — accountant/school_admin uchun */}
        {['school_admin', 'accountant'].includes(user?.role ?? '') && (paymentReport?.debtors?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Qarzdorlar ro'yxati</CardTitle>
              <CardDescription>Kechikkan va kutilayotgan to'lovlar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {paymentReport.debtors.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span>{d.student.firstName} {d.student.lastName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(d.amount)}</span>
                    <Badge variant={d.status === 'overdue' ? 'destructive' : 'warning'}>
                      {d.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Sinflar ro'yxati */}
        {classList.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Sinflar</CardTitle>
                <CardDescription>{classList.length} ta sinf ro'yxatda</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/classes">Barchasi <ChevronRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {classList.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c._count?.students ?? 0} o'quvchi</Badge>
                    <span className="text-muted-foreground text-xs">{c.academicYear}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tezkor harakatlar — role bo'yicha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tezkor harakatlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {user?.role === 'school_admin' && [
                { label: 'Foydalanuvchi qo\'sh', href: '/dashboard/users', icon: Users, color: 'text-violet-500' },
                { label: 'Davomat', href: '/dashboard/attendance', icon: ClipboardCheck, color: 'text-green-500' },
                { label: "To'lovlar", href: '/dashboard/payments', icon: CreditCard, color: 'text-blue-500' },
                { label: 'Hisobotlar', href: '/dashboard/reports', icon: BookOpen, color: 'text-orange-500' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium hover:bg-accent transition-colors">
                  <Icon className={`h-5 w-5 ${color}`} />
                  {label}
                </Link>
              ))}
              {['teacher', 'class_teacher'].includes(user?.role ?? '') && [
                { label: 'Davomat belgi', href: '/dashboard/attendance', icon: ClipboardCheck, color: 'text-green-500' },
                { label: 'Baho qo\'sh', href: '/dashboard/grades', icon: BookOpen, color: 'text-blue-500' },
                { label: 'Uy vazifasi', href: '/dashboard/homework', icon: Calendar, color: 'text-violet-500' },
                { label: 'Imtihon', href: '/dashboard/exams', icon: GraduationCap, color: 'text-orange-500' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium hover:bg-accent transition-colors">
                  <Icon className={`h-5 w-5 ${color}`} />
                  {label}
                </Link>
              ))}
              {user?.role === 'accountant' && [
                { label: "To'lov qabul", href: '/dashboard/payments', icon: CreditCard, color: 'text-green-500' },
                { label: 'Maosh', href: '/dashboard/payroll', icon: BookOpen, color: 'text-blue-500' },
                { label: 'Hisobot', href: '/dashboard/reports', icon: Calendar, color: 'text-violet-500' },
                { label: 'Sozlamalar', href: '/dashboard/settings', icon: GraduationCap, color: 'text-orange-500' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium hover:bg-accent transition-colors">
                  <Icon className={`h-5 w-5 ${color}`} />
                  {label}
                </Link>
              ))}
              {user?.role === 'vice_principal' && [
                { label: 'Davomat', href: '/dashboard/attendance', icon: ClipboardCheck, color: 'text-green-500' },
                { label: 'Baholar', href: '/dashboard/grades', icon: BookOpen, color: 'text-blue-500' },
                { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, color: 'text-violet-500' },
                { label: 'Hisobot', href: '/dashboard/reports', icon: GraduationCap, color: 'text-orange-500' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium hover:bg-accent transition-colors">
                  <Icon className={`h-5 w-5 ${color}`} />
                  {label}
                </Link>
              ))}
              {user?.role === 'librarian' && [
                { label: 'Kitoblar', href: '/dashboard/library', icon: BookOpen, color: 'text-blue-500' },
                { label: 'Xabarlar', href: '/dashboard/messages', icon: Calendar, color: 'text-violet-500' },
                { label: 'Sozlamalar', href: '/dashboard/settings', icon: GraduationCap, color: 'text-orange-500' },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium hover:bg-accent transition-colors">
                  <Icon className={`h-5 w-5 ${color}`} />
                  {label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Parent Dashboard ──────────────────────────────────────────────────────

function ParentDashboard() {
  const { user } = useAuthStore();
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['parent', 'children'],
    queryFn: parentApi.getChildren,
  });
  const childList: any[] = Array.isArray(children) ? children : [];
  const activeChild = selectedChildId || childList[0]?.id;

  const { data: attendance } = useQuery({
    queryKey: ['parent', 'attendance', activeChild],
    queryFn: () => parentApi.getChildAttendance(activeChild),
    enabled: !!activeChild,
  });

  const { data: gradesData } = useQuery({
    queryKey: ['parent', 'grades', activeChild],
    queryFn: () => parentApi.getChildGrades(activeChild),
    enabled: !!activeChild,
  });

  const { data: payments } = useQuery({
    queryKey: ['parent', 'payments', activeChild],
    queryFn: () => parentApi.getChildPayments(activeChild),
    enabled: !!activeChild,
  });

  const { data: upcomingExams = [] } = useQuery({
    queryKey: ['parent', 'exams', activeChild],
    queryFn: () => examsApi.getUpcoming(14),
    enabled: !!activeChild,
  });

  const grades: any[] = gradesData?.grades ?? [];
  const attendanceStats = attendance ?? {};
  const paymentList: any[] = Array.isArray(payments) ? payments : [];
  const pending = paymentList.filter((p: any) => p.status === 'pending' || p.status === 'overdue');

  // Build GPA trend from last 10 grades sorted by date
  const gpaTrend = [...grades]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map((g: any) => ({
      date: new Date(g.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
      pct: g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0,
    }));

  const nextExams: any[] = (Array.isArray(upcomingExams) ? upcomingExams : []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Xush kelibsiz, {user?.firstName}!</h1>
        <p className="text-muted-foreground">Farzandlaringizning o'qish holati</p>
      </div>

      {/* Child selector */}
      {childList.length > 1 && (
        <div className="flex gap-2">
          {childList.map((child: any) => (
            <Button
              key={child.id}
              variant={activeChild === child.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChildId(child.id)}
            >
              {child.firstName} {child.lastName}
            </Button>
          ))}
        </div>
      )}

      {childrenLoading ? (
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : childList.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Farzandlar bog'lanmagan</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10"><ClipboardCheck className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Davomat</p>
                  <p className="text-2xl font-bold">{attendanceStats.present ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Kelgan kunlar</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10"><BookOpen className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">O'rtacha baho</p>
                  <p className="text-2xl font-bold">{gradesData?.gpa ?? 0}%</p>
                  <p className="text-xs text-muted-foreground">Joriy daraja</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${pending.length > 0 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  <CreditCard className={`h-5 w-5 ${pending.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To'lovlar</p>
                  <p className="text-2xl font-bold">{pending.length}</p>
                  <p className="text-xs text-muted-foreground">{pending.length > 0 ? 'Kutilayotgan' : 'Hammasi to\'langan'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GPA trend chart */}
          {gpaTrend.length >= 3 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Baho trendi
                </CardTitle>
                <CardDescription>So&apos;nggi {gpaTrend.length} ta bahoning dinamikasi</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={gpaTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Ball %']} />
                    <Line type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent grades */}
          {grades.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">So&apos;nggi baholar</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/grades">Barchasi <ChevronRight className="ml-1 h-4 w-4" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {grades.slice(0, 5).map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between text-sm rounded-lg border p-2.5">
                    <div>
                      <span className="font-medium">{g.subject?.name}</span>
                      <span className="mx-2 text-muted-foreground text-xs">{new Date(g.date).toLocaleDateString('uz-UZ')}</span>
                    </div>
                    <Badge variant={(g.score / g.maxScore) >= 0.8 ? 'success' : (g.score / g.maxScore) >= 0.6 ? 'secondary' : 'destructive'}>
                      {g.score}/{g.maxScore}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming exams for child */}
          {nextExams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-orange-500" />
                  Yaqin imtihonlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextExams.map((exam: any) => {
                  const d = new Date(exam.scheduledAt);
                  const isToday = d.toDateString() === new Date().toDateString();
                  const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
                  return (
                    <div key={exam.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <p className="font-medium">{exam.subject?.name}</p>
                        <p className="text-xs text-muted-foreground">{exam.class?.name}</p>
                      </div>
                      <Badge variant={isToday ? 'destructive' : daysLeft <= 2 ? 'warning' : 'secondary'}>
                        {isToday ? 'Bugun' : daysLeft === 1 ? 'Ertaga' : `${daysLeft} kun`}
                      </Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Pending payments */}
          {pending.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Kutilayotgan to'lovlar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pending.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm rounded-lg border border-destructive/20 p-2.5">
                    <span>{p.description ?? "O'qish to'lovi"}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                      <Badge variant="destructive">{p.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Student redirect ──────────────────────────────────────────────────────
function StudentRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/student'); }, [router]);
  return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
}

// ─── Root export ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, _hasHydrated } = useAuthStore();

  // Wait for Zustand store to rehydrate from localStorage before rendering.
  // Without this guard, user===null on first render → falls through to
  // SchoolDashboard which fires admin-only API calls, causing 403 toasts
  // for parent/student/accountant/librarian roles.
  if (!_hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user?.role === 'super_admin') return <SuperAdminDashboard />;
  if (user?.role === 'parent') return <ParentDashboard />;
  if (user?.role === 'student') return <StudentRedirect />;
  if (user?.role === 'accountant') return <AccountantDashboard />;
  if (user?.role === 'librarian') return <LibrarianDashboard />;
  return <SchoolDashboard />;
}
