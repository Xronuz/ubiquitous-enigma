'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Users, GraduationCap, Loader2, Check, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { subjectsApi } from '@/lib/api/subjects';
import { classesApi } from '@/lib/api/classes';
import { usersApi } from '@/lib/api/users';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/store/confirm.store';

const EMPTY = { name: '', classIds: [] as string[], teacherId: '' };

export default function SubjectsPage() {
  const ask = useConfirm();
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canManage = ['school_admin', 'vice_principal'].includes(user?.role ?? '');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  const { data: subjects = [], isLoading } = useQuery({ queryKey: ['subjects', activeBranchId], queryFn: () => subjectsApi.getAll() });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subjectsApi.remove(id),
    onSuccess: () => {
      toast({ title: "✅ Fan o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? "O'chirishda xatolik" });
    },
  });
  const { data: classes = [] } = useQuery({ queryKey: ['classes', activeBranchId], queryFn: () => classesApi.getAll(), enabled: open });
  const { data: usersData } = useQuery({ queryKey: ['users', 1, activeBranchId], queryFn: () => usersApi.getAll({ page: 1, limit: 100 }), enabled: open });
  const teachers = (usersData?.data ?? []).filter((u: any) => ['teacher', 'class_teacher'].includes(u.role));

  const toggleClass = (id: string) => {
    setForm(f => ({
      ...f,
      classIds: f.classIds.includes(id) ? f.classIds.filter(c => c !== id) : [...f.classIds, id],
    }));
    setErrors(e => { const n = { ...e }; delete n.classIds; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Fan nomi kiritilishi shart';
    if (form.classIds.length === 0) e.classIds = 'Kamida 1 ta sinf tanlang';
    if (!form.teacherId) e.teacherId = "O'qituvchi tanlang";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setCreating(true);
    try {
      await subjectsApi.create({
        name: form.name.trim(),
        classIds: form.classIds,
        teacherId: form.teacherId,
      });
      toast({ title: `✅ Fan ${form.classIds.length > 1 ? `${form.classIds.length} sinfga` : ''} qo'shildi` });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setOpen(false);
      setForm(EMPTY);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6 text-primary" /> Fanlar</h1>
          <p className="text-muted-foreground">Maktab fanlarini boshqarish</p>
        </div>
        {canManage && (
          <Button onClick={() => { setOpen(true); setForm(EMPTY); setErrors({}); }}>
            <Plus className="mr-2 h-4 w-4" /> Yangi fan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-28" />
            </CardContent></Card>
          ))}
        </div>
      ) : (subjects as any[]).length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">Hali fanlar qo'shilmagan</p>
          {canManage && <p className="text-sm mt-1 text-muted-foreground">Yuqoridagi "Yangi fan" tugmasini bosing</p>}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(subjects as any[]).map((subject: any) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-base">{subject.name}</h3>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deleteMutation.isPending}
                        onClick={async () => {
                          if (await ask({ title: `"${subject.name}" fanini o'chirishni tasdiqlaysizmi?`, variant: 'destructive', confirmText: "O'chirish" })) {
                            deleteMutation.mutate(subject.id);
                          }
                        }}
                      >
                        {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    )}
                    <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-4 w-4 text-primary" /></div>
                  </div>
                </div>
                {subject.class && (
                  <Badge variant="outline" className="gap-1 w-fit">
                    <GraduationCap className="h-3 w-3" />{subject.class.name}
                  </Badge>
                )}
                {subject.teacher && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {subject.teacher.firstName} {subject.teacher.lastName}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Yangi fan qo'shish</DialogTitle>
            <DialogDescription>Fan bir yoki bir nechta sinfga biriktiriladi</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Fan nomi */}
            <div className="space-y-1.5">
              <Label>Fan nomi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Masalan: Matematika"
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => { const n = { ...er }; delete n.name; return n; }); }}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {/* Sinflar - checkbox list */}
            <div className="space-y-1.5">
              <Label>Sinflar <span className="text-destructive">*</span></Label>
              {(classes as any[]).length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sinflar yuklanmoqda...</p>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {(classes as any[]).map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent cursor-pointer text-sm">
                      <Checkbox
                        checked={form.classIds.includes(c.id)}
                        onCheckedChange={() => toggleClass(c.id)}
                      />
                      <span>{c.name}</span>
                      {form.classIds.includes(c.id) && <Check className="h-3 w-3 text-primary ml-auto" />}
                    </label>
                  ))}
                </div>
              )}
              {form.classIds.length > 0 && (
                <p className="text-xs text-muted-foreground">{form.classIds.length} ta sinf tanlandi</p>
              )}
              {errors.classIds && <p className="text-xs text-destructive">{errors.classIds}</p>}
            </div>

            {/* O'qituvchi */}
            <div className="space-y-1.5">
              <Label>O'qituvchi <span className="text-destructive">*</span></Label>
              <Select value={form.teacherId} onValueChange={v => { setForm(f => ({ ...f, teacherId: v })); setErrors(e => { const n = { ...e }; delete n.teacherId; return n; }); }}>
                <SelectTrigger><SelectValue placeholder="O'qituvchi tanlang..." /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teacherId && <p className="text-xs text-destructive">{errors.teacherId}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSubmit} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo'shish {form.classIds.length > 1 ? `(${form.classIds.length} sinf)` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
