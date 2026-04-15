'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Settings, Bell, Shield, Palette, Globe, User, Save, Loader2, Eye, EyeOff, Check,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api/users';
import { systemConfigApi, SystemConfigMap } from '@/lib/api/system-config';
import { useToast } from '@/components/ui/use-toast';
import { UserRole, Language } from '@eduplatform/types';
import { getInitials, getRoleLabel } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'profil' | 'xavfsizlik' | 'bildirishnomalar' | 'interfeys' | 'tizim';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ElementType;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_TABS: Tab[] = [
  { key: 'profil', label: 'Profil', icon: User },
  { key: 'xavfsizlik', label: 'Xavfsizlik', icon: Shield },
  { key: 'bildirishnomalar', label: 'Bildirishnomalar', icon: Bell },
  { key: 'interfeys', label: 'Interfeys', icon: Palette },
];
const ADMIN_TAB: Tab = { key: 'tizim', label: 'Tizim', icon: Settings };

const ROLE_DESCRIPTIONS: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: 'Butun platforma ustidan to\'liq nazorat',
  [UserRole.SCHOOL_ADMIN]: 'Maktab bo\'yicha barcha operatsiyalarni boshqarish',
  [UserRole.VICE_PRINCIPAL]: 'Maktab mudir o\'rinbosari vakolatlari',
  [UserRole.TEACHER]: 'Dars jadvali, baholar va vazifalarni boshqarish',
  [UserRole.CLASS_TEACHER]: 'Sinf rahbari — davomatni kuzatish va ota-onalar bilan aloqa',
  [UserRole.ACCOUNTANT]: 'To\'lovlar va moliyaviy hisobotlarni boshqarish',
  [UserRole.LIBRARIAN]: 'Kutubxona fondini va kitob berishni boshqarish',
  [UserRole.STUDENT]: 'Darslar, baholar va vazifalarni ko\'rish',
  [UserRole.PARENT]: 'Farzand natijalarini va davomatini kuzatish',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  [UserRole.SUPER_ADMIN]: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300',
  [UserRole.SCHOOL_ADMIN]: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  [UserRole.VICE_PRINCIPAL]: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  [UserRole.TEACHER]: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  [UserRole.CLASS_TEACHER]: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300',
  [UserRole.ACCOUNTANT]: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
  [UserRole.LIBRARIAN]: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
  [UserRole.STUDENT]: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300',
  [UserRole.PARENT]: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('profil');

  const isAdmin = user?.role === UserRole.SCHOOL_ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const TABS = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  // ── SystemConfig state ──
  const [sysForm, setSysForm] = useState<Partial<SystemConfigMap>>({});
  const [sysSaved, setSysSaved] = useState(false);

  // ── Profil form state ──
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: '',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // ── Security form state ──
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  // ── Notifications state ──
  const [notifications, setNotifications] = useState({
    inApp: true,
    email: false,
    sms: false,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  // ── Interface state ──
  const [language, setLanguage] = useState<Language>(Language.UZ);

  // ─── Load user profile (phone) ────────────────────────────────────────────
  useQuery({
    queryKey: ['profile-me-settings'],
    queryFn: async () => {
      const data = await usersApi.getMe();
      setProfileForm({
        firstName: data.firstName ?? user?.firstName ?? '',
        lastName: data.lastName ?? user?.lastName ?? '',
        phone: (data as any).phone ?? '',
      });
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // ─── SystemConfig fetch ────────────────────────────────────────────────────

  useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const data = await systemConfigApi.getAll();
      setSysForm(data);
      return data;
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const sysConfigMutation = useMutation({
    mutationFn: (payload: Partial<SystemConfigMap>) => systemConfigApi.update(payload),
    onSuccess: (updated) => {
      setSysForm(updated);
      setSysSaved(true);
      setTimeout(() => setSysSaved(false), 2500);
      toast({ title: 'Tizim sozlamalari saqlandi', description: 'Maktab konfiguratsiyasi yangilandi.' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Xato',
        description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Saqlashda xatolik yuz berdi',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { firstName: string; lastName: string; phone?: string }) =>
      usersApi.update(user!.id, payload),
    onSuccess: (updated) => {
      updateUser({
        firstName: updated.firstName ?? profileForm.firstName,
        lastName: updated.lastName ?? profileForm.lastName,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
      toast({ title: 'Profil saqlandi', description: 'Ma\'lumotlaringiz muvaffaqiyatli yangilandi.' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Xato',
        description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Saqlashda xatolik yuz berdi',
      });
    },
  });

  const pwMutation = useMutation({
    mutationFn: usersApi.changePassword,
    onSuccess: () => {
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
      toast({ title: 'Parol yangilandi', description: 'Yangi parolingiz muvaffaqiyatli saqlandi.' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Xato',
        description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Joriy parol noto\'g\'ri',
      });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleProfileSave = () => {
    if (!profileForm.firstName.trim()) {
      toast({ variant: 'destructive', title: 'Xato', description: 'Ism kiritilishi shart' });
      return;
    }
    if (!profileForm.lastName.trim()) {
      toast({ variant: 'destructive', title: 'Xato', description: 'Familiya kiritilishi shart' });
      return;
    }
    updateMutation.mutate({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      phone: profileForm.phone.trim() || undefined,
    });
  };

  const validatePassword = (): boolean => {
    const errors: Record<string, string> = {};
    if (!pwForm.currentPassword) errors.currentPassword = 'Joriy parol kiritilishi shart';
    if (pwForm.newPassword.length < 8) errors.newPassword = 'Parol kamida 8 belgi bo\'lishi kerak';
    if (pwForm.newPassword !== pwForm.confirmPassword) errors.confirmPassword = 'Parollar mos kelmadi';
    setPwErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSave = () => {
    if (!validatePassword()) return;
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
  };

  const handleNotifSave = () => {
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2500);
    toast({ title: 'Sozlamalar saqlandi', description: 'Bildirishnoma sozlamalaringiz yangilandi.' });
  };

  const clearPwError = (field: string) =>
    setPwErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  const handleSysConfigSave = () => {
    const payload: Partial<SystemConfigMap> = {};
    if (sysForm.bhm !== undefined) payload.bhm = Number(sysForm.bhm);
    if (sysForm.academic_year !== undefined) payload.academic_year = sysForm.academic_year;
    if (sysForm.school_name !== undefined) payload.school_name = sysForm.school_name;
    if (sysForm.school_phone !== undefined) payload.school_phone = sysForm.school_phone;
    if (sysForm.school_address !== undefined) payload.school_address = sysForm.school_address;
    if (sysForm.pass_threshold !== undefined) payload.pass_threshold = Number(sysForm.pass_threshold);
    if (sysForm.work_days !== undefined) payload.work_days = Number(sysForm.work_days);
    sysConfigMutation.mutate(payload);
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const userInitials = getInitials(user?.firstName ?? '', user?.lastName ?? '');
  const roleLabel = getRoleLabel(user?.role ?? '');
  const roleBadgeClass = ROLE_BADGE_COLORS[user?.role ?? ''] ?? 'bg-muted text-muted-foreground';
  const roleDescription = ROLE_DESCRIPTIONS[user?.role ?? ''] ?? '';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Sozlamalar
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Profil, xavfsizlik va interfeys sozlamalarini boshqaring
        </p>
      </div>

      <div className="flex gap-6">
        {/* ── Sidebar Navigation ── */}
        <nav className="w-44 flex-shrink-0 space-y-1" aria-label="Sozlamalar bo'limlari">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* ── Tab Content ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* ══════════════════════ PROFIL TAB ══════════════════════ */}
          {activeTab === 'profil' && (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Profil ma'lumotlari
                  </CardTitle>
                  <CardDescription>
                    Shaxsiy ma'lumotlaringizni yangilang
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Avatar + user summary */}
                  <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-base truncate">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeClass}`}
                      >
                        <Shield className="h-3 w-3" />
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Editable fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">
                        Ism <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                        placeholder="Ali"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">
                        Familiya <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                        placeholder="Valiyev"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefon raqami</Label>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                      placeholder="+998 90 123 45 67"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email manzil</Label>
                    <Input
                      value={user?.email ?? ''}
                      disabled
                      className="opacity-60 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email manzilingizni o'zgartirish uchun administratorga murojaat qiling
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleProfileSave}
                      disabled={updateMutation.isPending}
                      className="min-w-32"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saqlanmoqda...
                        </>
                      ) : profileSaved ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Saqlandi
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Saqlash
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ══════════════════════ XAVFSIZLIK TAB ══════════════════════ */}
          {activeTab === 'xavfsizlik' && (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Parol o'zgartirish
                  </CardTitle>
                  <CardDescription>
                    Hisobingiz xavfsizligini ta'minlash uchun parolni muntazam yangilab turing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="currentPassword">
                      Joriy parol <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrent ? 'text' : 'password'}
                        className="pr-10"
                        placeholder="••••••••"
                        value={pwForm.currentPassword}
                        onChange={(e) => {
                          setPwForm((f) => ({ ...f, currentPassword: e.target.value }));
                          clearPwError('currentPassword');
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showCurrent ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                      >
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwErrors.currentPassword && (
                      <p className="text-xs text-destructive">{pwErrors.currentPassword}</p>
                    )}
                  </div>

                  <Separator />

                  {/* New password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword">
                      Yangi parol <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNew ? 'text' : 'password'}
                        className="pr-10"
                        placeholder="Kamida 8 belgi"
                        value={pwForm.newPassword}
                        onChange={(e) => {
                          setPwForm((f) => ({ ...f, newPassword: e.target.value }));
                          clearPwError('newPassword');
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showNew ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                      >
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwErrors.newPassword && (
                      <p className="text-xs text-destructive">{pwErrors.newPassword}</p>
                    )}
                    {/* Password strength hint */}
                    {pwForm.newPassword.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4].map((level) => {
                          const strength = Math.min(Math.floor(pwForm.newPassword.length / 3), 4);
                          return (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                level <= strength
                                  ? strength <= 1
                                    ? 'bg-destructive'
                                    : strength <= 2
                                    ? 'bg-orange-400'
                                    : strength <= 3
                                    ? 'bg-yellow-400'
                                    : 'bg-green-500'
                                  : 'bg-muted'
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">
                      Yangi parolni tasdiqlang <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        className="pr-10"
                        placeholder="Takrorlang"
                        value={pwForm.confirmPassword}
                        onChange={(e) => {
                          setPwForm((f) => ({ ...f, confirmPassword: e.target.value }));
                          clearPwError('confirmPassword');
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showConfirm ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {pwErrors.confirmPassword && (
                      <p className="text-xs text-destructive">{pwErrors.confirmPassword}</p>
                    )}
                    {pwForm.confirmPassword.length > 0 &&
                      pwForm.newPassword === pwForm.confirmPassword && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Parollar mos keldi
                        </p>
                      )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasswordSave}
                      disabled={pwMutation.isPending || !pwForm.currentPassword || !pwForm.newPassword}
                      className="min-w-36"
                    >
                      {pwMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saqlanmoqda...
                        </>
                      ) : pwSaved ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Yangilandi
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Parolni yangilash
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Security info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Sessiya ma'lumotlari
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: 'Foydalanuvchi', value: `${user?.firstName} ${user?.lastName}` },
                      { label: 'Email', value: user?.email ?? '—' },
                      { label: 'Rol', value: roleLabel },
                      { label: 'Access token muddati', value: '15 daqiqa' },
                      { label: 'Sessiya muddati', value: '7 kun' },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm"
                      >
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ══════════════════════ BILDIRISHNOMALAR TAB ══════════════════════ */}
          {activeTab === 'bildirishnomalar' && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Bildirishnoma sozlamalari
                </CardTitle>
                <CardDescription>
                  Qaysi kanal orqali xabar olishni sozlang
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* In-app */}
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">In-app bildirishnomalar</p>
                    <p className="text-xs text-muted-foreground">
                      Platforma ichida bildirishnomalarni ko'rsatish
                    </p>
                  </div>
                  <Switch
                    checked={notifications.inApp}
                    onCheckedChange={(val) => setNotifications((n) => ({ ...n, inApp: val }))}
                    aria-label="In-app bildirishnomalar"
                  />
                </div>

                {/* Email */}
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Email bildirishnomalar</p>
                    <p className="text-xs text-muted-foreground">
                      Muhim hodisalar haqida email orqali xabar olish
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(val) => setNotifications((n) => ({ ...n, email: val }))}
                    aria-label="Email bildirishnomalar"
                  />
                </div>

                {/* SMS */}
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">SMS bildirishnomalar</p>
                    <p className="text-xs text-muted-foreground">
                      Telefon raqamingizga SMS xabarlar yuborish
                    </p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(val) => setNotifications((n) => ({ ...n, sms: val }))}
                    aria-label="SMS bildirishnomalar"
                  />
                </div>

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground italic">
                    Sozlamalar saqlanadi (mahalliy holat)
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleNotifSave}
                    className="min-w-28"
                  >
                    {notifSaved ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Saqlandi
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Saqlash
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ══════════════════════ TIZIM TAB ══════════════════════ */}
          {activeTab === 'tizim' && isAdmin && (
            <>
              {/* Maktab ma'lumotlari */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    Maktab ma'lumotlari
                  </CardTitle>
                  <CardDescription>
                    Maktab nomi, telefon va manzil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="school_name">Maktab nomi</Label>
                    <Input
                      id="school_name"
                      value={sysForm.school_name ?? ''}
                      onChange={(e) => setSysForm((f) => ({ ...f, school_name: e.target.value }))}
                      placeholder="1-sonli umumiy o'rta ta'lim maktabi"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="school_phone">Telefon raqami</Label>
                      <Input
                        id="school_phone"
                        value={sysForm.school_phone ?? ''}
                        onChange={(e) => setSysForm((f) => ({ ...f, school_phone: e.target.value }))}
                        placeholder="+998 71 123 45 67"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="academic_year">Akademik yil</Label>
                      <Input
                        id="academic_year"
                        value={sysForm.academic_year ?? ''}
                        onChange={(e) => setSysForm((f) => ({ ...f, academic_year: e.target.value }))}
                        placeholder="2025-2026"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="school_address">Manzil</Label>
                    <Input
                      id="school_address"
                      value={sysForm.school_address ?? ''}
                      onChange={(e) => setSysForm((f) => ({ ...f, school_address: e.target.value }))}
                      placeholder="Toshkent sh., Chilonzor tumani, ..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Maosh va ta'lim sozlamalari */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    Maosh va ta'lim parametrlari
                  </CardTitle>
                  <CardDescription>
                    BHM (bazaviy hisob-kitob miqdori), o'tish bali va ish kunlari
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bhm">BHM (so'm)</Label>
                      <Input
                        id="bhm"
                        type="number"
                        min={0}
                        value={sysForm.bhm ?? ''}
                        onChange={(e) => setSysForm((f) => ({ ...f, bhm: Number(e.target.value) }))}
                        placeholder="1050000"
                      />
                      <p className="text-xs text-muted-foreground">
                        Joriy: {sysForm.bhm ? sysForm.bhm.toLocaleString('uz-UZ') + " so'm" : '—'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pass_threshold">O'tish bali (%)</Label>
                      <Input
                        id="pass_threshold"
                        type="number"
                        min={0}
                        max={100}
                        value={sysForm.pass_threshold ?? ''}
                        onChange={(e) => setSysForm((f) => ({ ...f, pass_threshold: Number(e.target.value) }))}
                        placeholder="55"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimal o'tish foizi
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="work_days">Ish kunlari / oy</Label>
                      <Input
                        id="work_days"
                        type="number"
                        min={1}
                        max={31}
                        value={sysForm.work_days ?? ''}
                        onChange={(e) => setSysForm((f) => ({ ...f, work_days: Number(e.target.value) }))}
                        placeholder="22"
                      />
                      <p className="text-xs text-muted-foreground">
                        Oylik hisob-kitob uchun
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex items-start gap-2">
                    <Settings className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                      <strong>BHM</strong> — O'zbekiston Respublikasi Hukumati tomonidan belgilanadigan bazaviy hisob-kitob miqdori.
                      2026 yil uchun standart: <strong>1 050 000 so'm</strong>. Maosh tarifi ushbu qiymat asosida hisoblanadi.
                    </p>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSysConfigSave}
                      disabled={sysConfigMutation.isPending}
                      className="min-w-36"
                    >
                      {sysConfigMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saqlanmoqda...
                        </>
                      ) : sysSaved ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Saqlandi
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Saqlash
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ══════════════════════ INTERFEYS TAB ══════════════════════ */}
          {activeTab === 'interfeys' && (
            <>
              {/* Language selector */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Til sozlamalari
                  </CardTitle>
                  <CardDescription>
                    Interfeys tilini tanlang
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="language-select">Interfeys tili</Label>
                    <Select
                      value={language}
                      onValueChange={(val) => setLanguage(val as Language)}
                    >
                      <SelectTrigger id="language-select" className="w-full sm:w-56">
                        <SelectValue placeholder="Tilni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Language.UZ}>
                          <span className="flex items-center gap-2">
                            <span>🇺🇿</span>
                            <span>O'zbekcha</span>
                          </span>
                        </SelectItem>
                        <SelectItem value={Language.RU}>
                          <span className="flex items-center gap-2">
                            <span>🇷🇺</span>
                            <span>Русский</span>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Joriy til:{' '}
                      <Badge variant="outline" className="text-xs">
                        {language === Language.UZ ? "O'zbekcha" : 'Русский'}
                      </Badge>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Theme info */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    Mavzu (Tema)
                  </CardTitle>
                  <CardDescription>
                    Qorongʻi / yorqin rejim sozlamalari
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl bg-muted/40 p-4 flex items-start gap-3">
                    <Palette className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Mavzu sarlavha panelida</p>
                      <p className="text-sm text-muted-foreground">
                        Qorongʻi va yorqin rejimni almashtirish uchun sahifaning yuqori qismidagi
                        sarlavha panelidagi mavzu tugmasidan foydalaning.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Role info */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Joriy rol
                  </CardTitle>
                  <CardDescription>
                    Sizga berilgan ruxsatlar va vakolatlar
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeClass}`}
                      >
                        <Shield className="h-3 w-3" />
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {roleDescription && (
                    <>
                      <Separator />
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {roleDescription}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
