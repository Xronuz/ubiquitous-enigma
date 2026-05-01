'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  GraduationCap,
  FileText,
  Flame,
  Star,
  Trophy,
  Zap,
  Award,
  Target,
  Download,
  Coins,
  ShoppingBag,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api/client';
import { examsApi } from '@/lib/api/exams';
import { coinsApi } from '@/lib/api/coins';
import { UserRole, GradeType, AttendanceStatus, DayOfWeek } from '@eduplatform/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScheduleLesson {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  subject: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  room?: string;
}

interface Grade {
  id: string;
  score: number;
  maxScore: number;
  type: GradeType;
  date: string;
  comment?: string;
  subject: {
    id: string;
    name: string;
  };
}

interface GradesResponse {
  grades: Grade[];
  gpa: number;
}

interface Homework {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  subject: {
    id: string;
    name: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  submission?: {
    id: string;
    submittedAt: string;
    status: string;
  } | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  subject?: {
    id: string;
    name: string;
  };
  comment?: string;
}

// ─── Mappings ─────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.MONDAY]: 'Dushanba',
  [DayOfWeek.TUESDAY]: 'Seshanba',
  [DayOfWeek.WEDNESDAY]: 'Chorshanba',
  [DayOfWeek.THURSDAY]: 'Payshanba',
  [DayOfWeek.FRIDAY]: 'Juma',
  [DayOfWeek.SATURDAY]: 'Shanba',
  [DayOfWeek.SUNDAY]: 'Yakshanba',
};

const DAY_ORDER: DayOfWeek[] = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
  DayOfWeek.SUNDAY,
];

const GRADE_TYPE_LABELS: Record<GradeType, string> = {
  [GradeType.HOMEWORK]: 'Uy vazifasi',
  [GradeType.CLASSWORK]: 'Dars ishi',
  [GradeType.TEST]: 'Test',
  [GradeType.EXAM]: 'Imtihon',
  [GradeType.QUARTERLY]: 'Chorak',
  [GradeType.FINAL]: 'Yakuniy',
};

const ATTENDANCE_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  [AttendanceStatus.PRESENT]: {
    label: 'Keldi',
    color: 'text-green-600',
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
  [AttendanceStatus.ABSENT]: {
    label: 'Kelmadi',
    color: 'text-red-600',
    icon: <XCircle className="h-4 w-4 text-red-600" />,
  },
  [AttendanceStatus.LATE]: {
    label: 'Kechikdi',
    color: 'text-yellow-600',
    icon: <Clock className="h-4 w-4 text-yellow-600" />,
  },
  [AttendanceStatus.EXCUSED]: {
    label: 'Uzrli',
    color: 'text-blue-600',
    icon: <AlertCircle className="h-4 w-4 text-blue-600" />,
  },
};

// ─── Helper functions ─────────────────────────────────────────────────────────

function getGradeColor(score: number, maxScore: number): string {
  const pct = (score / maxScore) * 100;
  if (pct >= 85) return 'text-green-600';
  if (pct >= 70) return 'text-blue-600';
  if (pct >= 55) return 'text-yellow-600';
  return 'text-red-600';
}

function getGradeTypeBadgeVariant(
  type: GradeType,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (type) {
    case GradeType.EXAM:
    case GradeType.FINAL:
      return 'destructive';
    case GradeType.TEST:
    case GradeType.QUARTERLY:
      return 'default';
    default:
      return 'secondary';
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isPastDue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

// ─── Skeleton components ──────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 3 }).map((__, j) => (
            <div key={j} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GradesSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HomeworkSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Tab content components ───────────────────────────────────────────────────

function ScheduleTab({ studentId }: { studentId: string }) {
  const { data: schedule, isLoading } = useQuery<ScheduleLesson[]>({
    queryKey: ['schedule', 'week', studentId],
    queryFn: async () => {
      const res = await apiClient.get<ScheduleLesson[]>('/schedule/week');
      return res.data;
    },
    enabled: !!studentId,
  });

  if (isLoading) return <ScheduleSkeleton />;

  if (!schedule || schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Dars jadvali topilmadi</p>
      </div>
    );
  }

  const grouped = DAY_ORDER.reduce<Record<string, ScheduleLesson[]>>((acc, day) => {
    const lessons = schedule.filter((l) => l.dayOfWeek === day);
    if (lessons.length > 0) {
      acc[day] = lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, lessons]) => (
        <div key={day}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {DAY_LABELS[day as DayOfWeek]}
          </h3>
          <div className="space-y-2">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {lesson.subject.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{lesson.subject.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {lesson.teacher?.firstName} {lesson.teacher?.lastName}
                    {lesson.room ? ` • ${lesson.room}-xona` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-medium text-muted-foreground">
                    {lesson.startTime} – {lesson.endTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GradesTab({ studentId }: { studentId: string }) {
  const { data, isLoading } = useQuery<GradesResponse>({
    queryKey: ['grades', 'student', studentId],
    queryFn: async () => {
      const res = await apiClient.get<GradesResponse>(`/grades/student/${studentId}`);
      return res.data;
    },
    enabled: !!studentId,
  });

  if (isLoading) return <GradesSkeleton />;

  const grades = data?.grades ?? [];

  if (grades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <TrendingUp className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Baholar mavjud emas</p>
      </div>
    );
  }

  // Group by subject
  const bySubject = grades.reduce<Record<string, { name: string; grades: Grade[] }>>(
    (acc, grade) => {
      const subjectId = grade.subject.id;
      if (!acc[subjectId]) {
        acc[subjectId] = { name: grade.subject.name, grades: [] };
      }
      acc[subjectId].grades.push(grade);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      {data?.gpa !== undefined && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between pt-4 pb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Umumiy o'rtacha baho (GPA)</span>
            </div>
            <span className="text-2xl font-bold text-primary">{data.gpa.toFixed(1)}</span>
          </CardContent>
        </Card>
      )}

      {Object.entries(bySubject).map(([subjectId, { name, grades: subjectGrades }]) => {
        const avg =
          subjectGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
          subjectGrades.length;

        return (
          <Card key={subjectId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">{name}</CardTitle>
                <span
                  className={`text-sm font-bold ${getGradeColor(avg, 100)}`}
                >
                  {avg.toFixed(1)}%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {subjectGrades
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((grade) => (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between py-1.5 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={getGradeTypeBadgeVariant(grade.type)} className="text-xs">
                        {GRADE_TYPE_LABELS[grade.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(grade.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {grade.comment && (
                        <span
                          className="text-xs text-muted-foreground max-w-[120px] truncate"
                          title={grade.comment}
                        >
                          {grade.comment}
                        </span>
                      )}
                      <span
                        className={`text-sm font-semibold ${getGradeColor(grade.score, grade.maxScore)}`}
                      >
                        {grade.score}/{grade.maxScore}
                      </span>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function HomeworkTab({ studentId }: { studentId: string }) {
  const { data: homeworkList, isLoading } = useQuery<Homework[]>({
    queryKey: ['homework', studentId],
    queryFn: async () => {
      const res = await apiClient.get<Homework[]>('/homework');
      return res.data;
    },
    enabled: !!studentId,
  });

  if (isLoading) return <HomeworkSkeleton />;

  const homework = homeworkList ?? [];

  if (homework.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-sm">Uy vazifalari topilmadi</p>
      </div>
    );
  }

  const active = homework.filter((hw) => !isPastDue(hw.dueDate));
  const past = homework.filter((hw) => isPastDue(hw.dueDate));

  function HomeworkItem({ hw }: { hw: Homework }) {
    const submitted = !!hw.submission;
    const overdue = isPastDue(hw.dueDate) && !submitted;

    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
          overdue ? 'border-red-200 bg-red-50/50' : 'bg-card hover:bg-accent/50'
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            submitted
              ? 'bg-green-100 text-green-600'
              : overdue
              ? 'bg-red-100 text-red-600'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {submitted ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : overdue ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{hw.title}</p>
          <p className="text-xs text-muted-foreground">
            {hw.subject.name} •{' '}
            {hw.teacher.firstName} {hw.teacher.lastName}
          </p>
          <p className="text-xs mt-0.5">
            <span className="text-muted-foreground">Muddati: </span>
            <span className={overdue ? 'text-red-600 font-medium' : 'text-foreground'}>
              {formatDate(hw.dueDate)}
            </span>
          </p>
        </div>
        <div className="shrink-0">
          {submitted ? (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50">
              Topshirildi
            </Badge>
          ) : overdue ? (
            <Badge variant="destructive" className="text-xs">
              Kechikdi
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Kutilmoqda
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            Faol uy vazifalari
            <Badge variant="secondary" className="ml-1">{active.length}</Badge>
          </h3>
          <div className="space-y-2">
            {active
              .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
              .map((hw) => (
                <HomeworkItem key={hw.id} hw={hw} />
              ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            O'tgan uy vazifalari
            <Badge variant="outline" className="ml-1">{past.length}</Badge>
          </h3>
          <div className="space-y-2">
            {past
              .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
              .map((hw) => (
                <HomeworkItem key={hw.id} hw={hw} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subject Radar Chart ──────────────────────────────────────────────────────

function SubjectRadarChart({ grades }: { grades: Grade[] }) {
  if (grades.length === 0) return null;

  // Average % per subject
  const bySubject: Record<string, { name: string; total: number; count: number }> = {};
  grades.forEach((g) => {
    const sid = g.subject.id;
    if (!bySubject[sid]) bySubject[sid] = { name: g.subject.name, total: 0, count: 0 };
    bySubject[sid].total += (g.score / g.maxScore) * 100;
    bySubject[sid].count++;
  });

  const radarData = Object.values(bySubject)
    .map((s) => ({ subject: s.name.length > 8 ? s.name.slice(0, 8) + '…' : s.name, pct: Math.round(s.total / s.count) }))
    .slice(0, 8); // max 8 subjects for readability

  if (radarData.length < 3) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Fanlar bo&apos;yicha GPA radari
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
            <Radar name="Ball %" dataKey="pct" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
            <ReTooltip formatter={(v: number) => [`${v}%`, 'Ball']} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Upcoming Exams Widget (Student) ─────────────────────────────────────────

function StudentUpcomingExams({ studentId }: { studentId: string }) {
  const router = useRouter();
  const { data: exams = [] } = useQuery({
    queryKey: ['exams', 'upcoming', studentId],
    queryFn: () => examsApi.getUpcoming(14),
    enabled: !!studentId,
  });
  const examList: any[] = Array.isArray(exams) ? exams : [];
  if (examList.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-orange-500" />
          Yaqin imtihonlar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {examList.slice(0, 5).map((exam: any) => {
          const d = new Date(exam.scheduledAt);
          const isToday = d.toDateString() === new Date().toDateString();
          const daysLeft = Math.ceil((d.getTime() - Date.now()) / 86400000);
          return (
            <button
              key={exam.id}
              onClick={() => router.push(`/dashboard/exams/${exam.id}`)}
              className="w-full flex items-center justify-between rounded-lg border p-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <div>
                <p className="font-medium">{exam.subject?.name ?? exam.title}</p>
                <p className="text-xs text-muted-foreground">
                  {d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })} — {exam.maxScore ?? exam.totalMarks} ball
                </p>
              </div>
              <Badge variant={isToday ? 'destructive' : daysLeft <= 2 ? 'default' : 'secondary'}>
                {isToday ? 'Bugun' : daysLeft === 1 ? 'Ertaga' : `${daysLeft} kun`}
              </Badge>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Gamification ─────────────────────────────────────────────────────────────

interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  earned: boolean;
}

function computeStreak(records: AttendanceRecord[]): number {
  // Sort descending by date
  const sorted = [...records]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const r of sorted) {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diffDays !== streak) break;
    if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function computeAchievements(opts: {
  gpa: number;
  attendancePct: number;
  streak: number;
  pendingHomework: number;
  totalHomework: number;
}): Achievement[] {
  const { gpa, attendancePct, streak, pendingHomework, totalHomework } = opts;
  return [
    {
      id: 'alacha',
      label: "A'lochi",
      description: 'GPA 90% dan yuqori',
      icon: <Trophy className="h-4 w-4" />,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      earned: gpa >= 90,
    },
    {
      id: 'devoniy',
      label: 'Devoniy',
      description: 'So\'nggi 30 kunda 100% davomat',
      icon: <Star className="h-4 w-4" />,
      color: 'text-green-600 bg-green-50 border-green-200',
      earned: attendancePct === 100,
    },
    {
      id: 'streak7',
      label: '7 kunlik streak',
      description: '7 kun ketma-ket keldi',
      icon: <Flame className="h-4 w-4" />,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      earned: streak >= 7,
    },
    {
      id: 'streak30',
      label: '30 kunlik streak',
      description: '30 kun ketma-ket keldi',
      icon: <Zap className="h-4 w-4" />,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      earned: streak >= 30,
    },
    {
      id: 'faol',
      label: 'Faol o\'quvchi',
      description: 'Barcha uy vazifalar topshirildi',
      icon: <Target className="h-4 w-4" />,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      earned: totalHomework > 0 && pendingHomework === 0,
    },
    {
      id: 'excellent5',
      label: 'Beshlik',
      description: 'GPA 95% dan yuqori',
      icon: <Award className="h-4 w-4" />,
      color: 'text-pink-600 bg-pink-50 border-pink-200',
      earned: gpa >= 95,
    },
  ];
}

function GamificationSection({ records, gpa, attendancePct, pendingHomework, totalHomework }: {
  records: AttendanceRecord[];
  gpa: number;
  attendancePct: number;
  pendingHomework: number;
  totalHomework: number;
}) {
  const streak = computeStreak(records);
  const achievements = computeAchievements({ gpa, attendancePct, streak, pendingHomework, totalHomework });
  const earned = achievements.filter(a => a.earned);
  const notEarned = achievements.filter(a => !a.earned);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Yutuqlar va streak
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak counter */}
        <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 px-4 py-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{streak} kun</p>
            <p className="text-xs text-muted-foreground">Ketma-ket davomat streaki</p>
          </div>
          {streak >= 7 && (
            <div className="ml-auto">
              <Badge className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-300">
                🔥 Ajoyib!
              </Badge>
            </div>
          )}
        </div>

        {/* Earned badges */}
        {earned.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Qo'lga kiritilgan yutuqlar ({earned.length})</p>
            <div className="flex flex-wrap gap-2">
              {earned.map(a => (
                <div key={a.id} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${a.color}`} title={a.description}>
                  {a.icon}
                  {a.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked badges */}
        {notEarned.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Ochilmagan yutuqlar</p>
            <div className="flex flex-wrap gap-2">
              {notEarned.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-50" title={a.description}>
                  {a.icon}
                  {a.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentPortalPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadReportCard = async () => {
    if (!user?.id) return;
    setDownloadingPdf(true);
    try {
      const { data } = await apiClient.get(`/reports/report-card/${user.id}/pdf`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `hisobot-${user.firstName}-${user.lastName}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently ignore if PDF unavailable
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Role guard
  useEffect(() => {
    if (user && user.role !== UserRole.STUDENT) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const studentId = user?.id ?? '';

  // Fetch all data for stat cards
  const { data: coinsData, isLoading: coinsLoading } = useQuery({
    queryKey: ['coins', 'balance', studentId],
    queryFn: () => coinsApi.getBalance(),
    enabled: !!studentId,
  });

  const { data: gradesData, isLoading: gradesLoading } = useQuery<GradesResponse>({
    queryKey: ['grades', 'student', studentId],
    queryFn: async () => {
      const res = await apiClient.get<GradesResponse>(`/grades/student/${studentId}`);
      return res.data;
    },
    enabled: !!studentId,
  });

  const { data: scheduleData, isLoading: scheduleLoading } = useQuery<ScheduleLesson[]>({
    queryKey: ['schedule', 'week', studentId],
    queryFn: async () => {
      const res = await apiClient.get<ScheduleLesson[]>('/schedule/week');
      return res.data;
    },
    enabled: !!studentId,
  });

  const { data: homeworkData, isLoading: homeworkLoading } = useQuery<Homework[]>({
    queryKey: ['homework', studentId],
    queryFn: async () => {
      const res = await apiClient.get<Homework[]>('/homework');
      return res.data;
    },
    enabled: !!studentId,
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', 'student', studentId],
    queryFn: async () => {
      const res = await apiClient.get<AttendanceRecord[]>(`/attendance/student/${studentId}/history`);
      return res.data;
    },
    enabled: !!studentId,
  });

  // Stat calculations
  const todayDayName = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as DayOfWeek;

  const todayLessonsCount =
    scheduleData?.filter((l) => l.dayOfWeek === todayDayName).length ?? 0;

  const gpa = gradesData?.gpa ?? 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAttendance =
    attendanceData?.filter((a) => new Date(a.date) >= thirtyDaysAgo) ?? [];
  const attendancePct =
    recentAttendance.length > 0
      ? Math.round(
          (recentAttendance.filter((a) => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length /
            recentAttendance.length) *
            100,
        )
      : 0;

  const unpaidHomework =
    homeworkData?.filter((hw) => !hw.submission && !isPastDue(hw.dueDate)).length ?? 0;

  const isStatsLoading =
    gradesLoading || scheduleLoading || homeworkLoading || attendanceLoading || coinsLoading;

  // Don't render if not a student
  if (user && user.role !== UserRole.STUDENT) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Talaba kabineti
          </h1>
          {user && (
            <p className="text-muted-foreground mt-0.5">
              Xush kelibsiz, {user.firstName} {user.lastName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/student/shop')}
            className="hidden sm:flex"
          >
            <ShoppingBag className="mr-1.5 h-4 w-4" /> Do'kon
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReportCard}
            disabled={downloadingPdf}
            className="hidden sm:flex"
          >
            {downloadingPdf
              ? <><GraduationCap className="mr-1.5 h-4 w-4 animate-spin" /> Yuklanmoqda...</>
              : <><Download className="mr-1.5 h-4 w-4" /> Hisobotim</>}
          </Button>
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {user?.firstName?.[0]?.toUpperCase()}
              {user?.lastName?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* Today's lessons */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bugungi darslar
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{todayLessonsCount}</div>
                <p className="text-xs text-muted-foreground mt-0.5">ta dars bugun</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* GPA */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              O'rtacha baho
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{gpa.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-0.5">GPA ball</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Davomat %
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
              <Calendar className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <>
                <Skeleton className="h-8 w-14 mb-1" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{attendancePct}%</div>
                <p className="text-xs text-muted-foreground mt-0.5">So'nggi 30 kun</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending homework */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Topshirilmagan uy vazifalari
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <ClipboardList className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <>
                <Skeleton className="h-8 w-10 mb-1" />
                <Skeleton className="h-3 w-22" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{unpaidHomework}</div>
                <p className="text-xs text-muted-foreground mt-0.5">ta topshirish kerak</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* EduCoin balance */}
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/student/shop')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              EduCoin balans
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
              <Coins className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <>
                <Skeleton className="h-8 w-14 mb-1" />
                <Skeleton className="h-3 w-20" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{coinsData?.coins ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Do'konga o'tish →</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gamification */}
      {!attendanceLoading && !gradesLoading && !homeworkLoading && attendanceData && (
        <GamificationSection
          records={attendanceData}
          gpa={gpa}
          attendancePct={attendancePct}
          pendingHomework={unpaidHomework}
          totalHomework={homeworkData?.length ?? 0}
        />
      )}

      {/* Subject Radar + Upcoming Exams row */}
      {!gradesLoading && gradesData && (gradesData.grades?.length ?? 0) >= 3 && (
        <div className="grid gap-4 md:grid-cols-2">
          <SubjectRadarChart grades={gradesData.grades ?? []} />
          <StudentUpcomingExams studentId={studentId} />
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Dars jadvali</span>
            <span className="sm:hidden">Jadval</span>
          </TabsTrigger>
          <TabsTrigger value="grades" className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Baholar</span>
            <span className="sm:hidden">Baholar</span>
          </TabsTrigger>
          <TabsTrigger value="homework" className="flex items-center gap-1.5">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Uy vazifalari</span>
            <span className="sm:hidden">Vazifalar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-primary" />
                Haftalik dars jadvali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScheduleTab studentId={studentId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                Baholar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GradesTab studentId={studentId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homework">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-5 w-5 text-primary" />
                Uy vazifalari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HomeworkTab studentId={studentId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Monthly attendance chart */}
      {!attendanceLoading && attendanceData && attendanceData.length > 0 && (() => {
        // Build last-6-months bar data
        const now = new Date();
        const MONTH_LABELS_UZ = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
        const months: { month: string; keldi: number; kelmadi: number; kechikdi: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          months.push({ month: MONTH_LABELS_UZ[d.getMonth()], keldi: 0, kelmadi: 0, kechikdi: 0 });
        }
        attendanceData.forEach((r) => {
          const d = new Date(r.date);
          const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
          if (diffMonths >= 0 && diffMonths <= 5) {
            const idx = 5 - diffMonths;
            if (r.status === 'present') months[idx].keldi++;
            else if (r.status === 'absent') months[idx].kelmadi++;
            else if (r.status === 'late') months[idx].kechikdi++;
          }
        });
        const totalDays = attendanceData.length;
        const presentDays = attendanceData.filter(r => r.status === 'present').length;
        const yearPct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Davomat grafigi (6 oy)
                </CardTitle>
                <span className={`text-sm font-bold ${yearPct >= 80 ? 'text-green-600' : yearPct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  Jami: {yearPct}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={months} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReTooltip
                    formatter={(value: number, name: string) => [value, name === 'keldi' ? 'Keldi' : name === 'kelmadi' ? 'Kelmadi' : 'Kechikdi']}
                  />
                  <Legend formatter={(v) => v === 'keldi' ? 'Keldi' : v === 'kelmadi' ? 'Kelmadi' : 'Kechikdi'} />
                  <Bar dataKey="keldi" fill="#22c55e" radius={[3,3,0,0]} />
                  <Bar dataKey="kelmadi" fill="#ef4444" radius={[3,3,0,0]} />
                  <Bar dataKey="kechikdi" fill="#f59e0b" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* Attendance summary */}
      {!attendanceLoading && attendanceData && attendanceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Davomat tarixi (so'nggi yozuvlar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendanceData
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((record) => {
                  const config = ATTENDANCE_CONFIG[record.status];
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between py-1.5 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <div>
                          <span className="text-sm font-medium">{formatDate(record.date)}</span>
                          {record.subject && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {record.subject.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.comment && (
                          <span className="text-xs text-muted-foreground">{record.comment}</span>
                        )}
                        <span className={`text-sm font-medium ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
            {attendanceData.length > 10 && (
              <div className="mt-3 text-center">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Barchasini ko'rish ({attendanceData.length} ta yozuv)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
