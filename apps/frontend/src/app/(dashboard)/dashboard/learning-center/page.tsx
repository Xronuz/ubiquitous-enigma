'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/store/confirm.store';
import {
  MonitorPlay, Plus, Search, BookOpen, Users, TrendingUp,
  Pencil, Trash2, Loader2, UserPlus, X, Star,
  Calendar, Clock, Banknote, CheckCircle2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  learningCenterApi, Course, CourseEnrollment, CreateCourseDto,
} from '@/lib/api/learning-center';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_COURSE: CreateCourseDto = {
  name: '',
  description: '',
  teacherId: '',
  duration: undefined,
  price: undefined,
  maxStudents: 30,
  isActive: true,
  startDate: '',
  endDate: '',
};

const STATUS_CONFIG = {
  active:    { label: 'Faol',     color: 'text-green-600 border-green-400' },
  completed: { label: 'Tugatdi',  color: 'text-blue-600 border-blue-400' },
  dropped:   { label: 'Chiqdi',   color: 'text-red-600 border-red-400' },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(n) + ' so\'m';
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LearningCenterPage() {
  const ask = useConfirm();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canManage = ['director', 'vice_principal'].includes(user?.role ?? '');
  const isTeacher = ['teacher', 'class_teacher'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student';

  // ── State ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [courseOpen, setCourseOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState<CreateCourseDto>(EMPTY_COURSE);
  const [courseErrors, setCourseErrors] = useState<Record<string, string>>({});

  const [detailCourseId, setDetailCourseId] = useState<string | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState<string | null>(null);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: stats } = useQuery({
    queryKey: ['learning-center', 'stats'],
    queryFn: learningCenterApi.getStats,
    enabled: canManage || isTeacher,
  });

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['learning-center', 'courses', search],
    queryFn: () => learningCenterApi.getCourses(search || undefined),
  });

  const { data: detailCourse, isLoading: detailLoading } = useQuery({
    queryKey: ['learning-center', 'course', detailCourseId],
    queryFn: () => learningCenterApi.getCourseById(detailCourseId!),
    enabled: !!detailCourseId,
  });

  const { data: myCourses = [], isLoading: myCoursesLoading } = useQuery({
    queryKey: ['learning-center', 'my-courses'],
    queryFn: learningCenterApi.getMyCourses,
    enabled: isStudent,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 300 }),
    enabled: courseOpen || enrollOpen,
  });
  const teachers = (usersData?.data ?? []).filter((u: any) =>
    ['teacher', 'class_teacher'].includes(u.role)
  );
  const students = (usersData?.data ?? []).filter((u: any) => u.role === 'student');

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: learningCenterApi.createCourse,
    onSuccess: () => {
      toast({ title: '✅ Kurs qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['learning-center'] });
      setCourseOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCourseDto> }) =>
      learningCenterApi.updateCourse(id, data),
    onSuccess: () => {
      toast({ title: '✅ Kurs yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['learning-center'] });
      setCourseOpen(false);
      setEditCourse(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: learningCenterApi.deleteCourse,
    onSuccess: () => {
      toast({ title: 'Kurs o\'chirildi' });
      queryClient.invalidateQueries({ queryKey: ['learning-center'] });
      if (detailCourseId) setDetailCourseId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: string; studentId: string }) =>
      learningCenterApi.enrollStudent(courseId, { studentId }),
    onSuccess: () => {
      toast({ title: '✅ O\'quvchi qo\'shildi' });
      queryClient.invalidateQueries({ queryKey: ['learning-center'] });
      setEnrollOpen(false);
      setEnrollStudentId('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const removeEnrollMutation = useMutation({
    mutationFn: ({ courseId, enrollmentId }: { courseId: string; enrollmentId: string }) =>
      learningCenterApi.removeEnrollment(courseId, enrollmentId),
    onSuccess: () => {
      toast({ title: 'O\'quvchi kursdan chiqarildi' });
      queryClient.invalidateQueries({ queryKey: ['learning-center'] });
    },
  });

  const updateEnrollMutation = useMutation({
    mutationFn: ({ courseId, enrollmentId, status }: { courseId: string; enrollmentId: string; status: string }) =>
      learningCenterApi.updateEnrollment(courseId, enrollmentId, { status: status as any }),
    onSuccess: () => {
      toast({ title: '✅ Holat yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['learning-center'] });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditCourse(null);
    setCourseForm(EMPTY_COURSE);
    setCourseErrors({});
    setCourseOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditCourse(course);
    setCourseForm({
      name: course.name,
      description: course.description ?? '',
      teacherId: course.teacherId ?? '',
      duration: course.duration,
      price: course.price,
      maxStudents: course.maxStudents,
      isActive: course.isActive,
      startDate: course.startDate ? course.startDate.split('T')[0] : '',
      endDate: course.endDate ? course.endDate.split('T')[0] : '',
    });
    setCourseErrors({});
    setCourseOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!courseForm.name.trim()) e.name = 'Kurs nomi kiriting';
    setCourseErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload: CreateCourseDto = {
      ...courseForm,
      teacherId: courseForm.teacherId || undefined,
      startDate: courseForm.startDate || undefined,
      endDate: courseForm.endDate || undefined,
    };
    if (editCourse) {
      updateMutation.mutate({ id: editCourse.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Student view ─────────────────────────────────────────────────────────────
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MonitorPlay className="h-6 w-6 text-violet-500" /> O&apos;quv markazi
          </h1>
          <p className="text-muted-foreground">Mening kurslarim</p>
        </div>

        {myCoursesLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : (myCourses as CourseEnrollment[]).length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MonitorPlay className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">Siz hali hech qanday kursga yozilmagansiz</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(myCourses as CourseEnrollment[]).map((en) => {
              const cfg = STATUS_CONFIG[en.status] ?? STATUS_CONFIG.active;
              const course = en.course;
              return (
                <Card key={en.id} className="hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">
                        {course?.name ?? 'Kurs'}
                      </CardTitle>
                      <Badge variant="outline" className={`shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    {course?.description && (
                      <CardDescription className="text-xs line-clamp-2">{course.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {course?.teacher && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Users className="h-3.5 w-3.5" />
                        {course.teacher.firstName} {course.teacher.lastName}
                      </div>
                    )}
                    {(course?.startDate || course?.endDate) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {course.startDate ? course.startDate.split('T')[0] : '—'}
                        {' → '}
                        {course.endDate ? course.endDate.split('T')[0] : '—'}
                      </div>
                    )}
                    {course?.price !== undefined && course.price !== null && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Banknote className="h-3 w-3 text-green-600" />
                        {formatCurrency(course.price)}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                      <span className="text-xs text-muted-foreground">
                        Yozildi: {en.enrolledAt.split('T')[0]}
                      </span>
                      {en.grade !== undefined && en.grade !== null && (
                        <span className="text-sm font-semibold flex items-center gap-1 text-yellow-600">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> {en.grade}
                        </span>
                      )}
                    </div>
                    {en.notes && (
                      <p className="text-xs text-muted-foreground italic">{en.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MonitorPlay className="h-6 w-6 text-violet-500" /> O&apos;quv markazi
          </h1>
          <p className="text-muted-foreground">Kurslar, yo&apos;nalishlar va guruhlar boshqaruvi</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Kurs qo&apos;shish
          </Button>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Jami kurslar', value: stats.totalCourses, icon: BookOpen, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { label: 'Faol kurslar', value: stats.activeCourses, icon: MonitorPlay, color: 'text-green-500', bg: 'bg-green-500/10' },
            { label: 'Faol o\'quvchilar', value: stats.activeStudents, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Yakunlash darajasi', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${bg}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kurs nomi bo'yicha qidirish..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Courses grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (courses as Course[]).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MonitorPlay className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground">{search ? 'Kurs topilmadi' : 'Hozircha kurs mavjud emas'}</p>
            {canManage && !search && (
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Birinchi kursni qo&apos;shish
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(courses as Course[]).map(course => (
            <Card
              key={course.id}
              className={`cursor-pointer hover:shadow-md transition-all ${!course.isActive ? 'opacity-60' : ''}`}
              onClick={() => setDetailCourseId(course.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{course.name}</CardTitle>
                  <Badge variant={course.isActive ? 'success' : 'secondary'} className="shrink-0">
                    {course.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>
                {course.description && (
                  <CardDescription className="text-xs line-clamp-2">{course.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {course.teacher && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Users className="h-3.5 w-3.5" />
                    {course.teacher.firstName} {course.teacher.lastName}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {course.duration && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course.duration} hafta</span>
                  )}
                  {course.price !== undefined && course.price !== null && (
                    <span className="flex items-center gap-1"><Banknote className="h-3 w-3 text-green-600" /> {formatCurrency(course.price)}</span>
                  )}
                </div>
                {(course.startDate || course.endDate) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {course.startDate ? course.startDate.split('T')[0] : '—'}
                    {' → '}
                    {course.endDate ? course.endDate.split('T')[0] : '—'}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {course.enrolledCount ?? 0}/{course.maxStudents} o&apos;quvchi
                  </span>
                  {canManage && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={() => openEdit(course)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          if (await ask({ title: `"${course.name}" kursini o'chirasizmi?`, variant: 'destructive', confirmText: "O'chirish" })) deleteMutation.mutate(course.id);
                        }}
                        disabled={deleteMutation.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Course detail dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!detailCourseId} onOpenChange={v => { if (!v) setDetailCourseId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : detailCourse ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <MonitorPlay className="h-5 w-5 text-violet-500" />
                  <DialogTitle>{detailCourse.name}</DialogTitle>
                  <Badge variant={detailCourse.isActive ? 'success' : 'secondary'}>
                    {detailCourse.isActive ? 'Faol' : 'Nofaol'}
                  </Badge>
                </div>
                {detailCourse.description && (
                  <DialogDescription>{detailCourse.description}</DialogDescription>
                )}
              </DialogHeader>

              {/* Course meta */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {detailCourse.teacher && (
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {detailCourse.teacher.firstName} {detailCourse.teacher.lastName}</span>
                )}
                {detailCourse.duration && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {detailCourse.duration} hafta</span>
                )}
                {detailCourse.price !== undefined && detailCourse.price !== null && (
                  <span className="flex items-center gap-1"><Banknote className="h-3 w-3 text-green-600" /> {formatCurrency(detailCourse.price)}</span>
                )}
              </div>

              {/* Students */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    O&apos;quvchilar ({(detailCourse.enrollments ?? []).length}/{detailCourse.maxStudents})
                  </p>
                  {(canManage || isTeacher) && (
                    <Button size="sm" variant="outline" className="h-7 text-xs"
                      onClick={() => { setEnrollCourseId(detailCourse.id); setEnrollOpen(true); }}>
                      <UserPlus className="mr-1 h-3 w-3" /> Qo&apos;shish
                    </Button>
                  )}
                </div>

                {(detailCourse.enrollments ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">O&apos;quvchilar yo&apos;q</p>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {(detailCourse.enrollments ?? []).map((en: any) => {
                      const cfg = STATUS_CONFIG[en.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.active;
                      return (
                        <div key={en.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{en.student?.firstName} {en.student?.lastName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                                {cfg.label}
                              </Badge>
                              {en.grade !== undefined && en.grade !== null && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Star className="h-3 w-3 text-yellow-500" /> {en.grade}
                                </span>
                              )}
                            </div>
                          </div>
                          {(canManage || isTeacher) && (
                            <div className="flex items-center gap-1 shrink-0">
                              {en.status === 'active' && (
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-green-600"
                                  title="Tugatdi"
                                  onClick={() => updateEnrollMutation.mutate({ courseId: detailCourse.id, enrollmentId: en.id, status: 'completed' })}
                                  disabled={updateEnrollMutation.isPending}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {canManage && (
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeEnrollMutation.mutate({ courseId: detailCourse.id, enrollmentId: en.id })}
                                  disabled={removeEnrollMutation.isPending}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Create/edit course dialog ────────────────────────────────────────── */}
      <Dialog open={courseOpen} onOpenChange={setCourseOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCourse ? 'Kursni tahrirlash' : 'Yangi kurs'}</DialogTitle>
            <DialogDescription>Kurs ma&apos;lumotlarini kiriting</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kurs nomi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Masalan: Matematika (9-sinf)"
                value={courseForm.name}
                onChange={e => { setCourseForm(f => ({ ...f, name: e.target.value })); setCourseErrors(er => { const n = { ...er }; delete n.name; return n; }); }}
              />
              {courseErrors.name && <p className="text-xs text-destructive">{courseErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Tavsif</Label>
              <Textarea
                placeholder="Kurs haqida qisqacha..."
                rows={2}
                className="resize-none"
                value={courseForm.description}
                onChange={e => setCourseForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>O&apos;qituvchi</Label>
              <Select
                value={courseForm.teacherId ?? ''}
                onValueChange={v => setCourseForm(f => ({ ...f, teacherId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang (ixtiyoriy)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Belgilanmagan —</SelectItem>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Davomiyligi (hafta)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Masalan: 12"
                  value={courseForm.duration ?? ''}
                  onChange={e => setCourseForm(f => ({ ...f, duration: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Narxi (so&apos;m)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Masalan: 500000"
                  value={courseForm.price ?? ''}
                  onChange={e => setCourseForm(f => ({ ...f, price: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Boshlanish sanasi</Label>
                <Input
                  type="date"
                  value={courseForm.startDate ?? ''}
                  onChange={e => setCourseForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tugash sanasi</Label>
                <Input
                  type="date"
                  value={courseForm.endDate ?? ''}
                  onChange={e => setCourseForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Maksimal o&apos;quvchi</Label>
                <Input
                  type="number"
                  min={1}
                  value={courseForm.maxStudents ?? 30}
                  onChange={e => setCourseForm(f => ({ ...f, maxStudents: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Holat</Label>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full h-10 gap-2 ${courseForm.isActive ? 'text-green-600 border-green-400' : 'text-muted-foreground'}`}
                  onClick={() => setCourseForm(f => ({ ...f, isActive: !f.isActive }))}
                >
                  {courseForm.isActive
                    ? <><ToggleRight className="h-4 w-4" /> Faol</>
                    : <><ToggleLeft className="h-4 w-4" /> Nofaol</>}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCourseOpen(false)}>Bekor</Button>
            <Button onClick={handleSave} disabled={isMutating}>
              {isMutating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editCourse ? 'Saqlash' : 'Qo\'shish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Enroll student dialog ────────────────────────────────────────────── */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>O&apos;quvchi qo&apos;shish</DialogTitle>
            <DialogDescription>Kursga yangi o&apos;quvchi biriktiring</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>O&apos;quvchi <span className="text-destructive">*</span></Label>
              <Select value={enrollStudentId} onValueChange={setEnrollStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="O'quvchi tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Bekor</Button>
            <Button
              onClick={() => {
                if (!enrollStudentId) { toast({ variant: 'destructive', title: 'O\'quvchi tanlang' }); return; }
                enrollMutation.mutate({ courseId: enrollCourseId!, studentId: enrollStudentId });
              }}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo&apos;shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
