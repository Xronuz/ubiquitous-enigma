'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, School, CreditCard, TrendingUp, TrendingDown,
  AlertCircle, Globe, CheckCircle2, Building2, LayoutGrid,
  BookOpen, BookMarked, ClipboardCheck, Calendar, GraduationCap, ChevronRight,
  Rocket, X, Library, BookCopy, Hourglass, DollarSign, BarChart2, Coins,
  CalendarOff, ShieldAlert, CalendarCheck, Activity, Bell, ArrowUpRight,
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
import { coinsApi } from '@/lib/api/coins';
import { leaveRequestsApi } from '@/lib/api/leave-requests';
import { disciplineApi } from '@/lib/api/discipline';
import { financeApi } from '@/lib/api/finance';
import { notificationsApi } from '@/lib/api/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, getRoleLabel } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:     '#0F7B53',
  primaryMid:  '#1C8E61',
  primaryLight:'#DDF5EA',
  text:        '#111827',
  muted:       '#6B7280',
  border:      'rgba(0,0,0,0.05)',
  bg:          '#F7F8F8',
  card:        '#FFFFFF',
  shadow:      '0 10px 30px rgba(0,0,0,0.04)',
} as const;

// ── Icon bubble color configs ─────────────────────────────────────────────────
const ICON_CFG = {
  emerald: { bg: '#DDF5EA', icon: '#0F7B53' },
  blue:    { bg: '#DBEAFE', icon: '#2563EB' },
  violet:  { bg: '#EDE9FE', icon: '#7C3AED' },
  amber:   { bg: '#FEF3C7', icon: '#D97706' },
  red:     { bg: '#FEE2E2', icon: '#DC2626' },
  indigo:  { bg: '#E0E7FF', icon: '#4338CA' },
  cyan:    { bg: '#CFFAFE', icon: '#0891B2' },
  rose:    { bg: '#FFE4E6', icon: '#E11D48' },
} as const;
type IconColor = keyof typeof ICON_CFG;

const LEGACY_COLOR_MAP: Record<string, IconColor> = {
  'bg-blue-500':    'blue',
  'bg-violet-500':  'violet',
  'bg-purple-500':  'violet',
  'bg-green-500':   'emerald',
  'bg-emerald-500': 'emerald',
  'bg-red-500':     'red',
  'bg-orange-500':  'amber',
  'bg-amber-500':   'amber',
  'bg-yellow-500':  'amber',
  'bg-cyan-500':    'cyan',
  'bg-sky-500':     'cyan',
  'bg-indigo-500':  'indigo',
  'bg-rose-500':    'rose',
  'bg-pink-500':    'rose',
  'bg-muted':       'blue',
  'bg-primary':     'emerald',
};

// ── Premium StatCard ───────────────────────────────────────────────────────────
function StatCard({
  title, value, description, icon: Icon, trend, loading, color = 'blue', href, onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  loading?: boolean;
  color?: IconColor | string;
  href?: string;
  onClick?: () => void;
}) {
  const resolvedColor = (LEGACY_COLOR_MAP[color] ?? color) as IconColor;
  const cfg = ICON_CFG[resolvedColor] ?? ICON_CFG.blue;
  const Wrapper = href ? Link : onClick ? 'button' : 'div';
  const wrapperProps = href ? { href } : onClick ? { onClick } : {};

  return (
    <Wrapper
      {...(wrapperProps as any)}
      className={cn(
        'group block rounded-[24px] bg-white p-7 transition-all duration-200',
        (href || onClick) && 'cursor-pointer hover:-translate-y-[2px] hover:shadow-[0_20px_48px_rgba(0,0,0,0.08)]',
      )}
      style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: C.muted }}>
          {title}
        </p>
        <div
          className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: cfg.bg }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: cfg.icon }} />
        </div>
      </div>

      {/* Value */}
      {loading
        ? <Skeleton className="h-10 w-28 mb-3 rounded-xl" />
        : (
          <p
            className="text-[38px] font-black leading-none tracking-tight mb-3"
            style={{ color: C.text }}
          >
            {value}
          </p>
        )
      }

      {/* Description */}
      {description && (
        <p className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: C.muted }}>
          {trend === 'up'   && <TrendingUp  className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />}
          {description}
        </p>
      )}
    </Wrapper>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-bold" style={{ color: C.text }}>{title}</h2>
      {action}
    </div>
  );
}

// ── Premium card wrapper ───────────────────────────────────────────────────────
function PCard({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div
      className={cn('rounded-[24px] bg-white p-7', className)}
      style={{ border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', ...style }}
    >
      {children}
    </div>
  );
}

// ── Onboarding Checklist ───────────────────────────────────────────────────────
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
    { id: 'classes',  label: 'Sinflar yarating',        description: 'Kamida 1 ta sinf yarating',      href: '/dashboard/classes',  done: classList.length > 0 },
    { id: 'teachers', label: "O'qituvchilar qo'shing",  description: "Kamida 1 ta o'qituvchi qo'shing", href: '/dashboard/users',    done: teacherCount > 0 },
    { id: 'subjects', label: 'Fanlar kiriting',          description: 'Dars jadvaliga fan qo\'shing',     href: '/dashboard/subjects', done: subjectsCount > 0 },
    { id: 'schedule', label: 'Dars jadvali tuzing',      description: 'Haftalik jadval tuzing',           href: '/dashboard/schedule', done: false },
  ];

  const allDone = steps.every(s => s.done);
  if (dismissed || allDone) return null;

  const doneCount = steps.filter(s => s.done).length;

  return (
    <PCard className="border-l-4" style={{ borderLeftColor: C.primary } as any}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: C.primaryLight }}>
            <Rocket className="h-4.5 w-4.5" style={{ color: C.primary }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: C.text }}>Maktabni sozlash</p>
            <p className="text-xs" style={{ color: C.muted }}>{doneCount}/{steps.length} qadam bajarildi</p>
          </div>
        </div>
        <button
          onClick={() => { localStorage.setItem('onboarding_dismissed', '1'); setDismissed(true); }}
          className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <X className="h-3.5 w-3.5" style={{ color: C.muted }} />
        </button>
      </div>

      {/* Progress */}
      <div className="h-1.5 w-full rounded-full bg-slate-100 mb-5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%`, background: C.primary }}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => !step.done && router.push(step.href)}
            className={cn(
              'flex items-start gap-3 rounded-[14px] border p-3.5 text-left transition-colors',
              step.done
                ? 'bg-[#DDF5EA] border-[#A7F0C4] cursor-default'
                : 'border-[#EEF1F0] hover:border-[#A7F0C4] hover:bg-[#F0FDF8] cursor-pointer',
            )}
          >
            <div
              className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
              style={step.done ? { background: C.primary, color: '#fff' } : { background: '#EEF1F0', color: C.muted }}
            >
              {step.done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
            </div>
            <div className="min-w-0">
              <p className={cn('text-sm font-medium', step.done && 'line-through opacity-60')} style={{ color: C.text }}>
                {step.label}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>{step.description}</p>
            </div>
          </button>
        ))}
      </div>
    </PCard>
  );
}

// ── Today Schedule Widget ──────────────────────────────────────────────────────
function TodayScheduleWidget() {
  const { activeBranchId } = useAuthStore();
  const { data: todaySlots, isLoading } = useQuery({
    queryKey: ['schedule', 'today', activeBranchId],
    queryFn: scheduleApi.getToday,
    staleTime: 10 * 60_000,
  });
  const slots: any[] = Array.isArray(todaySlots) ? todaySlots : [];

  return (
    <PCard className="h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-[15px]" style={{ color: C.text }}>Bugungi darslar</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          href="/dashboard/schedule"
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
          style={{ color: C.primary, background: C.primaryLight }}
        >
          Jadval <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Calendar className="h-8 w-8 opacity-20" />
          <p className="text-sm" style={{ color: C.muted }}>Bugun dars yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {slots.slice(0, 6).map((slot: any) => (
            <div
              key={slot.id}
              className="flex items-center gap-3 rounded-[14px] border p-3 transition-colors hover:bg-slate-50"
              style={{ borderColor: C.border }}
            >
              <div
                className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold"
                style={{ background: C.primaryLight, color: C.primary }}
              >
                {slot.timeSlot}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{slot.subject?.name}</p>
                <p className="text-xs truncate" style={{ color: C.muted }}>
                  {slot.class?.name}{slot.roomNumber ? ` · ${slot.roomNumber}-xona` : ''}
                </p>
              </div>
              <span className="text-xs shrink-0" style={{ color: C.muted }}>
                {slot.startTime}–{slot.endTime}
              </span>
            </div>
          ))}
        </div>
      )}
    </PCard>
  );
}

// ── Attendance Summary Widget ──────────────────────────────────────────────────
function AttendanceSummaryWidget() {
  const { activeBranchId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'today-summary', activeBranchId],
    queryFn: attendanceApi.getTodaySummary,
    refetchInterval: 60_000,
  });

  const pct = data?.presentPct ?? 0;
  const pctColor = pct >= 80 ? '#0F7B53' : pct >= 60 ? '#D97706' : '#DC2626';
  const barBg    = pct >= 80 ? C.primaryLight : pct >= 60 ? '#FEF3C7' : '#FEE2E2';
  const barFill  = pctColor;

  return (
    <PCard className="h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-[15px]" style={{ color: C.text }}>Bugungi davomat</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Maktab bo'yicha</p>
        </div>
        <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: C.primaryLight }}>
          <ClipboardCheck className="h-5 w-5" style={{ color: C.primary }} />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <>
          {/* Big pct */}
          <p className="text-[52px] font-black leading-none tracking-tight mb-1" style={{ color: pctColor }}>
            {pct}%
          </p>
          <p className="text-sm mb-4" style={{ color: C.muted }}>
            Jami: {data?.marked ?? 0} / {data?.totalStudents ?? 0} o'quvchi
          </p>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full mb-5" style={{ background: barBg }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: barFill }}
            />
          </div>

          {/* 3 chips */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Keldi',    value: data?.present ?? 0, bg: '#DDF5EA', color: '#0F7B53' },
              { label: 'Kelmadi', value: data?.absent  ?? 0, bg: '#FEE2E2', color: '#DC2626' },
              { label: 'Kechikdi',value: data?.late    ?? 0, bg: '#FEF3C7', color: '#D97706' },
            ].map(s => (
              <div key={s.label} className="rounded-[14px] p-3 text-center" style={{ background: s.bg }}>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-medium mt-0.5" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </PCard>
  );
}

// ── Upcoming Exams Widget ──────────────────────────────────────────────────────
const FREQ_UZ: Record<string, string> = {
  weekly: 'Haftalik', monthly: 'Oylik', quarterly: 'Choraklik',
  midterm: 'Yarim yillik', final: 'Yakuniy', custom: 'Maxsus',
};

function UpcomingExamsWidget() {
  const { activeBranchId } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['exams', 'upcoming', activeBranchId],
    queryFn: () => examsApi.getUpcoming(7),
  });
  const exams: any[] = Array.isArray(data) ? data : [];

  return (
    <PCard className="h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="font-bold text-[15px]" style={{ color: C.text }}>Yaqin imtihonlar</p>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>Keyingi 7 kun</p>
        </div>
        <Link
          href="/dashboard/exams"
          className="text-xs font-semibold"
          style={{ color: C.primary }}
        >
          Barchasi →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
      ) : exams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <GraduationCap className="h-8 w-8 opacity-20" />
          <p className="text-sm text-center" style={{ color: C.muted }}>Yaqin imtihonlar yo'q</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exams.map((exam: any) => {
            const d = new Date(exam.scheduledAt);
            const isToday    = d.toDateString() === new Date().toDateString();
            const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
            const label = isToday ? 'Bugun' : isTomorrow ? 'Ertaga' : d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
            const chipStyle = isToday
              ? { background: '#FEE2E2', color: '#DC2626' }
              : isTomorrow
              ? { background: '#FEF3C7', color: '#D97706' }
              : { background: '#EEF1F0', color: C.muted };

            return (
              <div
                key={exam.id}
                className="flex items-center justify-between rounded-[14px] border p-3"
                style={{ borderColor: C.border }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: C.text }}>{exam.subject?.name}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: C.muted }}>
                    {exam.class?.name} · {FREQ_UZ[exam.frequency] ?? exam.frequency}
                  </p>
                </div>
                <span
                  className="shrink-0 ml-3 text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={chipStyle}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </PCard>
  );
}

// ── Class Teacher My Class ─────────────────────────────────────────────────────
function ClassTeacherMyClassSection() {
  const router = useRouter();
  const { activeBranchId } = useAuthStore();

  const { data: myClass, isLoading } = useQuery({
    queryKey: ['classes', 'my-class', activeBranchId],
    queryFn: () => classesApi.getMyClass(),
  });

  const { data: gpaData } = useQuery({
    queryKey: ['grades', 'class-gpa', myClass?.id, activeBranchId],
    queryFn: () => gradesApi.getClassGpa(myClass!.id),
    enabled: !!myClass?.id,
  });

  if (isLoading) {
    return <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-[22px]" />)}</div>;
  }

  if (!myClass) {
    return (
      <PCard>
        <p className="text-sm text-center" style={{ color: C.muted }}>
          Sizga hali sinf biriktirilmagan. Admin orqali sinf biriktiring.
        </p>
      </PCard>
    );
  }

  const studentCount = myClass._count?.students ?? 0;
  const classAvg     = gpaData?.classAvg ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[15px]" style={{ color: C.text }}>Mening sinfim — {myClass.name}</h2>
        <button
          onClick={() => router.push('/dashboard/my-class')}
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: C.primary }}
        >
          Batafsil <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "O'quvchilar", value: studentCount,           icon: ClipboardCheck, color: 'emerald', href: '/dashboard/attendance' },
          { label: "O'rtacha GPA",value: `${classAvg.toFixed(1)}%`,icon: BookOpen,    color: 'blue',    href: '/dashboard/grades'     },
          { label: "Sinf kodi",   value: myClass.gradeLevel||'—', icon: BookMarked,   color: 'violet',  href: '/dashboard/homework'   },
        ].map(item => (
          <StatCard
            key={item.label}
            title={item.label}
            value={item.value}
            icon={item.icon}
            color={item.color}
            onClick={() => router.push(item.href)}
          />
        ))}
      </div>

      {gpaData && gpaData.students.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PCard className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: C.muted }}>Eng yuqori GPA</p>
            <div className="space-y-2">
              {gpaData.students.slice(0, 3).map((s: any, i: number) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold"
                      style={i === 0 ? { background: '#FBBF24', color: '#fff' } : { background: C.border, color: C.muted }}
                    >{i + 1}</span>
                    <span style={{ color: C.text }}>{s.name}</span>
                  </span>
                  <span className="font-bold" style={{ color: C.primary }}>{s.gpa.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </PCard>
          <PCard className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: C.muted }}>Diqqat talab</p>
            <div className="space-y-2">
              {gpaData.students.slice(-3).reverse().filter((s: any) => s.gpa < 70).map((s: any) => (
                <div key={s.studentId} className="flex items-center justify-between text-sm">
                  <span style={{ color: C.text }}>{s.name}</span>
                  <span className="font-bold text-red-500">{s.gpa.toFixed(1)}%</span>
                </div>
              ))}
              {gpaData.students.filter((s: any) => s.gpa < 70).length === 0 && (
                <p className="text-sm text-center py-2" style={{ color: C.muted }}>Barcha o'quvchilar yaxshi!</p>
              )}
            </div>
          </PCard>
        </div>
      )}
    </div>
  );
}

// ── Teacher KPI Section ────────────────────────────────────────────────────────
function TeacherKPISection() {
  const { user, activeBranchId } = useAuthStore();
  const router   = useRouter();

  const { data: todaySlots, isLoading: schedLoading } = useQuery({
    queryKey: ['schedule', 'today', activeBranchId],
    queryFn: scheduleApi.getToday,
    staleTime: 10 * 60_000,
  });

  const { data: homeworks = [] } = useQuery({
    queryKey: ['homework', activeBranchId],
    queryFn: () => homeworkApi.getAll(),
    staleTime: 5 * 60_000,
  });

  const myLessonsToday = (Array.isArray(todaySlots) ? todaySlots : [])
    .filter((s: any) => s.teacherId === user?.id).length;

  const hwList       = homeworks as any[];
  const pendingGrade = hwList.reduce((acc: number, hw: any) => {
    const subs = hw.submissions ?? [];
    return acc + subs.filter((s: any) => s.score === null || s.score === undefined).length;
  }, 0);

  const isClassTeacher = user?.role === 'class_teacher';
  const colors: IconColor[] = ['blue', 'emerald', 'amber', 'violet'];

  const teacherKpis = [
    ...(isClassTeacher ? [{ title: 'Mening sinfim', value: '→', icon: School,        description: "Sinf ro'yxati, davomat",    href: '/dashboard/my-class'  }] : []),
    { title: 'Bugun darslarim',       value: schedLoading ? '...' : myLessonsToday, icon: Calendar,       description: 'Bugungi dars soatlari', href: '/dashboard/schedule'  },
    { title: 'Baholanmagan',          value: pendingGrade,                           icon: ClipboardCheck, description: 'Kutayotgan topshiriqlar',href: '/dashboard/homework'  },
    { title: 'Jami uy vazifalari',    value: hwList.length,                          icon: BookMarked,     description: 'Berilgan vazifalar',     href: '/dashboard/homework'  },
  ];

  return (
    <div className={cn('grid gap-4', isClassTeacher ? 'sm:grid-cols-4' : 'sm:grid-cols-3')}>
      {teacherKpis.map(({ title, value, icon, description, href }, i) => (
        <StatCard
          key={title}
          title={title}
          value={value}
          icon={icon}
          color={colors[i % colors.length]}
          description={description}
          onClick={() => router.push(href)}
        />
      ))}
    </div>
  );
}

// ── Vice Principal Section ─────────────────────────────────────────────────────
function VicePrincipalSection() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { activeBranchId } = useAuthStore();
  const weekAgo      = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const today        = new Date().toISOString().slice(0, 10);

  const { data: leaveData }     = useQuery({ queryKey: ['leave-requests', 'pending', activeBranchId], queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }) });
  const { data: disciplineData }= useQuery({ queryKey: ['discipline', 'week', activeBranchId],        queryFn: () => disciplineApi.getAll({ from: weekAgo, to: today, limit: 50 }) });

  const pendingLeaves: any[]     = leaveData?.data ?? (Array.isArray(leaveData) ? leaveData : []);
  const disciplineList: any[]    = disciplineData?.data ?? [];
  const unresolvedDiscipline     = disciplineList.filter((d: any) => !d.resolved);

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => leaveRequestsApi.review(id, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const items = [
    { title: "Ta'til so'rovlari",   value: pendingLeaves.length,       desc: "Kutilayotgan so'rovlar",    icon: CalendarOff,  color: 'amber' as IconColor, href: '/dashboard/leave-requests', alert: pendingLeaves.length > 0 },
    { title: "Intizom hodisalari",  value: unresolvedDiscipline.length, desc: 'Hal qilinmagan (7 kun)',  icon: ShieldAlert,  color: 'red'   as IconColor, href: '/dashboard/discipline',     alert: unresolvedDiscipline.length > 0 },
    { title: "Ota-ona uchrashuvlari",value: '→',                        desc: "Uchrashuvlar jadvali",    icon: CalendarCheck,color: 'blue'  as IconColor, href: '/dashboard/meetings',       alert: false },
    { title: 'Ish yuklamasi',       value: '→',                        desc: "O'qituvchilar yuklamasi",  icon: Activity,     color: 'violet'as IconColor, href: '/dashboard/reports/workload',alert: false },
  ];

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: C.muted }}>O'rinbosar ko'rsatkichlari</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ title, value, desc, icon, color, href }) => (
          <StatCard key={title} title={title} value={value} icon={icon} color={color} description={desc} onClick={() => router.push(href)} />
        ))}
      </div>

      {pendingLeaves.length > 0 && (
        <PCard>
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm flex items-center gap-2" style={{ color: C.text }}>
              <CalendarOff className="h-4 w-4 text-amber-500" />
              Tezkor tasdiqlash — Ta&apos;til so&apos;rovlari
            </p>
            <button onClick={() => router.push('/dashboard/leave-requests')} className="text-xs font-semibold" style={{ color: C.primary }}>
              Barchasini ko&apos;rish →
            </button>
          </div>
          <div className="space-y-2">
            {pendingLeaves.slice(0, 5).map((leave: any) => {
              const name = `${leave.user?.firstName ?? ''} ${leave.user?.lastName ?? ''}`.trim() || 'Noma\'lum';
              const from = leave.startDate ? new Date(leave.startDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' }) : '—';
              const to   = leave.endDate   ? new Date(leave.endDate).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' }) : '—';
              return (
                <div key={leave.id} className="flex items-center gap-3 rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: C.text }}>{name}</p>
                    <p className="text-xs truncate" style={{ color: C.muted }}>{from} – {to} · {leave.reason?.slice(0, 30) ?? '—'}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold transition-colors"
                      style={{ background: C.primaryLight, color: C.primary }}
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ id: leave.id, action: 'approve' })}
                    >✓ Tasdiqlash</button>
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold transition-colors"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}
                      disabled={reviewMutation.isPending}
                      onClick={() => reviewMutation.mutate({ id: leave.id, action: 'reject' })}
                    >✕ Rad</button>
                  </div>
                </div>
              );
            })}
            {pendingLeaves.length > 5 && (
              <p className="text-xs text-center pt-1" style={{ color: C.muted }}>+{pendingLeaves.length - 5} ta boshqa so&apos;rov</p>
            )}
          </div>
        </PCard>
      )}
    </div>
  );
}

// ── Admin Charts Section ───────────────────────────────────────────────────────
const MONTH_LABELS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function AdminChartsSection() {
  const { activeBranchId } = useAuthStore();
  const now         = new Date();
  const sixMonthsAgo= new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  const { data: paymentHistory, isLoading: payLoading } = useQuery({
    queryKey: ['payments', 'history', 'trend', activeBranchId],
    queryFn: () => paymentsApi.getHistory({ from: sixMonthsAgo, status: 'paid', limit: 500 }),
  });

  const { data: attendanceReport, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', 'report', 'trend', activeBranchId],
    queryFn: () => attendanceApi.getReport({
      startDate: new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    }),
  });

  const revenueData = (() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
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

  const attendanceTrend = (() => {
    const records: any[] = Array.isArray(attendanceReport) ? attendanceReport : (attendanceReport?.data ?? []);
    const byDate: Record<string, { present: number; total: number }> = {};
    records.forEach((r: any) => {
      const d = r.date?.slice(0, 10) ?? '';
      if (!d) return;
      if (!byDate[d]) byDate[d] = { present: 0, total: 0 };
      byDate[d].total++;
      if (r.status === 'present') byDate[d].present++;
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
      {/* Revenue bar chart */}
      <PCard>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Oylik daromad</p>
            <p className="text-[12px] mt-1 font-medium" style={{ color: C.muted }}>So&apos;nggi 6 oy (so&apos;m)</p>
          </div>
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: '#DBEAFE' }}>
            <BarChart2 className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        {payLoading ? <Skeleton className="h-52 rounded-2xl" /> : (
          <ResponsiveContainer width="100%" height={216}>
            <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Tushum']}
                contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
                cursor={{ fill: 'rgba(15,123,83,0.04)' }}
              />
              <defs>
                <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#0F7B53" stopOpacity={1} />
                </linearGradient>
              </defs>
              <Bar dataKey="amount" fill="url(#revenueBarGrad)" radius={[10, 10, 3, 3]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </PCard>

      {/* Attendance trend */}
      <PCard>
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Davomat trendi</p>
            <p className="text-[12px] mt-1 font-medium" style={{ color: C.muted }}>So&apos;nggi 7 kun (%)</p>
          </div>
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: C.primaryLight }}>
            <TrendingUp className="h-5 w-5" style={{ color: C.primary }} />
          </div>
        </div>
        {attLoading ? <Skeleton className="h-52 rounded-2xl" /> : attendanceTrend.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm" style={{ color: C.muted }}>Ma&apos;lumot yo&apos;q</div>
        ) : (
          <ResponsiveContainer width="100%" height={216}>
            <LineChart data={attendanceTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, 'Davomat']}
                contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 12 }}
                cursor={{ stroke: 'rgba(15,123,83,0.1)', strokeWidth: 1 }}
              />
              <Line type="monotone" dataKey="pct" stroke={C.primary} strokeWidth={2.5}
                dot={{ r: 4, fill: '#fff', stroke: C.primary, strokeWidth: 2 }}
                activeDot={{ r: 6, fill: C.primary, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </PCard>
    </div>
  );
}

// ── Quick action grid ──────────────────────────────────────────────────────────
function QuickActions({ items }: { items: { label: string; href: string; icon: React.ElementType; iconColor: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ label, href, icon: Icon, iconColor }) => (
        <Link
          key={href + label}
          href={href}
          className="flex items-center gap-3 rounded-[16px] p-4 transition-all duration-150 hover:-translate-y-[1px]"
          style={{
            border: '1px solid rgba(0,0,0,0.05)',
            background: 'rgba(0,0,0,0.01)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${iconColor}18` }}
          >
            <Icon className="h-4 w-4 shrink-0" style={{ color: iconColor }} />
          </div>
          <span className="text-[13px] font-semibold" style={{ color: C.text }}>{label}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Accountant Dashboard ───────────────────────────────────────────────────────
const PIE_COLORS = [C.primary, '#EF4444', '#F59E0B'];

function AccountantDashboard() {
  const { user, activeBranchId } = useAuthStore();
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  const { data: paymentReport, isLoading: reportLoading } = useQuery({ queryKey: ['payments', 'report', activeBranchId], queryFn: paymentsApi.getReport });
  const { data: paymentHistory, isLoading: histLoading } = useQuery({
    queryKey: ['payments', 'history', 'trend', activeBranchId],
    queryFn: () => paymentsApi.getHistory({ from: sixMonthsAgo, limit: 500 }),
  });

  const monthlyData = (() => {
    const months: Record<string, { paid: number; pending: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
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

  const pieData = [
    { name: "To'langan", value: paymentReport?.monthly?.paid ?? 0 },
    { name: 'Kechikkan',  value: paymentReport?.overdue ?? 0 },
    { name: 'Kutilmoqda', value: paymentReport?.monthly?.pending ?? 0 },
  ].filter(d => d.value > 0);

  const totalRevenue = paymentReport?.monthly?.paid ?? 0;
  const overdueAmt   = paymentReport?.overdue ?? 0;
  const debtors: any[] = paymentReport?.debtors ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[36px] font-extrabold tracking-tight leading-[1.1]" style={{ color: C.text }}>
            Moliya boshqaruvi
          </h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>Hisobchi — {user?.firstName}</p>
        </div>
        <Button asChild><a href="/dashboard/payments"><CreditCard className="mr-2 h-4 w-4" />To&apos;lovlar</a></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Bu oy tushumi"       value={formatCurrency(totalRevenue)} icon={DollarSign}  trend="up"   description="Oylik tushum"       loading={reportLoading} color="emerald" />
        <StatCard title="Kechikkan to'lovlar" value={formatCurrency(overdueAmt)}   icon={AlertCircle} trend="down" description="Qarzdorlik miqdori" loading={reportLoading} color="red"     />
        <StatCard title="Qarzdorlar soni"     value={debtors.length}               icon={Users}       description="Aktiv qarzdorlar"   loading={reportLoading} color="amber"   />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PCard>
          <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>Oylik tushum dinamikasi</p>
          <p className="text-xs mb-5" style={{ color: C.muted }}>So'nggi 6 oy (so'm)</p>
          {histLoading ? <Skeleton className="h-52" /> : (
            <ResponsiveContainer width="100%" height={208}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: C.muted }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'paid' ? "To'langan" : 'Kutilmoqda']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: C.shadow, fontSize: 12 }} />
                <Bar dataKey="paid"    fill={C.primary} radius={[6, 6, 0, 0]} stackId="a" maxBarSize={36} />
                <Bar dataKey="pending" fill="#F59E0B"   radius={[6, 6, 0, 0]} stackId="a" maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </PCard>

        <PCard>
          <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>To'lov holati</p>
          <p className="text-xs mb-5" style={{ color: C.muted }}>Bu oy — To'langan / Kutilmoqda / Kechikkan</p>
          <div className="flex items-center justify-center">
            {reportLoading ? <Skeleton className="h-52 w-52 rounded-full" /> : pieData.length === 0 ? (
              <p className="py-8 text-sm" style={{ color: C.muted }}>Ma'lumot yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: C.shadow, fontSize: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </PCard>
      </div>

      {debtors.length > 0 && (
        <PCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Qarzdorlar ro'yxati</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Eng katta qarzdorliklar</p>
            </div>
            <a href="/dashboard/payments" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</a>
          </div>
          <div className="space-y-2">
            {debtors.slice(0, 8).map((d: any, i: number) => (
              <div key={d.id ?? i} className="flex items-center justify-between rounded-[14px] border p-3.5" style={{ borderColor: C.border }}>
                <div className="flex items-center gap-3">
                  <span
                    className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: C.border, color: C.muted }}
                  >{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.text }}>{d.student?.firstName} {d.student?.lastName}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{d.student?.class?.name ?? ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-500 text-sm">{formatCurrency(d.amount)}</span>
                  <Badge variant={d.status === 'overdue' ? 'destructive' : 'warning'}>
                    {d.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </PCard>
      )}
    </div>
  );
}

// ── Super Admin Dashboard ──────────────────────────────────────────────────────
function SuperAdminDashboard() {
  const { data: stats, isLoading }          = useQuery({ queryKey: ['super-admin', 'stats'],   queryFn: superAdminApi.getStats });
  const { data: schools, isLoading: schoolsLoading } = useQuery({ queryKey: ['super-admin', 'schools'], queryFn: () => superAdminApi.getSchools({ limit: 5 }) });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[36px] font-extrabold tracking-tight leading-[1.1]" style={{ color: C.text }}>Platform boshqaruvi</h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>EduPlatform — Super Admin paneli</p>
        </div>
        <Button asChild><Link href="/dashboard/schools"><Building2 className="mr-2 h-4 w-4" />Maktablar</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Jami maktablar"       value={isLoading ? '...' : (stats?.schoolCount ?? 0)}          icon={School}       description="Aktiv maktablar"              color="blue"    loading={isLoading} />
        <StatCard title="Jami foydalanuvchilar" value={isLoading ? '...' : (stats?.userCount ?? 0)}            icon={Users}        description="Barcha maktablar bo'yicha"    color="violet"  loading={isLoading} />
        <StatCard title="Aktiv subscriptionlar" value={isLoading ? '...' : (stats?.activeSubscriptions ?? 0)} icon={CheckCircle2} description="To'lov qilayotgan maktablar" color="emerald" loading={isLoading} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>So'nggi maktablar</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>Platformdagi barcha maktablar</p>
            </div>
            <Link href="/dashboard/schools" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
          </div>
          {schoolsLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-2xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {(schools?.data ?? []).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-[14px] border p-3.5" style={{ borderColor: C.border }}>
                  <div>
                    <p className="font-medium text-sm" style={{ color: C.text }}>{s.name}</p>
                    <p className="text-xs" style={{ color: C.muted }}>{s.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={s.isActive ? 'success' : 'destructive'}>{s.isActive ? 'Aktiv' : 'Bloklangan'}</Badge>
                    <Badge variant="secondary">{s._count?.users ?? 0} user</Badge>
                  </div>
                </div>
              ))}
              {(!schools?.data || schools.data.length === 0) && (
                <p className="py-6 text-center text-sm" style={{ color: C.muted }}>Maktablar yo'q</p>
              )}
            </div>
          )}
        </PCard>

        <PCard>
          <p className="font-bold text-[15px] mb-5" style={{ color: C.text }}>Tezkor harakatlar</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Yangi maktab',     href: '/dashboard/schools/new', icon: Building2,  iconColor: '#2563EB' },
              { label: 'Foydalanuvchilar', href: '/dashboard/users',       icon: Users,       iconColor: '#7C3AED' },
              { label: 'Modullar',         href: '/dashboard/schools',     icon: LayoutGrid,  iconColor: '#D97706' },
              { label: 'Sozlamalar',       href: '/dashboard/settings',    icon: Globe,       iconColor: C.primary },
            ].map(({ label, href, icon: Icon, iconColor }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-2.5 rounded-[16px] border p-4 text-center transition-colors hover:bg-slate-50"
                style={{ borderColor: C.border }}
              >
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: C.bg }}>
                  <Icon className="h-5 w-5" style={{ color: iconColor }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: C.text }}>{label}</span>
              </Link>
            ))}
          </div>
        </PCard>
      </div>
    </div>
  );
}

// ── Librarian Dashboard ────────────────────────────────────────────────────────
function LibrarianDashboard() {
  const { user, activeBranchId } = useAuthStore();

  const { data: libStats, isLoading } = useQuery({
    queryKey: ['library', 'stats', activeBranchId],
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
    queryKey: ['library', 'overdue', activeBranchId],
    queryFn: async () => {
      try {
        const { data } = await (await import('@/lib/api/client')).apiClient.get('/library/loans', { params: { status: 'overdue', limit: 10 } });
        return data?.data ?? [];
      } catch { return []; }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[36px] font-extrabold tracking-tight leading-[1.1]" style={{ color: C.text }}>Kutubxona boshqaruvi</h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>Kutubxonachi — {user?.firstName}</p>
        </div>
        <Button asChild><a href="/dashboard/library"><Library className="mr-2 h-4 w-4" />Kutubxona</a></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Jami kitoblar"    value={isLoading ? '...' : (libStats?.totalBooks ?? 0)}    icon={BookOpen}      description="Katalogdagi kitoblar" loading={isLoading} color="blue"    />
        <StatCard title="Mavjud kitoblar"  value={isLoading ? '...' : (libStats?.availableBooks ?? 0)}icon={BookCopy}      description="Berilishi mumkin"    loading={isLoading} color="emerald" />
        <StatCard title="Faol ijaralar"    value={isLoading ? '...' : (libStats?.activeLoans ?? 0)}   icon={ClipboardCheck}description="Berilgan kitoblar"   loading={isLoading} color="violet"  />
        <StatCard title="Muddati o'tgan"  value={isLoading ? '...' : (libStats?.overdueLoans ?? 0)}  icon={Hourglass}     description="Qaytarilmagan"       loading={isLoading} color="red"     />
      </div>

      <PCard>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-bold text-[15px]" style={{ color: C.text }}>Muddati o'tgan kitoblar</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>Qaytarilmagan va kechikkan ijaralar</p>
          </div>
          <a href="/dashboard/library" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</a>
        </div>
        {overdueLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}</div>
        ) : (overdueLoans as any[]).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <p className="text-sm" style={{ color: C.muted }}>Hamma kitoblar o'z vaqtida qaytarilgan!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(overdueLoans as any[]).map((loan: any, i: number) => (
              <div key={loan.id ?? i} className="flex items-center justify-between rounded-[14px] border border-red-100 p-3.5">
                <div>
                  <p className="font-medium text-sm" style={{ color: C.text }}>{loan.book?.title ?? 'Noma\'lum kitob'}</p>
                  <p className="text-xs" style={{ color: C.muted }}>{loan.user?.firstName} {loan.user?.lastName}</p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive">
                    {loan.dueDate ? `${Math.ceil((Date.now() - new Date(loan.dueDate).getTime()) / 86400000)} kun` : 'Kechikkan'}
                  </Badge>
                  <p className="text-xs mt-0.5" style={{ color: C.muted }}>{loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('uz-UZ') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </PCard>
    </div>
  );
}

// ── School Dashboard (main) ────────────────────────────────────────────────────
function SchoolDashboard() {
  const { user, activeBranchId } = useAuthStore();

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'count', activeBranchId],
    queryFn: () => usersApi.getAll({ limit: 100 }),
    enabled: ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? ''),
  });

  const { data: classesData, isLoading: classesLoading } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
    enabled: ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'].includes(user?.role ?? ''),
  });

  const { data: paymentReport, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', 'report', activeBranchId],
    queryFn: paymentsApi.getReport,
    enabled: ['director', 'accountant'].includes(user?.role ?? ''),
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', 'count', activeBranchId],
    queryFn: () => subjectsApi.getAll(),
    enabled: ['director', 'branch_admin'].includes(user?.role ?? ''),
  });

  const classList     = Array.isArray(classesData) ? classesData : [];
  const subjectsCount = Array.isArray(subjectsData) ? subjectsData.length : 0;

  const dayLabel = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* ── Welcome header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[42px] font-extrabold tracking-tight leading-[1.1]" style={{ color: C.text }}>
            Xush kelibsiz,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #0F7B53 0%, #10b981 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>{user?.firstName}!</span>
          </h1>
          <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>
            {getRoleLabel(user?.role ?? '')} &middot; {dayLabel}
          </p>
        </div>
      </div>

      {/* ── Onboarding ── */}
      {user?.role === 'director' && (
        <OnboardingChecklist classList={classList} usersData={usersData} subjectsCount={subjectsCount} />
      )}

      {/* ── Vice principal ── */}
      {user?.role === 'vice_principal' && <VicePrincipalSection />}

      {/* ── Charts (admin / VP) ── */}
      {['director', 'vice_principal'].includes(user?.role ?? '') && <AdminChartsSection />}

      {/* ── Class teacher: my class ── */}
      {user?.role === 'class_teacher' && <ClassTeacherMyClassSection />}

      {/* ── Teacher KPIs ── */}
      {['teacher', 'class_teacher'].includes(user?.role ?? '') && <TeacherKPISection />}

      {/* ── Stat cards row ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '') && (
          <StatCard title="Foydalanuvchilar" value={usersData?.meta.total ?? 0}      icon={Users}      description="Aktiv foydalanuvchilar" color="violet"  loading={usersLoading}   href="/dashboard/users" />
        )}
        {!['student', 'parent'].includes(user?.role ?? '') && (
          <StatCard title="Sinflar"           value={classList.length}               icon={School}     description="Aktiv sinflar"         color="blue"    loading={classesLoading} href="/dashboard/classes" />
        )}
        {['director', 'accountant'].includes(user?.role ?? '') && (
          <>
            <StatCard title="Bu oy tushumi" value={formatCurrency(paymentReport?.monthly?.paid ?? 0)} icon={CreditCard}   trend="up"   description="Oylik tushum"       color="emerald" loading={paymentsLoading} href="/dashboard/payments" />
            <StatCard title="Qarzdorlar"    value={formatCurrency(paymentReport?.overdue ?? 0)}       icon={AlertCircle} trend="down" description="Kechikkan to'lovlar" color="red"     loading={paymentsLoading} href="/dashboard/payments" />
          </>
        )}
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {['director', 'vice_principal', 'class_teacher', 'teacher', 'branch_admin'].includes(user?.role ?? '') && (
          <AttendanceSummaryWidget />
        )}
        {['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'].includes(user?.role ?? '') && (
          <UpcomingExamsWidget />
        )}
        {['teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin'].includes(user?.role ?? '') && (
          <TodayScheduleWidget />
        )}

        {/* Debtors list */}
        {['director', 'accountant'].includes(user?.role ?? '') && (paymentReport?.debtors?.length ?? 0) > 0 && (
          <PCard>
            <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>Qarzdorlar</p>
            <p className="text-xs mb-5" style={{ color: C.muted }}>Kechikkan va kutilayotgan to'lovlar</p>
            <div className="space-y-2">
              {paymentReport.debtors.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: C.text }}>{d.student.firstName} {d.student.lastName}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: C.text }}>{formatCurrency(d.amount)}</span>
                    <Badge variant={d.status === 'overdue' ? 'destructive' : 'warning'}>
                      {d.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </PCard>
        )}

        {/* Classes list */}
        {classList.length > 0 && (
          <PCard>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-[15px]" style={{ color: C.text }}>Sinflar</p>
                <p className="text-xs mt-0.5" style={{ color: C.muted }}>{classList.length} ta sinf ro'yxatda</p>
              </div>
              <Link href="/dashboard/classes" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
            </div>
            <div className="space-y-2">
              {classList.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                  <span className="font-medium text-sm" style={{ color: C.text }}>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{c._count?.students ?? 0} o'quvchi</Badge>
                    <span className="text-xs" style={{ color: C.muted }}>{c.academicYear}</span>
                  </div>
                </div>
              ))}
            </div>
          </PCard>
        )}

        {/* Quick actions */}
        <PCard>
          <p className="font-bold text-[15px] mb-5" style={{ color: C.text }}>Tezkor harakatlar</p>
          {user?.role === 'director' && (
            <QuickActions items={[
              { label: 'Foydalanuvchi qo\'sh', href: '/dashboard/users',      icon: Users,         iconColor: '#7C3AED' },
              { label: 'Davomat',              href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: "To'lovlar",            href: '/dashboard/payments',   icon: CreditCard,     iconColor: '#2563EB' },
              { label: 'Hisobotlar',           href: '/dashboard/reports',    icon: BookOpen,       iconColor: '#D97706' },
            ]} />
          )}
          {['teacher', 'class_teacher'].includes(user?.role ?? '') && (
            <QuickActions items={[
              { label: 'Davomat belgi', href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: 'Baho qo\'sh',   href: '/dashboard/grades',     icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Uy vazifasi',   href: '/dashboard/homework',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: 'Imtihon',       href: '/dashboard/exams',      icon: GraduationCap,  iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'accountant' && (
            <QuickActions items={[
              { label: "To'lov qabul", href: '/dashboard/payments',  icon: CreditCard,     iconColor: C.primary },
              { label: 'Maosh',        href: '/dashboard/payroll',   icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Hisobot',      href: '/dashboard/reports',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: 'Sozlamalar',   href: '/dashboard/settings',  icon: GraduationCap,  iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'vice_principal' && (
            <QuickActions items={[
              { label: 'Davomat',      href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: 'Baholar',      href: '/dashboard/grades',     icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Dars jadvali', href: '/dashboard/schedule',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: 'Hisobot',      href: '/dashboard/reports',    icon: GraduationCap,  iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'branch_admin' && (
            <QuickActions items={[
              { label: 'Davomat',      href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary },
              { label: 'Baholar',      href: '/dashboard/grades',     icon: BookOpen,       iconColor: '#2563EB' },
              { label: 'Dars jadvali', href: '/dashboard/schedule',   icon: Calendar,       iconColor: '#7C3AED' },
              { label: "O'quvchilar",  href: '/dashboard/students',   icon: Users,          iconColor: '#D97706' },
            ]} />
          )}
          {user?.role === 'librarian' && (
            <QuickActions items={[
              { label: 'Kitoblar',   href: '/dashboard/library',   icon: BookOpen,      iconColor: '#2563EB' },
              { label: 'Xabarlar',  href: '/dashboard/messages',  icon: Calendar,      iconColor: '#7C3AED' },
              { label: 'Sozlamalar',href: '/dashboard/settings',  icon: GraduationCap, iconColor: '#D97706' },
            ]} />
          )}
        </PCard>
      </div>
    </div>
  );
}

// ── Parent Dashboard ───────────────────────────────────────────────────────────
function ParentDashboard() {
  const { user, activeBranchId }    = useAuthStore();
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  const { data: children = [], isLoading: childrenLoading } = useQuery({ queryKey: ['parent', 'children', activeBranchId], queryFn: parentApi.getChildren });
  const childList: any[] = Array.isArray(children) ? children : [];
  const activeChild = selectedChildId || childList[0]?.id;

  const { data: attendance }    = useQuery({ queryKey: ['parent', 'attendance', activeChild, activeBranchId], queryFn: () => parentApi.getChildAttendance(activeChild),  enabled: !!activeChild });
  const { data: gradesData }    = useQuery({ queryKey: ['parent', 'grades',     activeChild, activeBranchId], queryFn: () => parentApi.getChildGrades(activeChild),     enabled: !!activeChild });
  const { data: payments }      = useQuery({ queryKey: ['parent', 'payments',   activeChild, activeBranchId], queryFn: () => parentApi.getChildPayments(activeChild),   enabled: !!activeChild });
  const { data: upcomingExams = [] } = useQuery({ queryKey: ['parent', 'exams',      activeChild, activeBranchId], queryFn: () => examsApi.getUpcoming(14), enabled: !!activeChild });

  const grades: any[]       = gradesData?.grades ?? [];
  const attendanceStats     = attendance ?? {};
  const paymentList: any[]  = Array.isArray(payments) ? payments : [];
  const pending             = paymentList.filter((p: any) => p.status === 'pending' || p.status === 'overdue');

  const gpaTrend = [...grades]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map((g: any) => ({
      date: new Date(g.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' }),
      pct:  g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : 0,
    }));

  const nextExams: any[] = (Array.isArray(upcomingExams) ? upcomingExams : []).slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[42px] font-extrabold tracking-tight leading-[1.1]" style={{ color: C.text }}>
          Xush kelibsiz,{' '}
          <span style={{
            background: 'linear-gradient(135deg, #0F7B53 0%, #10b981 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>{user?.firstName}!</span>
        </h1>
        <p className="text-[15px] mt-1.5 font-medium" style={{ color: C.muted }}>Farzandlaringizning o&apos;qish holati</p>
      </div>

      {childList.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {childList.map((child: any) => (
            <Button key={child.id} variant={activeChild === child.id ? 'default' : 'outline'} size="sm"
              onClick={() => setSelectedChildId(child.id)}>
              {child.firstName} {child.lastName}
            </Button>
          ))}
        </div>
      )}

      {childrenLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-[22px]" />)}</div>
      ) : childList.length === 0 ? (
        <PCard className="py-12 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 opacity-20" />
          <p style={{ color: C.muted }}>Farzandlar bog'lanmagan</p>
        </PCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Davomat"        value={attendanceStats.present ?? 0}      icon={ClipboardCheck} description="Kelgan kunlar"     color="emerald" />
            <StatCard title="O'rtacha baho"  value={`${gradesData?.gpa ?? 0}%`}        icon={BookOpen}       description="Joriy daraja"      color="blue"    />
            <StatCard title="To'lovlar"      value={pending.length}                    icon={CreditCard}     description={pending.length > 0 ? 'Kutilayotgan' : "Hammasi to'langan"} color={pending.length > 0 ? 'red' : 'emerald'} />
          </div>

          {gpaTrend.length >= 3 && (
            <PCard>
              <p className="font-bold text-[15px] mb-1" style={{ color: C.text }}>Baho trendi</p>
              <p className="text-xs mb-5" style={{ color: C.muted }}>So'nggi {gpaTrend.length} ta bahoning dinamikasi</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={gpaTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: number) => [`${v}%`, 'Ball %']}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: C.shadow, fontSize: 12 }} />
                  <Line type="monotone" dataKey="pct" stroke="#2563EB" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </PCard>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {grades.length > 0 && (
              <PCard>
                <div className="flex items-center justify-between mb-5">
                  <p className="font-bold text-[15px]" style={{ color: C.text }}>So'nggi baholar</p>
                  <Link href="/dashboard/grades" className="text-xs font-semibold" style={{ color: C.primary }}>Barchasi →</Link>
                </div>
                <div className="space-y-2">
                  {grades.slice(0, 5).map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: C.text }}>{g.subject?.name}</p>
                        <p className="text-xs" style={{ color: C.muted }}>{new Date(g.date).toLocaleDateString('uz-UZ')}</p>
                      </div>
                      <Badge variant={(g.score / g.maxScore) >= 0.8 ? 'success' : (g.score / g.maxScore) >= 0.6 ? 'secondary' : 'destructive'}>
                        {g.score}/{g.maxScore}
                      </Badge>
                    </div>
                  ))}
                </div>
              </PCard>
            )}

            {nextExams.length > 0 && (
              <PCard>
                <p className="font-bold text-[15px] mb-5" style={{ color: C.text }}>Yaqin imtihonlar</p>
                <div className="space-y-2">
                  {nextExams.map((exam: any) => {
                    const d        = new Date(exam.scheduledAt);
                    const isToday  = d.toDateString() === new Date().toDateString();
                    const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
                    return (
                      <div key={exam.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                        <div>
                          <p className="font-medium text-sm" style={{ color: C.text }}>{exam.subject?.name}</p>
                          <p className="text-xs" style={{ color: C.muted }}>{exam.class?.name}</p>
                        </div>
                        <Badge variant={isToday ? 'destructive' : daysLeft <= 2 ? 'warning' : 'secondary'}>
                          {isToday ? 'Bugun' : daysLeft === 1 ? 'Ertaga' : `${daysLeft} kun`}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </PCard>
            )}

            {pending.length > 0 && (
              <PCard>
                <p className="font-bold text-[15px] mb-5 text-red-600">Kutilayotgan to'lovlar</p>
                <div className="space-y-2">
                  {pending.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-[14px] border border-red-100 p-3">
                      <span className="text-sm" style={{ color: C.text }}>{p.description ?? "O'qish to'lovi"}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm" style={{ color: C.text }}>{formatCurrency(p.amount)}</span>
                        <Badge variant="destructive">{p.status === 'overdue' ? 'Kechikkan' : 'Kutilmoqda'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </PCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Director Dashboard ─────────────────────────────────────────────────────────
function DirectorDashboard() {
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();
  const [annTitle,   setAnnTitle]  = useState('');
  const [annBody,    setAnnBody]   = useState('');
  const [annTarget,  setAnnTarget] = useState('all_staff');

  // School-wide queries — no branchId in cache key; backend returns school-level aggregation for DIRECTOR role
  const { data: attendanceSummary, isLoading: attLoading } = useQuery({ queryKey: ['attendance', 'today-summary', 'school-wide'],    queryFn: attendanceApi.getTodaySummary });
  const { data: classesData }  = useQuery({ queryKey: ['classes', 'school-wide'],              queryFn: classesApi.getAll });
  const { data: usersData }    = useQuery({ queryKey: ['users', 'all', 'school-wide'],          queryFn: () => usersApi.getAll({ limit: 200 }) });
  const { data: pendingLeaves }= useQuery({ queryKey: ['leave-requests', 'pending', 'school-wide'], queryFn: () => leaveRequestsApi.getAll({ status: 'pending' }) });
  const { data: financeData }  = useQuery({ queryKey: ['finance', 'dashboard', 'school-wide'], queryFn: financeApi.getDashboard });
  const { data: pendingDiscipline } = useQuery({ queryKey: ['discipline', 'unresolved', 'school-wide'], queryFn: () => disciplineApi.getAll().catch(() => ({ data: [] })) });
  const { data: coinStats } = useQuery({ queryKey: ['coins', 'admin', 'stats'], queryFn: () => coinsApi.getAdminBalances().catch(() => ({ data: [] })), staleTime: 60_000 });

  const classList: any[]         = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const allUsers: any[]          = (usersData as any)?.data ?? [];
  const teacherCount             = allUsers.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)).length;
  const studentCount             = allUsers.filter((u: any) => u.role === 'student').length;
  const pendingLeaveList: any[]  = (pendingLeaves as any)?.data ?? pendingLeaves ?? [];
  const pendingDisciplineList: any[] = (pendingDiscipline as any)?.data ?? [];

  const presentPct    = (attendanceSummary as any)?.presentPct ?? 0;
  const totalStudents = (attendanceSummary as any)?.totalStudents ?? 0;

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => leaveRequestsApi.review(id, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leave-requests'] }),
  });

  const broadcastMutation = useMutation({
    mutationFn: notificationsApi.broadcast,
    onSuccess: () => { setAnnTitle(''); setAnnBody(''); },
  });

  const handleBroadcast = () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    broadcastMutation.mutate({ targetGroup: annTarget, title: annTitle, body: annBody });
  };

  const dayLabel = new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[40px] font-black tracking-tight leading-none" style={{ color: C.text }}>
          Direktor paneli
        </h1>
        <p className="text-sm mt-2" style={{ color: C.muted }}>
          Maktab umumiy holati &middot; {dayLabel}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Bugungi davomat" value={`${presentPct}%`}   description={`${totalStudents} ta o'quvchidan`} icon={ClipboardCheck} trend={presentPct >= 90 ? 'up' : 'down'} loading={attLoading} color="emerald" />
        <StatCard title="Sinflar soni"    value={classList.length}    description="Faol sinflar"                      icon={School}         color="blue"    />
        <StatCard title="O'qituvchilar"  value={teacherCount}        description="Faol xodimlar"                    icon={Users}          color="violet"  />
        <StatCard title="Oylik tushum"    value={formatCurrency((financeData as any)?.thisMonthRevenue ?? 0)} description="Joriy oy" icon={TrendingUp} color="amber" />
        <StatCard title="EduCoin aylanma" value={((coinStats as any)?.data?.length ?? 0).toLocaleString()} description="Faol o'quvchilar" icon={Coins} color="amber" href="/dashboard/coins" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Leave approval */}
        <PCard>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Ta'til so'rovlari</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{pendingLeaveList.length} ta kutilmoqda</p>
            </div>
            <Badge variant={pendingLeaveList.length > 0 ? 'destructive' : 'secondary'}>
              {pendingLeaveList.length} ta
            </Badge>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pendingLeaveList.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                <p className="text-sm" style={{ color: C.muted }}>Kutilayotgan so'rovlar yo'q</p>
              </div>
            ) : (
              pendingLeaveList.slice(0, 8).map((req: any) => (
                <div key={req.id} className="flex items-center justify-between rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                      {req.requester?.firstName} {req.requester?.lastName}
                    </p>
                    <p className="text-xs truncate" style={{ color: C.muted }}>
                      {new Date(req.startDate).toLocaleDateString('uz-UZ')} – {new Date(req.endDate).toLocaleDateString('uz-UZ')}
                      {req.reason ? ` · ${req.reason.slice(0, 25)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold"
                      style={{ background: C.primaryLight, color: C.primary }}
                      onClick={() => reviewMutation.mutate({ id: req.id, action: 'approve' })}
                      disabled={reviewMutation.isPending}
                    >✓</button>
                    <button
                      className="h-7 px-3 rounded-full text-xs font-semibold"
                      style={{ background: '#FEE2E2', color: '#DC2626' }}
                      onClick={() => reviewMutation.mutate({ id: req.id, action: 'reject' })}
                      disabled={reviewMutation.isPending}
                    >✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </PCard>

        {/* Broadcast */}
        <PCard>
          <div className="flex items-center gap-2 mb-5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: '#DBEAFE' }}>
              <Bell className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color: C.text }}>E'lon yuborish</p>
              <p className="text-xs" style={{ color: C.muted }}>Toplu xabar yuborish</p>
            </div>
          </div>
          <div className="space-y-3">
            <Select value={annTarget} onValueChange={setAnnTarget}>
              <SelectTrigger className="h-10 text-sm rounded-[14px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_staff">Barcha xodimlar</SelectItem>
                <SelectItem value="all_teachers">Barcha o'qituvchilar</SelectItem>
                <SelectItem value="class_teachers">Sinf rahbarlari</SelectItem>
                <SelectItem value="all_parents">Barcha ota-onalar</SelectItem>
                <SelectItem value="all_students">Barcha o'quvchilar</SelectItem>
                <SelectItem value="vice_principal">O'rinbosarlar</SelectItem>
                <SelectItem value="accountant">Moliya bo'limi</SelectItem>
                <SelectItem value="librarian">Kutubxonachi</SelectItem>
              </SelectContent>
            </Select>
            <input
              className="w-full rounded-[14px] border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
              style={{ borderColor: C.border }}
              placeholder="E'lon sarlavhasi..."
              value={annTitle}
              onChange={e => setAnnTitle(e.target.value)}
            />
            <Textarea
              placeholder="E'lon matni..."
              value={annBody}
              onChange={e => setAnnBody(e.target.value)}
              className="resize-none text-sm rounded-[14px]"
              rows={3}
            />
            <Button
              className="w-full"
              onClick={handleBroadcast}
              disabled={!annTitle.trim() || !annBody.trim() || broadcastMutation.isPending}
            >
              {broadcastMutation.isPending ? 'Yuborilmoqda...' : broadcastMutation.isSuccess ? '✓ Yuborildi' : "📢 E'lon yuborish"}
            </Button>
          </div>
        </PCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {pendingDisciplineList.length > 0 && (
          <PCard>
            <div className="flex items-center gap-2 mb-5">
              <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
              <p className="font-bold text-[15px]" style={{ color: C.text }}>Hal qilinmagan intizom holatlari</p>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingDisciplineList.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center gap-3 rounded-[14px] border p-3" style={{ borderColor: C.border }}>
                  <div className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: C.text }}>
                      {d.student?.firstName} {d.student?.lastName}
                    </p>
                    <p className="text-xs truncate" style={{ color: C.muted }}>{d.description}</p>
                  </div>
                </div>
              ))}
              <button
                onClick={() => router.push('/dashboard/discipline')}
                className="w-full text-xs font-semibold py-2 rounded-[14px] transition-colors hover:bg-slate-50"
                style={{ color: C.primary }}
              >
                Barchasini ko'rish →
              </button>
            </div>
          </PCard>
        )}

        <PCard>
          <p className="font-bold text-[15px] mb-5" style={{ color: C.text }}>Tezkor havolalar</p>
          <QuickActions items={[
            { label: 'Davomat hisoboti', href: '/dashboard/attendance', icon: ClipboardCheck, iconColor: C.primary  },
            { label: 'Baholar',          href: '/dashboard/grades',     icon: BarChart2,      iconColor: '#2563EB'  },
            { label: 'Moliya xulosasi',  href: '/dashboard/finance',    icon: TrendingUp,     iconColor: '#D97706'  },
            { label: 'Dars jadvali',     href: '/dashboard/schedule',   icon: Calendar,       iconColor: '#7C3AED'  },
            { label: 'Xodimlar',         href: '/dashboard/staff',      icon: Users,          iconColor: C.muted    },
            { label: 'Hisobotlar',       href: '/dashboard/reports',    icon: BarChart2,      iconColor: '#4338CA'  },
          ]} />
        </PCard>
      </div>
    </div>
  );
}

// ── Student redirect ───────────────────────────────────────────────────────────
function StudentRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/student'); }, [router]);
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: C.primary }} />
    </div>
  );
}

// ── Root export ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, _hasHydrated } = useAuthStore();

  if (!_hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" style={{ borderColor: C.primary }} />
      </div>
    );
  }

  if (user?.role === 'super_admin')  return <SuperAdminDashboard />;
  if (user?.role === 'director')     return <DirectorDashboard />;
  if (user?.role === 'parent')       return <ParentDashboard />;
  if (user?.role === 'student')      return <StudentRedirect />;
  if (user?.role === 'accountant')   return <AccountantDashboard />;
  if (user?.role === 'librarian')    return <LibrarianDashboard />;
  if (user?.role === 'branch_admin') return <SchoolDashboard />;
  if (user?.role === 'teacher' || user?.role === 'class_teacher') return <SchoolDashboard />;
  return <SchoolDashboard />;
}
