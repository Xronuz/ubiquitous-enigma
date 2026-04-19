'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  GraduationCap,
  ChevronRight,
  MessageSquare,
  CalendarOff,
  ExternalLink,
  Send,
  Loader2,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parentApi } from '@/lib/api/parent';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@eduplatform/types';
import { formatDate, formatCurrency, getInitials, getAttendanceLabel, getGradeTypeLabel } from '@/lib/utils';

// ─── Config maps ────────────────────────────────────────────────────────────

const attendanceStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  present:  { label: 'Keldi',    color: 'border-green-500 text-green-600',  icon: CheckCircle2 },
  absent:   { label: 'Kelmadi', color: 'border-red-500 text-red-600',     icon: XCircle },
  late:     { label: 'Kechikdi',color: 'border-yellow-500 text-yellow-600',icon: Clock },
  excused:  { label: 'Uzrli',   color: 'border-blue-500 text-blue-600',   icon: AlertCircle },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  paid:     { label: "To'landi",          color: 'border-green-500 text-green-600' },
  pending:  { label: 'Kutilmoqda',        color: 'border-yellow-500 text-yellow-600' },
  overdue:  { label: "Muddati o'tgan",    color: 'border-red-500 text-red-600' },
  failed:   { label: 'Muvaffaqiyatsiz',   color: 'border-red-400 text-red-500' },
  refunded: { label: 'Qaytarildi',        color: 'border-border text-muted-foreground' },
};

const DAY_LABELS: Record<string, string> = {
  monday:    'Dushanba',
  tuesday:   'Seshanba',
  wednesday: 'Chorshanba',
  thursday:  'Payshanba',
  friday:    'Juma',
  saturday:  'Shanba',
  sunday:    'Yakshanba',
};

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// ─── Skeleton helpers ────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-3 w-16 mt-1" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
      <Icon className="mb-3 h-10 w-10 opacity-30" />
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm opacity-70">{description}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ParentPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Role guard
  if (user && user.role !== UserRole.PARENT) {
    router.replace('/dashboard');
    return null;
  }

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('attendance');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Leave request form state
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [leaveErrors, setLeaveErrors] = useState<Record<string, string>>({});

  // ── Fetch children ──────────────────────────────────────────────────────
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['parent', 'children'],
    queryFn: parentApi.getChildren,
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  // Set first child as default once loaded
  const childId = selectedChildId || (children[0]?.id ?? '');
  const selectedChild = children.find((c: any) => c.id === childId);

  // ── Child data queries (enabled only when a child is selected) ──────────
  const { data: attendanceData, isLoading: attendanceLoading, isError: attendanceError } = useQuery({
    queryKey: ['parent', 'attendance', childId],
    queryFn: () => parentApi.getChildAttendance(childId),
    enabled: !!childId && activeTab === 'attendance',
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  const { data: gradesData, isLoading: gradesLoading, isError: gradesError } = useQuery({
    queryKey: ['parent', 'grades', childId],
    queryFn: () => parentApi.getChildGrades(childId),
    enabled: !!childId && activeTab === 'grades',
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  const { data: paymentsData, isLoading: paymentsLoading, isError: paymentsError } = useQuery({
    queryKey: ['parent', 'payments', childId],
    queryFn: () => parentApi.getChildPayments(childId),
    enabled: !!childId && activeTab === 'payments',
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  const { data: scheduleData, isLoading: scheduleLoading, isError: scheduleError } = useQuery({
    queryKey: ['parent', 'schedule', childId],
    queryFn: () => parentApi.getChildSchedule(childId),
    enabled: !!childId && activeTab === 'schedule',
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  const { data: leaveRequestsData, isLoading: leaveRequestsLoading, isError: leaveRequestsError } = useQuery({
    queryKey: ['parent', 'leave-requests', childId],
    queryFn: () => parentApi.getChildLeaveRequests(childId),
    enabled: !!childId && activeTab === 'leave',
    select: (data: any) => (Array.isArray(data) ? data : data?.data ?? []),
  });

  const submitLeaveMutation = useMutation({
    mutationFn: () => parentApi.requestChildLeave(childId, {
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason,
    }),
    onSuccess: () => {
      toast({ title: "✅ Ta'til so'rovi yuborildi" });
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      setLeaveErrors({});
      queryClient.invalidateQueries({ queryKey: ['parent', 'leave-requests', childId] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const handleLeaveSubmit = () => {
    const errs: Record<string, string> = {};
    if (!leaveForm.startDate) errs.startDate = 'Boshlanish sanasini kiriting';
    if (!leaveForm.endDate) errs.endDate = 'Tugash sanasini kiriting';
    if (!leaveForm.reason || leaveForm.reason.length < 5) errs.reason = 'Sabab kamida 5 ta belgi bo\'lishi kerak';
    if (leaveForm.startDate && leaveForm.endDate && leaveForm.endDate < leaveForm.startDate) {
      errs.endDate = 'Tugash sanasi boshlanishdan oldin bo\'lishi mumkin emas';
    }
    if (Object.keys(errs).length > 0) { setLeaveErrors(errs); return; }
    setLeaveErrors({});
    submitLeaveMutation.mutate();
  };

  // ── Derived stats (memoized) ─────────────────────────────────────────────────

  const attendanceList: any[] = attendanceData ?? [];
  const gradesList: any[] = gradesData ?? [];
  const paymentsList: any[] = paymentsData ?? [];
  const scheduleList: any[] = scheduleData ?? [];

  // Attendance % — H-9: useMemo
  const attendancePct = useMemo(() => {
    if (!attendanceList.length) return null;
    return Math.round(
      (attendanceList.filter((a: any) => a.status === 'present').length / attendanceList.length) * 100
    );
  }, [attendanceList]);

  // Average grade — H-9: useMemo
  const avgGrade = useMemo(() => {
    if (!gradesList.length) return null;
    return (gradesList.reduce((sum: number, g: any) => sum + (g.score ?? 0), 0) / gradesList.length).toFixed(1);
  }, [gradesList]);

  // Last payment — H-9: useMemo
  const lastPayment: any = useMemo(() => {
    if (!paymentsList.length) return null;
    return [...paymentsList].sort(
      (a: any, b: any) =>
        new Date(b.createdAt ?? b.date ?? 0).getTime() - new Date(a.createdAt ?? a.date ?? 0).getTime()
    )[0];
  }, [paymentsList]);

  // Today's lessons — H-9: useMemo
  const todayLessons = useMemo(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    return scheduleList.filter((s: any) => (s.dayOfWeek ?? s.day ?? '').toLowerCase() === today);
  }, [scheduleList]);

  // Group grades by subject — H-9: useMemo
  const gradesBySubject = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const g of gradesList) {
      const subj = g.subject?.name ?? g.subjectName ?? "Noma'lum fan";
      if (!map[subj]) map[subj] = [];
      map[subj].push(g);
    }
    return map;
  }, [gradesList]);

  // Group schedule by day — H-9: useMemo
  const scheduleByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const lesson of scheduleList) {
      const day = (lesson.dayOfWeek ?? lesson.day ?? '').toLowerCase();
      if (!map[day]) map[day] = [];
      map[day].push(lesson);
    }
    return map;
  }, [scheduleList]);

  // ── Loading / no user ────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold">Ota-ona portali</h1>
        <p className="text-muted-foreground">Farzandingiz haqida to'liq ma'lumot</p>
      </div>

      {/* ── Children selector ── */}
      {childrenLoading ? (
        <Skeleton className="h-10 w-72" />
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Users}
              title="Farzandlar topilmadi"
              description="Tizimda farzandingiz hali qo'shilmagan"
            />
          </CardContent>
        </Card>
      ) : children.length === 1 ? (
        // Single child – show inline info card
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(selectedChild?.firstName ?? selectedChild?.student?.firstName ?? 'F', selectedChild?.lastName ?? selectedChild?.student?.lastName ?? 'F')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">
                {selectedChild?.firstName ?? selectedChild?.student?.firstName}{' '}
                {selectedChild?.lastName ?? selectedChild?.student?.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedChild?.class?.name ?? selectedChild?.className ?? selectedChild?.student?.class?.name ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Multiple children – show selector + info
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Farzand:</span>
            </div>
            <Select value={childId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Farzandni tanlang..." />
              </SelectTrigger>
              <SelectContent>
                {children.map((child: any) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.firstName ?? child.student?.firstName}{' '}
                    {child.lastName ?? child.student?.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedChild && (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(
                      selectedChild?.firstName ?? selectedChild?.student?.firstName ?? 'F',
                      selectedChild?.lastName ?? selectedChild?.student?.lastName ?? 'F'
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {selectedChild?.firstName ?? selectedChild?.student?.firstName}{' '}
                    {selectedChild?.lastName ?? selectedChild?.student?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedChild?.class?.name ?? selectedChild?.className ?? selectedChild?.student?.class?.name ?? '—'}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Quick actions ── */}
      {childId && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/messages')}>
            <MessageSquare className="mr-2 h-4 w-4 text-blue-500" />
            Muallimga xabar
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/leave-requests')}>
            <CalendarOff className="mr-2 h-4 w-4 text-orange-500" />
            Ta'til so'rovi
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab('payments')}>
            <CreditCard className="mr-2 h-4 w-4 text-green-500" />
            To'lovlar
          </Button>
        </div>
      )}

      {/* Only render stats + tabs when a child is selected */}
      {childId && (
        <>
          {/* ── 4 Stat Cards ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Davomat */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Davomat</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {attendanceLoading && activeTab !== 'attendance' ? (
                  <Skeleton className="h-7 w-16" />
                ) : attendancePct !== null ? (
                  <>
                    <div className={`text-2xl font-bold ${attendancePct >= 80 ? 'text-green-600' : attendancePct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {attendancePct}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{attendanceList.length} ta dars</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p>
                )}
              </CardContent>
            </Card>

            {/* O'rtacha baho */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">O'rtacha baho</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                {gradesLoading && activeTab !== 'grades' ? (
                  <Skeleton className="h-7 w-16" />
                ) : avgGrade !== null ? (
                  <>
                    <div className={`text-2xl font-bold ${Number(avgGrade) >= 80 ? 'text-green-600' : Number(avgGrade) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {avgGrade}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{gradesList.length} ta baho</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Ma'lumot yo'q</p>
                )}
              </CardContent>
            </Card>

            {/* So'nggi to'lov */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">So'nggi to'lov</CardTitle>
                <CreditCard className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                {paymentsLoading && activeTab !== 'payments' ? (
                  <Skeleton className="h-7 w-28" />
                ) : lastPayment ? (
                  <>
                    <div className="text-lg font-bold">
                      {formatCurrency(lastPayment.amount ?? 0, lastPayment.currency)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {(() => {
                        const cfg = paymentStatusConfig[lastPayment.status] ?? { label: lastPayment.status, color: 'border-border text-muted-foreground' };
                        return (
                          <Badge variant="outline" className={`text-xs px-1.5 py-0 ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">To'lov yo'q</p>
                )}
              </CardContent>
            </Card>

            {/* Bugungi darslar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Bugungi darslar</CardTitle>
                <BookOpen className="h-4 w-4 text-teal-500" />
              </CardHeader>
              <CardContent>
                {scheduleLoading && activeTab !== 'schedule' ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-teal-600">{todayLessons.length}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">ta dars bugun</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Tabs ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="attendance">
                <Calendar className="mr-1.5 h-4 w-4" />
                Davomat
              </TabsTrigger>
              <TabsTrigger value="grades">
                <GraduationCap className="mr-1.5 h-4 w-4" />
                Baholar
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="mr-1.5 h-4 w-4" />
                To'lovlar
              </TabsTrigger>
              <TabsTrigger value="schedule">
                <BookOpen className="mr-1.5 h-4 w-4" />
                Dars jadvali
              </TabsTrigger>
              <TabsTrigger value="leave">
                <CalendarOff className="mr-1.5 h-4 w-4" />
                Ta&apos;til so&apos;rovi
              </TabsTrigger>
            </TabsList>

            {/* ── Davomat ── */}
            <TabsContent value="attendance" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">So'nggi 30 ta dars davomati</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {attendanceLoading ? (
                    <ListSkeleton rows={6} />
                  ) : attendanceError ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="Davomat yuklanmadi"
                      description="Server bilan bog'lanishda xato yuz berdi"
                    />
                  ) : attendanceList.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="Davomat ma'lumoti yo'q"
                      description="Farzandingiz uchun davomat hali kiritilmagan"
                    />
                  ) : (
                    <div className="divide-y">
                      {attendanceList.slice(0, 30).map((record: any, idx: number) => {
                        const cfg = attendanceStatusConfig[record.status] ?? {
                          label: record.status,
                          color: 'border-border text-muted-foreground',
                          icon: AlertCircle,
                        };
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={record.id ?? idx}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`h-4 w-4 ${cfg.color.split(' ')[1]}`} />
                              <div>
                                <p className="text-sm font-medium">
                                  {record.subject?.name ?? record.subjectName ?? record.lessonName ?? 'Dars'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {record.date ? formatDate(record.date) : '—'}
                                  {record.period && <span className="ml-1.5">{record.period}-dars</span>}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`${cfg.color} text-xs`}>
                              {cfg.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Baholar ── */}
            <TabsContent value="grades" className="mt-4 space-y-4">
              {/* Subject filter */}
              {!gradesLoading && gradesList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">Fan bo&apos;yicha:</span>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger className="h-8 w-52 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Barcha fanlar</SelectItem>
                      {Object.keys(gradesBySubject).map(name => (
                        <SelectItem key={name} value={name}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subjectFilter !== 'all' && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSubjectFilter('all')}>
                      × Tozalash
                    </Button>
                  )}
                </div>
              )}

              {gradesLoading ? (
                <ListSkeleton rows={5} />
              ) : gradesError ? (
                <Card>
                  <CardContent className="py-2">
                    <EmptyState
                      icon={AlertCircle}
                      title="Baholar yuklanmadi"
                      description="Server bilan bog'lanishda xato yuz berdi"
                    />
                  </CardContent>
                </Card>
              ) : gradesList.length === 0 ? (
                <Card>
                  <CardContent className="py-2">
                    <EmptyState
                      icon={GraduationCap}
                      title="Baholar yo'q"
                      description="Farzandingiz uchun baholar hali kiritilmagan"
                    />
                  </CardContent>
                </Card>
              ) : (
                Object.entries(gradesBySubject)
                  .filter(([name]) => subjectFilter === 'all' || name === subjectFilter)
                  .map(([subjectName, subjectGrades]) => {
                  const subjectAvg = (
                    subjectGrades.reduce((s: number, g: any) => s + (g.score ?? 0), 0) / subjectGrades.length
                  ).toFixed(1);
                  const avgNum = Number(subjectAvg);
                  const avgColor = avgNum >= 80 ? 'text-green-600' : avgNum >= 60 ? 'text-yellow-600' : 'text-red-600';

                  return (
                    <Card key={subjectName}>
                      <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">{subjectName}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">O'rtacha:</span>
                          <span className={`font-bold text-lg ${avgColor}`}>{subjectAvg}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {subjectGrades.map((grade: any, idx: number) => {
                            const pct = grade.maxScore ? (grade.score / grade.maxScore) * 100 : grade.score;
                            const scoreColor = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600';
                            return (
                              <div
                                key={grade.id ?? idx}
                                className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {getGradeTypeLabel(grade.type ?? grade.gradeType ?? '')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {grade.date ? formatDate(grade.date) : grade.createdAt ? formatDate(grade.createdAt) : '—'}
                                    {grade.comment && <span className="ml-1.5 italic">{grade.comment}</span>}
                                  </p>
                                </div>
                                <div className={`text-lg font-bold ${scoreColor}`}>
                                  {grade.score}
                                  {grade.maxScore && (
                                    <span className="text-xs text-muted-foreground font-normal">/{grade.maxScore}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* ── To'lovlar ── */}
            <TabsContent value="payments" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">To'lovlar tarixi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {paymentsLoading ? (
                    <ListSkeleton rows={5} />
                  ) : paymentsError ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="To'lovlar yuklanmadi"
                      description="Server bilan bog'lanishda xato yuz berdi"
                    />
                  ) : paymentsList.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="To'lovlar yo'q"
                      description="Farzandingiz uchun to'lov ma'lumotlari topilmadi"
                    />
                  ) : (
                    <div className="divide-y">
                      {paymentsList.map((payment: any, idx: number) => {
                        const cfg = paymentStatusConfig[payment.status] ?? {
                          label: payment.status,
                          color: 'border-border text-muted-foreground',
                        };
                        const isOverdue =
                          payment.dueDate &&
                          payment.status !== 'paid' &&
                          new Date(payment.dueDate) < new Date();

                        return (
                          <div
                            key={payment.id ?? idx}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {payment.description ?? "O'quv to'lovi"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {payment.createdAt ? formatDate(payment.createdAt) : payment.date ? formatDate(payment.date) : '—'}
                                {payment.dueDate && (
                                  <span className={`ml-2 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                                    · Muddat: {formatDate(payment.dueDate)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              <span className="font-semibold text-sm">
                                {formatCurrency(payment.amount ?? 0, payment.currency)}
                              </span>
                              <Badge variant="outline" className={`${cfg.color} text-xs`}>
                                {cfg.label}
                              </Badge>
                              {(payment.status === 'pending' || isOverdue) && (
                                <Button size="sm" variant="default" className="h-7 text-xs px-2"
                                  onClick={() => router.push(`/dashboard/payments?payFor=${payment.id}`)}>
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  To'lash
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Dars jadvali ── */}
            <TabsContent value="schedule" className="mt-4 space-y-4">
              {scheduleLoading ? (
                <ListSkeleton rows={6} />
              ) : scheduleError ? (
                <Card>
                  <CardContent className="py-2">
                    <EmptyState
                      icon={AlertCircle}
                      title="Dars jadvali yuklanmadi"
                      description="Server bilan bog'lanishda xato yuz berdi"
                    />
                  </CardContent>
                </Card>
              ) : scheduleList.length === 0 ? (
                <Card>
                  <CardContent className="py-2">
                    <EmptyState
                      icon={BookOpen}
                      title="Dars jadvali yo'q"
                      description="Farzandingiz uchun dars jadvali tuzilmagan"
                    />
                  </CardContent>
                </Card>
              ) : (
                DAY_ORDER.filter((day) => scheduleByDay[day]?.length > 0).map((day) => {
                  const lessons = [...(scheduleByDay[day] ?? [])].sort(
                    (a: any, b: any) => (a.period ?? a.startTime ?? 0) - (b.period ?? b.startTime ?? 0)
                  );
                  return (
                    <Card key={day}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {DAY_LABELS[day] ?? day}
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {lessons.length} ta dars
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {lessons.map((lesson: any, idx: number) => (
                            <div
                              key={lesson.id ?? idx}
                              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                            >
                              {/* Period number or time */}
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                                {lesson.period ?? idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                  {lesson.subject?.name ?? lesson.subjectName ?? lesson.lessonName ?? 'Fan'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {lesson.teacher
                                    ? `${lesson.teacher.firstName ?? ''} ${lesson.teacher.lastName ?? ''}`.trim()
                                    : lesson.teacherName ?? ''}
                                  {(lesson.startTime || lesson.endTime) && (
                                    <span className="ml-1.5">
                                      · {lesson.startTime}{lesson.endTime ? ` – ${lesson.endTime}` : ''}
                                    </span>
                                  )}
                                  {lesson.room && <span className="ml-1.5">· {lesson.room}-xona</span>}
                                </p>
                              </div>
                              {lesson.teacher?.id && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-blue-500"
                                  onClick={() => router.push(`/dashboard/messages?userId=${lesson.teacher.id}`)}
                                  title="Muallimga xabar yuborish">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
            {/* ── Ta'til so'rovi ── */}
            <TabsContent value="leave" className="mt-4 space-y-4">
              {/* Submit form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Yangi ta&apos;til so&apos;rovi</CardTitle>
                  <CardDescription>
                    Farzandingiz nomidan ta&apos;til so&apos;rovi yuboring — maktab ma&apos;muriyati ko&apos;rib chiqadi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="leave-start">Boshlanish sanasi</Label>
                      <Input
                        id="leave-start"
                        type="date"
                        value={leaveForm.startDate}
                        onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}
                        min={new Date().toISOString().slice(0, 10)}
                      />
                      {leaveErrors.startDate && (
                        <p className="text-xs text-destructive">{leaveErrors.startDate}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="leave-end">Tugash sanasi</Label>
                      <Input
                        id="leave-end"
                        type="date"
                        value={leaveForm.endDate}
                        onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}
                        min={leaveForm.startDate || new Date().toISOString().slice(0, 10)}
                      />
                      {leaveErrors.endDate && (
                        <p className="text-xs text-destructive">{leaveErrors.endDate}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="leave-reason">Sabab</Label>
                    <Textarea
                      id="leave-reason"
                      placeholder="Ta'til sababini batafsil yozing (kamida 5 ta belgi)..."
                      value={leaveForm.reason}
                      onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right">{leaveForm.reason.length}/500</p>
                    {leaveErrors.reason && (
                      <p className="text-xs text-destructive">{leaveErrors.reason}</p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleLeaveSubmit} disabled={submitLeaveMutation.isPending || !childId}>
                      {submitLeaveMutation.isPending
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yuborilmoqda...</>
                        : <><Send className="mr-2 h-4 w-4" /> So&apos;rov yuborish</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">So&apos;rovlar tarixi</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {leaveRequestsLoading ? (
                    <ListSkeleton rows={3} />
                  ) : leaveRequestsError ? (
                    <EmptyState
                      icon={AlertCircle}
                      title="So'rovlar yuklanmadi"
                      description="Server bilan bog'lanishda xato yuz berdi"
                    />
                  ) : !leaveRequestsData || (leaveRequestsData as any[]).length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="So'rovlar yo'q"
                      description="Hali birorta ta'til so'rovi yuborilmagan"
                    />
                  ) : (
                    <div className="divide-y">
                      {(leaveRequestsData as any[]).map((req: any) => {
                        // Determine overall status from approvals
                        const approvals: any[] = req.approvals ?? [];
                        const approved = approvals.every((a: any) => a.status === 'approved');
                        const rejected = approvals.some((a: any) => a.status === 'rejected');
                        const pending = approvals.some((a: any) => a.status === 'pending');
                        const statusLabel = approved ? 'Tasdiqlandi' : rejected ? 'Rad etildi' : pending ? 'Kutilmoqda' : 'Yuborildi';
                        const statusColor = approved
                          ? 'border-green-500 text-green-600'
                          : rejected
                          ? 'border-red-500 text-red-600'
                          : 'border-yellow-500 text-yellow-600';

                        return (
                          <div key={req.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {new Date(req.startDate).toLocaleDateString('uz-UZ')} —{' '}
                                  {new Date(req.endDate).toLocaleDateString('uz-UZ')}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {req.reason}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(req.createdAt).toLocaleString('uz-UZ')}
                                </p>
                              </div>
                              <Badge variant="outline" className={`text-xs shrink-0 ${statusColor}`}>
                                {statusLabel}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
