'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Shield, Calendar, Edit2, Save, X,
  Key, Eye, EyeOff, Loader2, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { getInitials, getRoleLabel, formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '' });

  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-me'],
    queryFn: usersApi.getMe,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { firstName: string; lastName: string; phone?: string }) =>
      usersApi.update(authUser!.id, payload),
    onSuccess: (updated) => {
      toast({ title: '✅ Profil yangilandi' });
      updateUser({ firstName: updated.firstName, lastName: updated.lastName });
      queryClient.invalidateQueries({ queryKey: ['profile-me'] });
      setEditMode(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const pwMutation = useMutation({
    mutationFn: usersApi.changePassword,
    onSuccess: () => {
      toast({ title: '✅ Parol muvaffaqiyatli o\'zgartirildi' });
      setPwOpen(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Joriy parol noto\'g\'ri' });
    },
  });

  const startEdit = () => {
    setEditForm({
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
    });
    setEditMode(true);
  };

  const handleSave = () => {
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast({ variant: 'destructive', title: 'Ism va familiya kiritilishi shart' });
      return;
    }
    updateMutation.mutate({
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      phone: editForm.phone.trim() || undefined,
    });
  };

  const validatePw = () => {
    const e: Record<string, string> = {};
    if (!pwForm.currentPassword) e.currentPassword = 'Joriy parol kiritilishi shart';
    if (pwForm.newPassword.length < 8) e.newPassword = 'Kamida 8 ta belgi';
    if (pwForm.newPassword !== pwForm.confirmPassword) e.confirmPassword = 'Parollar mos kelmadi';
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePwSubmit = () => {
    if (!validatePw()) return;
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  const roleColors: Record<string, string> = {
    school_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    vice_principal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    teacher: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    class_teacher: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    accountant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    librarian: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    student: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    parent: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    super_admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const p = profile ?? authUser;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mening profilim</h1>
        <p className="text-muted-foreground">Shaxsiy ma'lumotlar va xavfsizlik</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          {/* Avatar + name */}
          <div className="flex items-start gap-5 mb-6">
            <Avatar className="h-20 w-20 text-2xl">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                {getInitials(p?.firstName ?? '', p?.lastName ?? '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">
                {p?.firstName} {p?.lastName}
              </h2>
              <div className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[p?.role ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                <Shield className="h-3 w-3" />
                {getRoleLabel(p?.role ?? '')}
              </div>
              {(p as any)?.createdAt && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Qo'shilgan: {formatDate((p as any).createdAt)}
                </p>
              )}
            </div>
            {!editMode && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Tahrirlash
              </Button>
            )}
          </div>

          <Separator className="mb-5" />

          {/* Info fields */}
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ism <span className="text-destructive">*</span></Label>
                  <Input
                    value={editForm.firstName}
                    onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="Ali"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Familiya <span className="text-destructive">*</span></Label>
                  <Input
                    value={editForm.lastName}
                    onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Valiyev"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Bekor
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Saqlash
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <InfoRow icon={<User className="h-4 w-4" />} label="To'liq ism" value={`${p?.firstName} ${p?.lastName}`} />
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={p?.email ?? '—'} />
              <InfoRow
                icon={<Phone className="h-4 w-4" />}
                label="Telefon"
                value={(p as any)?.phone ?? '—'}
                empty={!(p as any)?.phone}
              />
              <InfoRow
                icon={<Shield className="h-4 w-4" />}
                label="Holati"
                value={
                  <Badge
                    variant="outline"
                    className={(p as any)?.isActive !== false ? 'border-green-500 text-green-600' : 'border-red-400 text-red-500'}
                  >
                    {(p as any)?.isActive !== false ? 'Aktiv' : 'Bloklangan'}
                  </Badge>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" /> Xavfsizlik
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pwOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Parol</p>
                <p className="text-xs text-muted-foreground">••••••••••••</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>
                <Key className="mr-1.5 h-3.5 w-3.5" /> Parol o'zgartirish
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Joriy parol <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    className="pr-10"
                    value={pwForm.currentPassword}
                    onChange={e => { setPwForm(f => ({ ...f, currentPassword: e.target.value })); setPwErrors(er => { const n = { ...er }; delete n.currentPassword; return n; }); }}
                  />
                  <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwErrors.currentPassword && <p className="text-xs text-destructive">{pwErrors.currentPassword}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Yangi parol <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    className="pr-10"
                    placeholder="Kamida 8 ta belgi"
                    value={pwForm.newPassword}
                    onChange={e => { setPwForm(f => ({ ...f, newPassword: e.target.value })); setPwErrors(er => { const n = { ...er }; delete n.newPassword; return n; }); }}
                  />
                  <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pwErrors.newPassword && <p className="text-xs text-destructive">{pwErrors.newPassword}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Yangi parolni tasdiqlang <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="Takrorlang"
                  value={pwForm.confirmPassword}
                  onChange={e => { setPwForm(f => ({ ...f, confirmPassword: e.target.value })); setPwErrors(er => { const n = { ...er }; delete n.confirmPassword; return n; }); }}
                />
                {pwErrors.confirmPassword && <p className="text-xs text-destructive">{pwErrors.confirmPassword}</p>}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setPwOpen(false); setPwErrors({}); }}>
                  <X className="mr-1.5 h-3.5 w-3.5" /> Bekor
                </Button>
                <Button size="sm" onClick={handlePwSubmit} disabled={pwMutation.isPending}>
                  {pwMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Saqlash
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  empty,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={`text-sm font-medium ${empty ? 'text-muted-foreground italic' : ''}`}>
        {value}
      </span>
    </div>
  );
}
