'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, BookOpen, ClipboardCheck, BookMarked, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { usersApi } from '@/lib/api/users';
import { scheduleApi } from '@/lib/api/schedule';
import { homeworkApi } from '@/lib/api/homework';
import { attendanceApi } from '@/lib/api/attendance';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeacherWorkload {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  lessonsPerWeek: number;
  homeworkCount: number;
  classesCount: number;
  avgGpa?: number;
}

const ROLE_LABELS: Record<string, string> = {
  teacher: "O'qituvchi",
  class_teacher: 'Sinf rahbari',
};

// ── Workload badge ─────────────────────────────────────────────────────────────
function WorkloadBadge({ lessons }: { lessons: number }) {
  if (lessons >= 20) return <Badge variant="destructive">Yuqori ({lessons})</Badge>;
  if (lessons >= 12) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 hover:bg-yellow-100">O&apos;rta ({lessons})</Badge>;
  return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-900/20">Normal ({lessons})</Badge>;
}

export default function WorkloadPage() {
  // ── Fetch all teachers + schedule ──────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'all-teachers'],
    queryFn: () => usersApi.getAll({ limit: 200 }),
  });

  const { data: weekSchedule, isLoading: schedLoading } = useQuery({
    queryKey: ['schedule', 'week'],
    queryFn: () => scheduleApi.getWeek(),
  });

  const { data: homeworkList = [], isLoading: hwLoading } = useQuery({
    queryKey: ['homework'],
    queryFn: () => homeworkApi.getAll(),
  });

  const { data: attendanceReport } = useQuery({
    queryKey: ['attendance', 'report', 'workload'],
    queryFn: () => attendanceApi.getReport(),
  });

  const isLoading = usersLoading || schedLoading || hwLoading;

  // ── Compute workloads ──────────────────────────────────────────────────────
  const workloads: TeacherWorkload[] = useMemo(() => {
    const allUsers: any[] = usersData?.data ?? [];
    const teachers = allUsers.filter(u => ['teacher', 'class_teacher'].includes(u.role));

    const schedule: any[] = Array.isArray(weekSchedule) ? weekSchedule : [];
    const hwArray: any[] = Array.isArray(homeworkList) ? homeworkList : [];

    return teachers.map(t => {
      // Count lessons per week
      const lessonsPerWeek = schedule.filter(s => s.teacherId === t.id).length;

      // Count unique classes they teach
      const classIds = new Set(schedule.filter(s => s.teacherId === t.id).map(s => s.classId));

      // Count homework assigned by this teacher
      const hwCount = hwArray.filter((hw: any) => hw.teacherId === t.id || hw.teacher?.id === t.id).length;

      return {
        id: t.id,
        firstName: t.firstName,
        lastName: t.lastName,
        role: t.role,
        lessonsPerWeek,
        homeworkCount: hwCount,
        classesCount: classIds.size,
      };
    }).sort((a, b) => b.lessonsPerWeek - a.lessonsPerWeek);
  }, [usersData, weekSchedule, homeworkList]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const chartData = workloads
    .filter(t => t.lessonsPerWeek > 0)
    .slice(0, 12)
    .map(t => ({
      name: `${t.firstName[0]}. ${t.lastName}`,
      lessons: t.lessonsPerWeek,
      homework: t.homeworkCount,
    }));

  const totalTeachers = workloads.length;
  const totalLessons = workloads.reduce((s, t) => s + t.lessonsPerWeek, 0);
  const overloadedCount = workloads.filter(t => t.lessonsPerWeek >= 20).length;
  const avgLessons = totalTeachers > 0 ? Math.round(totalLessons / totalTeachers) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" /> O&apos;qituvchi ish yuklamasi
        </h1>
        <p className="text-muted-foreground">Haftalik darslar, berilgan vazifalar va sinf sayisi bo&apos;yicha tahlil</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10"><Users className="h-5 w-5 text-violet-500" /></div>
                <div><p className="text-xs text-muted-foreground">Jami o&apos;qituvchilar</p><p className="text-2xl font-bold">{totalTeachers}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10"><BookOpen className="h-5 w-5 text-blue-500" /></div>
                <div><p className="text-xs text-muted-foreground">Haftalik darslar</p><p className="text-2xl font-bold">{totalLessons}</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-500" /></div>
                <div><p className="text-xs text-muted-foreground">O&apos;rtacha darslar</p><p className="text-2xl font-bold">{avgLessons}/hafta</p></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10"><ClipboardCheck className="h-5 w-5 text-red-500" /></div>
                <div><p className="text-xs text-muted-foreground">Haddan oshgan yuklamalar</p><p className="text-2xl font-bold">{overloadedCount}</p></div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Chart */}
      {!isLoading && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Haftalik darslar (o&apos;qituvchi bo&apos;yicha)</CardTitle>
            <CardDescription>Eng ko&apos;p dars olib borayotgan 12 ta o&apos;qituvchi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => [v, name === 'lessons' ? 'Darslar' : 'Vazifalar']} />
                <Bar dataKey="lessons" radius={[4, 4, 0, 0]} name="lessons">
                  {chartData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.lessons >= 20 ? '#ef4444' : d.lessons >= 12 ? '#f59e0b' : '#22c55e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Batafsil jadval</CardTitle>
          <CardDescription>Har bir o&apos;qituvchining haftalik ish yuklamasi</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : workloads.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">O&apos;qituvchilar topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 pr-3 font-medium text-muted-foreground">O&apos;qituvchi</th>
                    <th className="text-left py-2.5 font-medium text-muted-foreground">Lavozim</th>
                    <th className="text-center py-2.5 font-medium text-muted-foreground">
                      <span className="flex items-center justify-center gap-1"><BookOpen className="h-3.5 w-3.5" />Darslar/hafta</span>
                    </th>
                    <th className="text-center py-2.5 font-medium text-muted-foreground">
                      <span className="flex items-center justify-center gap-1"><BookMarked className="h-3.5 w-3.5" />Vazifalar</span>
                    </th>
                    <th className="text-center py-2.5 font-medium text-muted-foreground">Sinflar</th>
                    <th className="text-right py-2.5 font-medium text-muted-foreground">Yuklamasi</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map(t => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {t.firstName[0]}{t.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{t.firstName} {t.lastName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">
                        {ROLE_LABELS[t.role] ?? t.role}
                      </td>
                      <td className="py-2.5 text-center font-semibold">
                        <span className={t.lessonsPerWeek >= 20 ? 'text-red-500' : t.lessonsPerWeek >= 12 ? 'text-yellow-600' : 'text-green-600'}>
                          {t.lessonsPerWeek}
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-muted-foreground">{t.homeworkCount}</td>
                      <td className="py-2.5 text-center text-muted-foreground">{t.classesCount}</td>
                      <td className="py-2.5 text-right">
                        <WorkloadBadge lessons={t.lessonsPerWeek} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-400 shrink-0" />Normal (0–11 dars/hafta)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-yellow-400 shrink-0" />O&apos;rta (12–19 dars/hafta)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400 shrink-0" />Yuqori (20+ dars/hafta)</span>
      </div>
    </div>
  );
}
