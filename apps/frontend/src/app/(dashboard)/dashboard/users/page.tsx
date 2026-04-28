'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Users, Loader2, Eye, EyeOff, UserCheck, GraduationCap, Heart, Ban, RotateCcw, Link2, Upload, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
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
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [csvResult, setCsvResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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
    defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '', role: '', classId: '', studentId: '' },
  });

  const watchedRole = watch('role');

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

      toast({ title: "✅ Foydalanuvchi qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
    <div className="space-y-6">

      {/* CSV import natija dialogi */}
      {csvResult && (
        <Dialog open={!!csvResult} onOpenChange={() => setCsvResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> CSV Import natijalari
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{csvResult.created}</p>
                  <p className="text-xs text-muted-foreground">Qo'shildi</p>
                </div>
                <div className="rounded-lg bg-yellow-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{csvResult.skipped}</p>
                  <p className="text-xs text-muted-foreground">O'tkazildi</p>
                </div>
              </div>
              {csvResult.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-destructive mb-2">
                    <AlertTriangle className="h-4 w-4" /> Xatolar ({csvResult.errors.length} ta)
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {csvResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-muted-foreground">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setCsvResult(null)}>Yopish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
          <p className="text-muted-foreground">Jami: {meta?.total ?? 0} ta</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden CSV file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { csvMutation.mutate(file); e.target.value = ''; }
            }}
          />
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => csvInputRef.current?.click()}
            disabled={csvMutation.isPending}>
            {csvMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            CSV Import
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/dashboard/users/link-parent">
              <Link2 className="h-4 w-4" />
              Ota-ona bog'lash
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Excel import
          </Button>
          <Button onClick={() => { setOpen(true); reset(); }}>
            <Plus className="mr-2 h-4 w-4" /> Qo'shish
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Ism, email bo'yicha qidirish..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: any) => (
            <Card key={u.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar>
                  <AvatarFallback className="text-sm font-medium">{getInitials(u.firstName, u.lastName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                  {u.phone && <p className="text-xs text-muted-foreground">{u.phone}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Badge variant="secondary">{getRoleLabel(u.role)}</Badge>
                  <Badge variant="outline" className={u.isActive ? 'border-green-500 text-green-600' : 'border-red-400 text-red-500'}>
                    {u.isActive ? 'Aktiv' : 'Bloklangan'}
                  </Badge>
                  {u.isActive ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Bloklash"
                      onClick={() => setConfirmDelete(u)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Faollashtirish"
                      onClick={() => setConfirmDelete({ ...u, restore: true })}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card><CardContent className="py-4">
              <EmptyState
                icon={Users}
                title="Foydalanuvchilar topilmadi"
                description="Qidiruv yoki filtr natijasida hech narsa topilmadi"
              />
            </CardContent></Card>
          )}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Oldingi</Button>
          <span className="text-sm text-muted-foreground">{page} / {meta.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>Keyingi</Button>
        </div>
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
                : `${confirmDelete?.firstName} ${confirmDelete?.lastName} ni tizimdan o'chirish (bloklash)ni tasdiqlaysizmi? Bu amalni bekor qilish mumkin.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Bekor</Button>
            <Button
              variant={confirmDelete?.restore ? 'default' : 'destructive'}
              onClick={() => deleteMutation.mutate({ id: confirmDelete?.id, restore: confirmDelete?.restore })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmDelete?.restore ? 'Faollashtirish' : 'Bloklash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create user modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
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

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saqlanmoqda...</> : <><UserCheck className="mr-2 h-4 w-4" />Qo'shish</>}
              </Button>
            </DialogFooter>
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
    </div>
  );
}
