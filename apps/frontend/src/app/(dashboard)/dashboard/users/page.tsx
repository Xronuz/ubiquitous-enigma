'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Users, Loader2, Eye, EyeOff, UserCheck, GraduationCap, Heart, Ban, RotateCcw, Link2, Upload, FileText, AlertTriangle, BookOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PageShell, PageHeader, FilterBar, TableShell, THead, TH, TBody, TR, TD, AvatarCell, StatusBadge, EmptyCard, Pagination, Btn, DS } from '@/components/ui/page-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { branchesApi } from '@/lib/api/branches';
import { subjectsApi } from '@/lib/api/subjects';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, getRoleLabel } from '@/lib/utils';
import { ImportDialog } from '@/components/import/import-dialog';

// ── Zod schema ────────────────────────────────────────────────────────────────
const userSchema = z.object({
  firstName: z.string().min(1, 'Ism kiritilishi shart').trim(),
  lastName:  z.string().min(1, 'Familiya kiritilishi shart').trim(),
  email:     z.string().email("To'g'ri email kiriting"),
  password:  z.string().min(8, 'Parol kamida 8 ta belgi'),
  phone:     z.string().optional(),
  role:      z.string().min(1, 'Rol tanlanishi shart'),
  classId:   z.string().optional(),
  studentId: z.string().optional(),
  branchId:  z.string().optional(),
});
type UserFormValues = z.infer<typeof userSchema>;

// Guard: super_admin bu sahifani ko'rmasligi kerak
function useSuperAdminGuard() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  useEffect(() => {
    if (user?.role === 'super_admin') router.replace('/dashboard/schools');
  }, [user, router]);
  return user?.role === 'super_admin';
}

const ROLES = [
  { value: 'vice_principal', label: "O'quv ishlari bo'yicha direktor" },
  { value: 'branch_admin', label: 'Filial admin' },
  { value: 'teacher', label: "O'qituvchi" },
  { value: 'class_teacher', label: 'Sinf rahbari' },
  { value: 'accountant', label: 'Buxgalter' },
  { value: 'librarian', label: 'Kutubxonachi' },
  { value: 'student', label: "O'quvchi" },
  { value: 'parent', label: 'Ota-ona' },
];

export default function UsersPage() {
  const isSuperAdmin = useSuperAdminGuard();
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState<any>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<any>(null);
  const isDirector = user?.role === 'director';
  const [csvResult, setCsvResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<{ name: string; classId: string }[]>([]);
  const [subjectWarning, setSubjectWarning] = useState<string>('');

  // ── React Hook Form ──────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '', role: '', classId: '', studentId: '', branchId: activeBranchId ?? '' },
  });

  const watchedRole = watch('role');
  const watchedBranchId = watch('branchId');

  // Load branches for admin/director branch selection
  const { data: branchesData } = useQuery({
    queryKey: ['branches', user?.schoolId],
    queryFn: () => branchesApi.getAll(),
    enabled: open && !!user?.schoolId && ['super_admin', 'director', 'vice_principal'].includes(user?.role ?? ''),
  });
  const branchesList = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];

  const csvMutation = useMutation({
    mutationFn: (file: File) => usersApi.importCsv(file),
    onSuccess: (result) => {
      setCsvResult(result);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: `✅ Import bajarildi: ${result.created} ta qo'shildi`,
        description: result.skipped > 0 ? `${result.skipped} ta o'tkazib yuborildi` : undefined,
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Import xatosi', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  // Debounce search — 400ms
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch, activeBranchId],
    queryFn: () => usersApi.getAll({ page, limit: 20, search: debouncedSearch || undefined }),
  });

  // Load classes when modal opens
  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: () => classesApi.getAll(),
    enabled: open,
  });

  // Load students list when parent role selected
  const { data: allStudentsData } = useQuery({
    queryKey: ['users-students', activeBranchId],
    queryFn: () => usersApi.getAll({ page: 1, limit: 200 }),
    enabled: open && watchedRole === 'parent',
  });
  const studentsList = (allStudentsData?.data ?? []).filter((u: any) => u.role === 'student');

  // Load existing subjects when teacher role selected
  const { data: existingSubjectsData } = useQuery({
    queryKey: ['subjects', activeBranchId],
    queryFn: () => subjectsApi.getAll(),
    enabled: open && watchedRole === 'teacher',
  });
  const existingSubjects = Array.isArray(existingSubjectsData) ? existingSubjectsData : (existingSubjectsData as any)?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: ({ id, restore }: { id: string; restore?: boolean }) =>
      restore ? usersApi.restore(id) : usersApi.remove(id),
    onSuccess: (_, vars) => {
      toast({ title: vars.restore ? '✅ Foydalanuvchi faollashtirildi' : "Foydalanuvchi bloklandi" });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.hardDelete(id),
    onSuccess: () => {
      toast({ title: '🗑️ Foydalanuvchi butunlay o\'chirildi' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmHardDelete(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const onSubmit = async (values: UserFormValues) => {
    try {
      // 1. Create user
      const created = await usersApi.create({
        firstName: values.firstName,
        lastName:  values.lastName,
        email:     values.email,
        password:  values.password,
        phone:     values.phone?.trim() || undefined,
        role:      values.role,
        branchId:  values.branchId?.trim() || undefined,
      } as any);

      // 2. Student → enroll in class if selected
      if (values.role === 'student' && values.classId) {
        try {
          await classesApi.addStudent(values.classId, created.id);
        } catch {
          toast({ variant: 'destructive', title: "Sinfga qo'shishda xato", description: "Foydalanuvchi yaratildi, lekin sinfga qo'shilmadi" });
        }
      }

      // 3. Parent → link to student if selected
      if (values.role === 'parent' && values.studentId) {
        try {
          await usersApi.linkParentStudent(created.id, values.studentId);
        } catch {
          toast({ variant: 'destructive', title: "Bog'lashda xato", description: "Ota-ona yaratildi, lekin o'quvchiga bog'lanmadi" });
        }
      }

      // 4. Teacher → create subjects if specified
      if (values.role === 'teacher' && teacherSubjects.length > 0) {
        try {
          for (const subj of teacherSubjects) {
            if (subj.name.trim() && subj.classId) {
              await subjectsApi.create({
                name: subj.name.trim(),
                classIds: [subj.classId],
                teacherId: created.id,
              });
            }
          }
          toast({ title: `✅ Foydalanuvchi va ${teacherSubjects.length} ta fan qo'shildi` });
        } catch {
          toast({ variant: 'destructive', title: "Fan qo'shishda xato", description: "O'qituvchi yaratildi, lekin ba'zi fanlar qo'shilmadi" });
        }
      } else {
        toast({ title: "✅ Foydalanuvchi qo'shildi" });
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTeacherSubjects([]);
      setOpen(false);
      reset();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    }
  };

  // Server-side search — filterlash backend da amalga oshiriladi
  const users = data?.data ?? [];
  const meta = data?.meta;
  const filtered = users; // client-side filter olib tashlandi

  if (isSuperAdmin) return null;

  return (
    <PageShell>
      {/* CSV import natija dialogi */}
      {csvResult && (
        <Dialog open={!!csvResult} onOpenChange={() => setCsvResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: DS.primary }} /> CSV Import natijalari
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{ background: '#DDF5EA' }}>
                  <p className="text-2xl font-black" style={{ color: DS.primary }}>{csvResult.created}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: DS.muted }}>Qo&apos;shildi</p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: '#FEF3C7' }}>
                  <p className="text-2xl font-black text-amber-600">{csvResult.skipped}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: DS.muted }}>O&apos;tkazildi</p>
                </div>
              </div>
              {csvResult.errors.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-red-600 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Xatolar ({csvResult.errors.length} ta)
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {csvResult.errors.map((e, i) => (
                      <p key={i} className="text-xs" style={{ color: DS.muted }}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Btn variant="primary" onClick={() => setCsvResult(null)}>Yopish</Btn>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <PageHeader
        title="Foydalanuvchilar"
        subtitle={`Jami: ${meta?.total ?? 0} ta`}
        actions={
          <>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { csvMutation.mutate(f); e.target.value = ''; } }} />
            <Btn variant="secondary" size="sm" icon={csvMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              onClick={() => csvInputRef.current?.click()} loading={csvMutation.isPending}>
              CSV
            </Btn>
            <Btn variant="secondary" size="sm" icon={<Link2 className="h-4 w-4" />} onClick={() => window.location.href = '/dashboard/users/link-parent'}>
              Bog&apos;lash
            </Btn>
            <Btn variant="secondary" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
              Import
            </Btn>
            <Btn variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => { setOpen(true); reset(); }}>
              Qo&apos;shish
            </Btn>
          </>
        }
      />

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Ism, email bo'yicha qidirish..."
      />

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyCard icon={<Users className="h-6 w-6" />} title="Foydalanuvchilar topilmadi" description="Qidiruv natijasida hech narsa topilmadi" />
      ) : (
        <TableShell>
          <THead>
            <TH>Foydalanuvchi</TH>
            <TH>Rol</TH>
            <TH>Telefon</TH>
            <TH>Holat</TH>
            <TH className="text-right">Amal</TH>
          </THead>
          <TBody>
            {filtered.map((u: any) => (
              <TR key={u.id}>
                <TD><AvatarCell name={`${u.firstName} ${u.lastName}`} subtitle={u.email} /></TD>
                <TD><span className="text-[12px] font-semibold" style={{ color: DS.muted }}>{getRoleLabel(u.role)}</span></TD>
                <TD><span className="text-[13px]" style={{ color: DS.muted }}>{u.phone || '—'}</span></TD>
                <TD>
                  <StatusBadge variant={u.isActive ? 'success' : 'danger'}>
                    {u.isActive ? 'Aktiv' : 'Bloklangan'}
                  </StatusBadge>
                </TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {u.isActive ? (
                      <Btn variant="danger" size="sm" icon={<Ban className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(u)}>
                        Bloklash
                      </Btn>
                    ) : (
                      <Btn variant="soft" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete({ ...u, restore: true })}>
                        Faollashtirish
                      </Btn>
                    )}
                    {isDirector && u.role !== 'director' && (
                      <Btn variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => setConfirmHardDelete(u)}
                        title="Butunlay o'chirish"
                      />
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
          {meta && meta.totalPages > 1 && (
            <Pagination page={page} total={meta.total} perPage={20} onPage={setPage} />
          )}
        </TableShell>
      )}

      {/* Delete/Block confirm dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={v => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.restore ? 'Foydalanuvchini faollashtirish' : 'Foydalanuvchini bloklash'}
            </DialogTitle>
            <DialogDescription>
              {confirmDelete?.restore
                ? `${confirmDelete?.firstName} ${confirmDelete?.lastName} ni qayta faollashtirasizmi?`
                : `${confirmDelete?.firstName} ${confirmDelete?.lastName} ni bloklashni tasdiqlaysizmi?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setConfirmDelete(null)}>Bekor</Btn>
            <Btn
              variant={confirmDelete?.restore ? 'soft' : 'danger'}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: confirmDelete?.id, restore: confirmDelete?.restore })}
            >
              {confirmDelete?.restore ? 'Faollashtirish' : 'Bloklash'}
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard delete confirm dialog — faqat director */}
      <Dialog open={!!confirmHardDelete} onOpenChange={v => { if (!v) setConfirmHardDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Foydalanuvchini butunlay o'chirish
            </DialogTitle>
            <DialogDescription className="pt-1">
              <span className="font-semibold text-foreground">
                {confirmHardDelete?.firstName} {confirmHardDelete?.lastName}
              </span>{' '}
              ({confirmHardDelete?.email}) foydalanuvchisi tizimdan <span className="font-semibold text-destructive">butunlay va qaytarib bo'lmasdan</span> o'chiriladi.
              Barcha ma'lumotlari ham o'chadi.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-xs text-destructive font-medium flex items-start gap-2 mt-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Bu amalni bekor qilib bo'lmaydi. Davom etishdan oldin ishonch hosil qiling.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setConfirmHardDelete(null)}>Bekor</Btn>
            <Btn
              variant="danger"
              loading={hardDeleteMutation.isPending}
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => hardDeleteMutation.mutate(confirmHardDelete?.id)}
            >
              Ha, o'chirish
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create user modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setTeacherSubjects([]); setSubjectWarning(''); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi qo'shish</DialogTitle>
            <DialogDescription>Maktab tizimiga yangi a'zo kiriting</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Asosiy ma'lumotlar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ism <span className="text-destructive">*</span></Label>
                <Input placeholder="Ali" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Familiya <span className="text-destructive">*</span></Label>
                <Input placeholder="Valiyev" {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="ali@maktab.uz" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Parol <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} placeholder="Kamida 8 ta belgi" className="pr-10" {...register('password')} />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input placeholder="+998 90 123 45 67" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol <span className="text-destructive">*</span></Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Rol tanlang..." /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
            </div>

            {/* Branch selector for school-wide roles */}
            {branchesList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Controller
                  name="branchId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filial tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesList.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">Agar tanlanmasa, foydalanuvchi joriy filialga biriktiriladi</p>
              </div>
            )}

            {/* O'qituvchi → Fan yaratish */}
            {watchedRole === 'teacher' && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-800 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-400">
                  <BookOpen className="h-4 w-4" /> O'qituvchi fanlari
                </div>

                {/* Mavjud fanlar ro'yxati */}
                {existingSubjects.length > 0 && (
                  <div>
                    <p className="text-xs text-violet-600 dark:text-violet-400 mb-1.5 font-medium">Mavjud fanlar:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {existingSubjects.map((s: any) => (
                        <span key={s.id} className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-background border px-2 py-0.5 text-xs">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground">({s.class?.name})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Yangi qo'shilayotgan fanlar */}
                {teacherSubjects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Yangi qo'shiladi:</p>
                    {teacherSubjects.map((subj, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-background rounded-md p-2 border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{subj.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(classesData ?? []).find((c: any) => c.id === subj.classId)?.name ?? subj.classId}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setTeacherSubjects(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Yangi fan qo'shish */}
                <div className="space-y-2">
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Yangi fan qo'shish:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="subject-name"
                      placeholder="Fan nomi"
                      className="bg-white dark:bg-background"
                      onChange={(e) => {
                        const name = e.target.value.trim();
                        if (!name) { setSubjectWarning(''); return; }
                        const dup = existingSubjects.find((s: any) => s.name.toLowerCase() === name.toLowerCase());
                        if (dup) {
                          setSubjectWarning(`"${dup.name}" fani allaqachon mavjud (${dup.class?.name})`);
                        } else {
                          setSubjectWarning('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                    />
                    <Select
                      value=""
                      onValueChange={(v) => {
                        const nameInput = document.getElementById('subject-name') as HTMLInputElement;
                        const name = nameInput?.value.trim();
                        if (name && v) {
                          const className = (classesData ?? []).find((c: any) => c.id === v)?.name ?? v;
                          const alreadyInList = teacherSubjects.some(
                            (s) => s.name.toLowerCase() === name.toLowerCase() && s.classId === v
                          );
                          if (alreadyInList) {
                            toast({ variant: 'destructive', title: 'Bu fan allaqachon ro\'yxatda' });
                            return;
                          }
                          setTeacherSubjects(prev => [...prev, { name, classId: v }]);
                          nameInput.value = '';
                          setSubjectWarning('');
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-background">
                        <SelectValue placeholder="Sinf tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {(classesData ?? []).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {subjectWarning && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠️ {subjectWarning}</p>
                  )}
                  <p className="text-xs text-violet-600 dark:text-violet-400 opacity-70">
                    Fan nomini yozib, sinf tanlang. Har bir fan alohida sinfga biriktiriladi.
                  </p>
                </div>
              </div>
            )}

            {/* O'quvchi → Sinf tanlash */}
            {watchedRole === 'student' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                  <GraduationCap className="h-4 w-4" /> O'quvchi uchun sinf
                </div>
                <Controller
                  name="classId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-white dark:bg-background">
                        <SelectValue placeholder="Sinf tanlang (ixtiyoriy)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(classesData ?? []).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-blue-600 dark:text-blue-400 opacity-70">O'quvchi tanlangan sinfga avtomatik qo'shiladi</p>
              </div>
            )}

            {/* Ota-ona → O'quvchi bog'lash */}
            {watchedRole === 'parent' && (
              <div className="rounded-lg border border-pink-200 bg-pink-50 dark:bg-pink-950/20 dark:border-pink-800 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-pink-700 dark:text-pink-400">
                  <Heart className="h-4 w-4" /> Farzand (o'quvchi)
                </div>
                <Controller
                  name="studentId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-white dark:bg-background">
                        <SelectValue placeholder="O'quvchi tanlang (ixtiyoriy)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsList.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">O'quvchilar topilmadi</div>
                        ) : (
                          studentsList.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-pink-600 dark:text-pink-400 opacity-70">Ota-ona o'quvchi bilan avtomatik bog'lanadi</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Btn>
              <Btn type="submit" variant="primary" loading={isSubmitting} icon={<UserCheck className="h-4 w-4" />}>
                Qo&apos;shish
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Excel import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="users"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </PageShell>
  );
}
