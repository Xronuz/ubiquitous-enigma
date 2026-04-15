'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, Users, Pencil, Trash2, Loader2, School, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = [`${currentYear}-${currentYear + 1}`, `${currentYear - 1}-${currentYear}`];

const EMPTY = { name: '', gradeLevel: '', academicYear: ACADEMIC_YEARS[0], classTeacherId: '' };

export default function ClassesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = ['school_admin', 'vice_principal'].includes(user?.role ?? '');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 1],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
    enabled: open,
  });
  const teachers = (usersData?.data ?? []).filter((u: any) =>
    ['teacher', 'class_teacher'].includes(u.role),
  );

  const createMutation = useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => {
      toast({ title: "✅ Sinf qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setOpen(false);
      setForm(EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: classesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({ title: "Sinf o'chirildi" });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xato yuz berdi' });
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Sinf nomi kiritilishi shart';
    if (!form.gradeLevel) e.gradeLevel = 'Sinf darajasi tanlang';
    if (!form.academicYear.trim()) e.academicYear = "O'quv yilini kiriting";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createMutation.mutate({
      name: form.name.trim(),
      gradeLevel: Number(form.gradeLevel),
      academicYear: form.academicYear.trim(),
      classTeacherId: form.classTeacherId || undefined,
    } as any);
  };

  const sel = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const classList = Array.isArray(classes) ? classes : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sinflar</h1>
          <p className="text-muted-foreground">{classList.length} ta sinf mavjud</p>
        </div>
        {canManage && (
          <Button onClick={() => { setOpen(true); setForm(EMPTY); setErrors({}); }}>
            <Plus className="mr-2 h-4 w-4" /> Sinf qo'shish
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : classList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <School className="mb-4 h-12 w-12 text-muted-foreground opacity-40" />
            <h3 className="font-semibold">Sinflar yo'q</h3>
            <p className="text-sm text-muted-foreground">
              {canManage ? 'Yuqoridagi tugmani bosib birinchi sinfni yarating' : 'Hali sinflar qo\'shilmagan'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classList.map((cls: any) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = `/dashboard/classes/${cls.id}`}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">{cls.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{cls.academicYear}</p>
                </div>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/classes/${cls.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> Ko'rish
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" /> Tahrirlash
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteMutation.mutate(cls.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> O'chirish
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{cls._count?.students ?? 0} o'quvchi</span>
                  </div>
                  <Badge variant="secondary">{cls.gradeLevel}-sinf</Badge>
                </div>
                {cls.classTeacher && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sinf rahbari: {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create class modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yangi sinf qo'shish</DialogTitle>
            <DialogDescription>Sinf ma'lumotlarini kiriting</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sinf nomi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Masalan: 5-A"
                value={form.name}
                onChange={e => {
                  setForm(f => ({ ...f, name: e.target.value }));
                  setErrors(er => { const n = { ...er }; delete n.name; return n; });
                }}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf darajasi <span className="text-destructive">*</span></Label>
                <Select value={form.gradeLevel} onValueChange={sel('gradeLevel')}>
                  <SelectTrigger><SelectValue placeholder="1-12..." /></SelectTrigger>
                  <SelectContent>
                    {GRADES.map(g => <SelectItem key={g} value={String(g)}>{g}-sinf</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.gradeLevel && <p className="text-xs text-destructive">{errors.gradeLevel}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>O'quv yili <span className="text-destructive">*</span></Label>
                <Select value={form.academicYear} onValueChange={sel('academicYear')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.academicYear && <p className="text-xs text-destructive">{errors.academicYear}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sinf rahbari</Label>
              <Select value={form.classTeacherId} onValueChange={sel('classTeacherId')}>
                <SelectTrigger><SelectValue placeholder="Ixtiyoriy..." /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
