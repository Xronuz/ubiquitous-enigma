'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Users, Plus, Trash2, Search, Loader2,
  GraduationCap, UserPlus, School, Eye, EyeOff, UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/utils';

const NEW_STUDENT_EMPTY = { firstName: '', lastName: '', email: '', password: '', phone: '' };

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = ['school_admin', 'vice_principal'].includes(user?.role ?? '');

  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [tab, setTab] = useState<'existing' | 'new'>('existing');

  // New student form state
  const [newForm, setNewForm] = useState(NEW_STUDENT_EMPTY);
  const [newErrors, setNewErrors] = useState<Record<string, string>>({});
  const [showPass, setShowPass] = useState(false);
  const [creatingSaving, setCreatingSaving] = useState(false);

  // Load class info
  const { data: cls, isLoading: clsLoading } = useQuery({
    queryKey: ['class', id, activeBranchId],
    queryFn: () => classesApi.getOne(id),
  });

  // Load students in class
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['class-students', id, activeBranchId],
    queryFn: () => classesApi.getStudents(id),
  });

  // Load all users (for existing student search)
  const { data: allUsersData } = useQuery({
    queryKey: ['users-all', activeBranchId],
    queryFn: () => usersApi.getAll({ page: 1, limit: 200 }),
    enabled: addOpen && tab === 'existing',
  });

  // All students not already in this class
  const currentStudentIds = new Set((students as any[]).map((s: any) => s.id));
  const availableStudents = (allUsersData?.data ?? [])
    .filter((u: any) => u.role === 'student' && !currentStudentIds.has(u.id))
    .filter((u: any) => !addSearch || `${u.firstName} ${u.lastName}`.toLowerCase().includes(addSearch.toLowerCase()));

  const addMutation = useMutation({
    mutationFn: (studentId: string) => classesApi.addStudent(id, studentId),
    onSuccess: () => {
      toast({ title: "✅ O'quvchi qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['class-students', id] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (studentId: string) => classesApi.removeStudent(id, studentId),
    onSuccess: () => {
      toast({ title: "O'quvchi sinfdan chiqarildi" });
      queryClient.invalidateQueries({ queryKey: ['class-students', id] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const validateNew = () => {
    const e: Record<string, string> = {};
    if (!newForm.firstName.trim()) e.firstName = 'Ism kiritilishi shart';
    if (!newForm.lastName.trim()) e.lastName = 'Familiya kiritilishi shart';
    if (!newForm.email.includes('@')) e.email = "To'g'ri email kiriting";
    if (newForm.password.length < 8) e.password = 'Parol kamida 8 ta belgi';
    setNewErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateAndAdd = async () => {
    if (!validateNew()) return;
    setCreatingSaving(true);
    try {
      // 1) Create student user
      const created = await usersApi.create({
        firstName: newForm.firstName.trim(),
        lastName: newForm.lastName.trim(),
        email: newForm.email.trim(),
        password: newForm.password,
        phone: newForm.phone.trim() || undefined,
        role: 'student',
      } as any);

      // 2) Add to this class
      await classesApi.addStudent(id, created.id);

      toast({ title: `✅ ${created.firstName} ${created.lastName} sinfga qo'shildi` });
      queryClient.invalidateQueries({ queryKey: ['class-students', id] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setNewForm(NEW_STUDENT_EMPTY);
      setAddOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    } finally {
      setCreatingSaving(false);
    }
  };

  const setNew = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewForm(f => ({ ...f, [k]: e.target.value }));
    setNewErrors(er => { const n = { ...er }; delete n[k]; return n; });
  };

  const filteredStudents = (students as any[]).filter((s: any) =>
    !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  if (clsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Sinf topilmadi</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/classes')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/classes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <School className="h-6 w-6 text-primary" />
            {cls.name}
          </h1>
          <p className="text-muted-foreground">{cls.academicYear} • {cls.gradeLevel}-sinf</p>
        </div>
        {canManage && (
          <Button onClick={() => { setAddOpen(true); setAddSearch(''); setTab('existing'); setNewForm(NEW_STUDENT_EMPTY); setNewErrors({}); }}>
            <UserPlus className="mr-2 h-4 w-4" /> O'quvchi qo'shish
          </Button>
        )}
      </div>

      {/* Class info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(students as any[]).length}</p>
              <p className="text-xs text-muted-foreground">O'quvchilar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <GraduationCap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cls.gradeLevel}</p>
              <p className="text-xs text-muted-foreground">Sinf darajasi</p>
            </div>
          </CardContent>
        </Card>
        {cls.classTeacher && (
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Sinf rahbari</p>
              <p className="font-medium text-sm">{cls.classTeacher.firstName} {cls.classTeacher.lastName}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Students list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">O'quvchilar ro'yxati</CardTitle>
          <Badge variant="secondary">{(students as any[]).length} ta</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ism bo'yicha qidirish..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {studentsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {search ? "Qidiruv bo'yicha topilmadi" : "Hali o'quvchilar qo'shilmagan"}
              </p>
              {canManage && !search && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddOpen(true)}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> O'quvchi qo'shish
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredStudents.map((student: any, idx: number) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 group transition-colors"
                >
                  <span className="w-6 text-xs text-muted-foreground text-right">{idx + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                  </div>
                  {student.isActive !== false && (
                    <Badge variant="outline" className="border-green-500 text-green-600 text-xs">Aktiv</Badge>
                  )}
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeMutation.mutate(student.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add student modal — 2 tab: mavjud / yangi yaratish */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>O'quvchi qo'shish</DialogTitle>
            <DialogDescription>{cls.name} sinfiga o'quvchi qo'shing</DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full grid grid-cols-2 mb-2">
              <TabsTrigger value="existing">Mavjud o'quvchi</TabsTrigger>
              <TabsTrigger value="new">Yangi o'quvchi</TabsTrigger>
            </TabsList>

            {/* TAB 1 — Mavjud o'quvchilar */}
            <TabsContent value="existing" className="space-y-3 mt-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ism bo'yicha qidirish..."
                  className="pl-9"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-1">
                {availableStudents.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {addSearch ? 'Topilmadi' : "Qo'shuvchan o'quvchilar yo'q"}
                  </div>
                ) : (
                  availableStudents.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        addMutation.mutate(s.id);
                        setAddOpen(false);
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(s.firstName, s.lastName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      </div>
                      <Plus className="h-4 w-4 text-primary shrink-0" />
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Yangi o'quvchi yaratmoqchi bo'lsangiz → "Yangi o'quvchi" tabini bosing
              </p>
            </TabsContent>

            {/* TAB 2 — Yangi o'quvchi yaratib sinfga qo'shish */}
            <TabsContent value="new" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ism <span className="text-destructive">*</span></Label>
                  <Input placeholder="Ali" value={newForm.firstName} onChange={setNew('firstName')} />
                  {newErrors.firstName && <p className="text-xs text-destructive">{newErrors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Familiya <span className="text-destructive">*</span></Label>
                  <Input placeholder="Valiyev" value={newForm.lastName} onChange={setNew('lastName')} />
                  {newErrors.lastName && <p className="text-xs text-destructive">{newErrors.lastName}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="ali@maktab.uz" value={newForm.email} onChange={setNew('email')} />
                {newErrors.email && <p className="text-xs text-destructive">{newErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Parol <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Kamida 8 ta belgi"
                    className="pr-10"
                    value={newForm.password}
                    onChange={setNew('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newErrors.password && <p className="text-xs text-destructive">{newErrors.password}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input placeholder="+998 90 123 45 67" value={newForm.phone} onChange={setNew('phone')} />
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                O'quvchi yaratiladi va avtomatik <strong>{cls.name}</strong> sinfiga qo'shiladi
              </div>
              <Button className="w-full" onClick={handleCreateAndAdd} disabled={creatingSaving}>
                {creatingSaving
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saqlanmoqda...</>
                  : <><UserCheck className="mr-2 h-4 w-4" />Yaratib qo'shish</>}
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Yopish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
