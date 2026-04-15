'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart2, ChevronLeft, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classesApi } from '@/lib/api/classes';
import { gradesApi } from '@/lib/api/grades';
import { useToast } from '@/components/ui/use-toast';

const QUARTERS = [
  { value: '1', label: '1-chorak (Sep–Nov)' },
  { value: '2', label: '2-chorak (Dec–Feb)' },
  { value: '3', label: '3-chorak (Mar–Apr)' },
  { value: '4', label: '4-chorak (May–Jun)' },
];

const QUARTER_MONTHS: Record<string, number[]> = {
  '1': [9, 10, 11],
  '2': [12, 1, 2],
  '3': [3, 4],
  '4': [5, 6],
};

function scoreColor(avg: number) {
  if (avg >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (avg >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (avg >= 50) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
}

export default function QuarterlyGradesPage() {
  const { toast } = useToast();
  const [classId, setClassId] = useState('');
  const [quarter, setQuarter] = useState('1');

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: gradesData, isLoading: gradesLoading } = useQuery({
    queryKey: ['grades', 'class', classId, 'quarterly'],
    queryFn: () => gradesApi.getClassReport(classId),
    enabled: !!classId,
    select: (res: any) => res?.data ?? (Array.isArray(res) ? res : []),
  });

  const classList: any[] = Array.isArray(classes) ? classes : [];
  const grades: any[] = Array.isArray(gradesData) ? gradesData : [];

  const months = QUARTER_MONTHS[quarter];

  // Filter by quarter months
  const filtered = useMemo(() => {
    return grades.filter(g => {
      const m = new Date(g.date).getMonth() + 1;
      return months.includes(m);
    });
  }, [grades, months]);

  // Build pivot: studentId → { name, subjects: { subjectId → { name, avg } }, overall }
  const pivot = useMemo(() => {
    const studentMap = new Map<string, { name: string; scores: Map<string, { name: string; total: number; count: number }> }>();

    filtered.forEach(g => {
      const sid = g.student?.id ?? g.studentId;
      const sname = `${g.student?.lastName ?? ''} ${g.student?.firstName ?? ''}`.trim();
      const subId = g.subject?.id ?? g.subjectId;
      const subName = g.subject?.name ?? 'Noma\'lum';
      const pct = g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0;

      if (!studentMap.has(sid)) studentMap.set(sid, { name: sname, scores: new Map() });
      const student = studentMap.get(sid)!;
      if (!student.scores.has(subId)) student.scores.set(subId, { name: subName, total: 0, count: 0 });
      const sub = student.scores.get(subId)!;
      sub.total += pct;
      sub.count += 1;
    });

    return Array.from(studentMap.entries()).map(([id, data]) => {
      const subjects = Array.from(data.scores.entries()).map(([subId, s]) => ({
        id: subId,
        name: s.name,
        avg: Math.round(s.total / s.count),
      }));
      const overall = subjects.length > 0
        ? Math.round(subjects.reduce((a, s) => a + s.avg, 0) / subjects.length)
        : 0;
      return { id, name: data.name, subjects, overall };
    }).sort((a, b) => b.overall - a.overall);
  }, [filtered]);

  // All unique subjects
  const allSubjects = useMemo(() => {
    const map = new Map<string, string>();
    pivot.forEach(p => p.subjects.forEach(s => map.set(s.id, s.name)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [pivot]);

  const classAvg = pivot.length > 0
    ? Math.round(pivot.reduce((a, s) => a + s.overall, 0) / pivot.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/grades"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Choraklik baho hisobi</h1>
            <p className="text-muted-foreground">Sinf bo'yicha chorak natijalari</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2"
          onClick={() => toast({ title: 'Excel eksport', description: 'Bu funksiya tez orada qo\'shiladi' })}>
          <Download className="h-4 w-4" /> Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sinf</Label>
              {classesLoading ? <Skeleton className="h-10" /> : (
                <Select value={classId} onValueChange={setClassId}>
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
              <Label>Chorak</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUARTERS.map(q => (
                    <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {classId && pivot.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10"><Users className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">O'quvchilar</p>
                <p className="text-2xl font-bold">{pivot.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10"><BarChart2 className="h-5 w-5 text-purple-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Fanlar soni</p>
                <p className="text-2xl font-bold">{allSubjects.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${classAvg >= 70 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <TrendingUp className={`h-5 w-5 ${classAvg >= 70 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sinf o'rtachasi</p>
                <p className="text-2xl font-bold">{classAvg}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      {!classId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BarChart2 className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Sinf tanlang</p>
        </CardContent></Card>
      ) : gradesLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : pivot.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BarChart2 className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>Bu chorak uchun baholar topilmadi</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{QUARTERS.find(q => q.value === quarter)?.label} — natijalar</CardTitle>
            <CardDescription>{pivot.length} o'quvchi, {allSubjects.length} ta fan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-3 text-left font-medium text-muted-foreground whitespace-nowrap">#</th>
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground whitespace-nowrap">O'quvchi</th>
                    {allSubjects.map(s => (
                      <th key={s.id} className="py-2 px-2 text-center font-medium text-muted-foreground whitespace-nowrap min-w-[80px]">
                        {s.name}
                      </th>
                    ))}
                    <th className="py-2 pl-3 text-center font-medium whitespace-nowrap">O'rtacha</th>
                  </tr>
                </thead>
                <tbody>
                  {pivot.map((row, idx) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2.5 pr-4 font-medium whitespace-nowrap">{row.name}</td>
                      {allSubjects.map(sub => {
                        const found = row.subjects.find((s: any) => s.id === sub.id);
                        return (
                          <td key={sub.id} className="py-2.5 px-2 text-center">
                            {found ? (
                              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(found.avg)}`}>
                                {found.avg}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 pl-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreColor(row.overall)}`}>
                          {row.overall}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td colSpan={2} className="py-2.5 pr-4 font-semibold text-sm">Sinf o'rtachasi</td>
                    {allSubjects.map(sub => {
                      const vals = pivot.map(r => r.subjects.find((s: any) => s.id === sub.id)?.avg ?? 0).filter(v => v > 0);
                      const avg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                      return (
                        <td key={sub.id} className="py-2.5 px-2 text-center">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${scoreColor(avg)}`}>{avg}%</span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-3 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreColor(classAvg)}`}>{classAvg}%</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
