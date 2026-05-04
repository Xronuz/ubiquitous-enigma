'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreVertical, Users, Pencil, Trash2, Loader2, School, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PageShell, PageHeader, PCard, EmptyCard, Btn, DS } from '@/components/ui/page-ui';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { branchesApi } from '@/lib/api/branches';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = [`${currentYear}-${currentYear + 1}`, `${currentYear - 1}-${currentYear}`];

const EMPTY = { name: '', gradeLevel: '', academicYear: ACADEMIC_YEARS[0], classTeacherId: '', branchId: '' };

export default function ClassesPage() {
  const { user , activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = ['director', 'vice_principal'].includes(user?.role ?? '');

  const [open, setOpen] = useState(false);
  const [editClass, setEditClass] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: classesApi.getAll,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 1, activeBranchId],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
    enabled: open,
  });
  const { data: branchesData } = useQuery({
    queryKey: ['branches', user?.schoolId],
    queryFn: () => branchesApi.getAll(),
    enabled: open && !!user?.schoolId && ['super_admin', 'director'].includes(user?.role ?? ''),
  });
  const branchesList = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];
  const teachers = (usersData?.data ?? []).filter((u: any) =>
    ['teacher', 'class_teacher'].includes(u.role),
  );

  const closeDialog = () => { setOpen(false); setEditClass(null); setForm(EMPTY); setErrors({}); };

  const createMutation = useMutation({
    mutationFn: classesApi.create,
    onSuccess: () => {
      toast({ title: "✅ Sinf qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      closeDialog();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => classesApi.update(id, payload),
    onSuccess: () => {
      toast({ title: '✅ Sinf yangilandi' });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      closeDialog();
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
    const teacherId = form.classTeacherId === '__none__' ? null : (form.classTeacherId || undefined);
    if (editClass) {
      updateMutation.mutate({
        id: editClass.id,
        payload: {
          name: form.name.trim(),
          gradeLevel: Number(form.gradeLevel),
          classTeacherId: teacherId,
          branchId: form.branchId?.trim() || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        gradeLevel: Number(form.gradeLevel),
        academicYear: form.academicYear.trim(),
        classTeacherId: teacherId as any,
        branchId: form.branchId?.trim() || undefined,
      } as any);
    }
  };

  const sel = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  };

  const classList = Array.isArray(classes) ? classes : [];

  return (
    <PageShell>
      <PageHeader
        title="Sinflar"
        subtitle={`${classList.length} ta sinf mavjud`}
        actions={canManage ? (
          <Btn variant="primary" icon={<Plus className="h-4 w-4" />}
            onClick={() => { setEditClass(null); setForm(EMPTY); setErrors({}); setOpen(true); }}>
            Sinf qo&apos;shish
          </Btn>
        ) : undefined}
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-[24px]" />)}
        </div>
      ) : classList.length === 0 ? (
        <EmptyCard
          icon={<School className="h-6 w-6" />}
          title="Sinflar yo'q"
          description={canManage ? "Yuqoridagi tugmani bosib birinchi sinfni yarating" : "Hali sinflar qo'shilmagan"}
          action={canManage ? (
            <Btn variant="primary" icon={<Plus className="h-4 w-4" />}
              onClick={() => { setEditClass(null); setForm(EMPTY); setErrors({}); setOpen(true); }}>
              Sinf qo&apos;shish
            </Btn>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classList.map((cls: any) => (
            <PCard key={cls.id} hoverable padding="none"
              onClick={() => window.location.href = `/dashboard/classes/${cls.id}`}>
              {/* Card top stripe */}
              <div className="h-1.5 rounded-t-[24px]" style={{ background: 'linear-gradient(90deg, #0F7B53, #10b981)' }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[17px] font-bold" style={{ color: DS.text }}>{cls.name}</p>
                    <p className="text-[12px] mt-0.5 font-medium" style={{ color: DS.muted }}>{cls.academicYear}</p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={e => e.stopPropagation()}
                          className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" style={{ color: DS.muted }} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/classes/${cls.id}`}>
                            <Eye className="mr-2 h-4 w-4" /> Ko&apos;rish
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditClass(cls);
                          setForm({ name: cls.name, gradeLevel: String(cls.gradeLevel), academicYear: cls.academicYear, classTeacherId: cls.classTeacherId ?? '', branchId: cls.branchId ?? '' });
                          setErrors({}); setOpen(true);
                        }}>
                          <Pencil className="mr-2 h-4 w-4" /> Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive"
                          onClick={e => { e.stopPropagation(); deleteMutation.mutate(cls.id); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> O&apos;chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: DS.muted }}>
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{cls._count?.students ?? 0}</span>
                    <span>o&apos;quvchi</span>
                  </div>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: DS.primaryLight, color: DS.primary }}
                  >
                    {cls.gradeLevel}-sinf
                  </span>
                </div>

                {cls.classTeacher && (
                  <p className="mt-3 text-[12px] font-medium truncate pt-3 border-t" style={{ color: DS.muted, borderColor: 'rgba(0,0,0,0.05)' }}>
                    Sinf rahbari: {cls.classTeacher.firstName} {cls.classTeacher.lastName}
                  </p>
                )}
              </div>
            </PCard>
          ))}
        </div>
      )}

      {/* Create / Edit class modal */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editClass ? 'Sinfni tahrirlash' : "Yangi sinf qo'shish"}</DialogTitle>
            <DialogDescription>Sinf ma&apos;lumotlarini kiriting</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sinf nomi <span className="text-destructive">*</span></Label>
              <Input placeholder="Masalan: 5-A" value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => { const n = { ...er }; delete n.name; return n; }); }} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf darajasi <span className="text-destructive">*</span></Label>
                <Select value={form.gradeLevel} onValueChange={sel('gradeLevel')}>
                  <SelectTrigger><SelectValue placeholder="1-12..." /></SelectTrigger>
                  <SelectContent>{GRADES.map(g => <SelectItem key={g} value={String(g)}>{g}-sinf</SelectItem>)}</SelectContent>
                </Select>
                {errors.gradeLevel && <p className="text-xs text-destructive">{errors.gradeLevel}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>O&apos;quv yili <span className="text-destructive">*</span></Label>
                <Select value={form.academicYear} onValueChange={sel('academicYear')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
                {errors.academicYear && <p className="text-xs text-destructive">{errors.academicYear}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sinf rahbari</Label>
              <Select value={form.classTeacherId || '__none__'} onValueChange={sel('classTeacherId')}>
                <SelectTrigger><SelectValue placeholder="Ixtiyoriy..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Sinf rahbarisiz —</SelectItem>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {branchesList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Select value={form.branchId || '__auto__'} onValueChange={v => sel('branchId')(v === '__auto__' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Filial tanlang..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">Joriy filial (avtomatik)</SelectItem>
                    {branchesList.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Btn variant="secondary" onClick={closeDialog}>Bekor qilish</Btn>
            <Btn variant="primary" loading={createMutation.isPending || updateMutation.isPending} onClick={handleSubmit}>
              {editClass ? 'Saqlash' : "Qo'shish"}
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
