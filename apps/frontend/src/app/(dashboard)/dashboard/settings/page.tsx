'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Settings, Bell, Shield, Palette, Globe, User, Save, Loader2, Eye, EyeOff, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageShell, PageHeader, PCard, Btn, DS } from '@/components/ui/page-ui';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  [UserRole.DIRECTOR]: 'Maktab bo\'yicha barcha operatsiyalarni boshqarish',
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
  [UserRole.DIRECTOR]: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
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

  const isAdmin = user?.role === UserRole.DIRECTOR || user?.role === UserRole.SUPER_ADMIN;
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
    <PageShell className="max-w-3xl">
      <PageHeader title="Sozlamalar" subtitle="Profil, xavfsizlik va interfeys sozlamalarini boshqaring" />

      <div className="flex gap-6">
        {/* ── Sidebar Navigation ── */}
        <nav className="w-44 flex-shrink-0 space-y-1" aria-label="Sozlamalar bo'limlari">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="w-full flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-200"
              style={activeTab === key
                ? { background: DS.primaryLight, color: DS.primary, boxShadow: '0 1px 4px rgba(15,123,83,0.12)' }
                : { color: DS.muted }}
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
              <PCard>
                <div className="mb-4">
                  <p className="text-[15px] font-bold" style={{ color: DS.text }}>Profil ma&apos;lumotlari</p>
                  <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>Shaxsiy ma&apos;lumotlaringizni yangilang</p>
                </div>
                <div className="space-y-5">
                  {/* Avatar + user summary */}
                  <div className="flex items-center gap-4 rounded-[16px] p-4" style={{ background: 'rgba(0,0,0,0.025)' }}>
                    <div className="h-16 w-16 rounded-[16px] flex items-center justify-center text-[20px] font-bold shrink-0"
                      style={{ background: DS.primaryLight, color: DS.primary }}>
                      {userInitials}
                    </div>
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
                    <Btn variant="primary" loading={updateMutation.isPending} onClick={handleProfileSave}
                      icon={profileSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}>
                      {profileSaved ? 'Saqlandi' : 'Saqlash'}
                    </Btn>
                  </div>
                </div>
              </PCard>
            </>
          )}

          {/* ══════════════════════ XAVFSIZLIK TAB ══════════════════════ */}
          {activeTab === 'xavfsizlik' && (
            <>
              <PCard>
                <div className="mb-4">
                  <p className="text-[15px] font-bold" style={{ color: DS.text }}>Parol o&apos;zgartirish</p>
                  <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>Hisobingiz xavfsizligini ta&apos;minlash uchun parolni muntazam yangilab turing</p>
                </div>
                <div className="space-y-4">
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
                    <Btn variant="primary" loading={pwMutation.isPending}
                      disabled={!pwForm.currentPassword || !pwForm.newPassword}
                      onClick={handlePasswordSave}
                      icon={pwSaved ? <Check className="h-4 w-4" /> : <Shield className="h-4 w-4" />}>
                      {pwSaved ? 'Yangilandi' : 'Parolni yangilash'}
                    </Btn>
                  </div>
                </div>
              </PCard>

              <PCard>
                <p className="text-[15px] font-bold mb-3" style={{ color: DS.text }}>Sessiya ma&apos;lumotlari</p>
                <div className="space-y-2">
                  {[
                    { label: 'Foydalanuvchi', value: `${user?.firstName} ${user?.lastName}` },
                    { label: 'Email', value: user?.email ?? '—' },
                    { label: 'Rol', value: roleLabel },
                    { label: 'Access token muddati', value: '15 daqiqa' },
                    { label: 'Sessiya muddati', value: '7 kun' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[13px]"
                      style={{ background: 'rgba(0,0,0,0.025)' }}>
                      <span style={{ color: DS.muted }}>{label}</span>
                      <span className="font-semibold" style={{ color: DS.text }}>{value}</span>
                    </div>
                  ))}
                </div>
              </PCard>
            </>
          )}

          {/* ══════════════════════ BILDIRISHNOMALAR TAB ══════════════════════ */}
          {activeTab === 'bildirishnomalar' && (
            <PCard>
              <div className="mb-4">
                <p className="text-[15px] font-bold" style={{ color: DS.text }}>Bildirishnoma sozlamalari</p>
                <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>Qaysi kanal orqali xabar olishni sozlang</p>
              </div>
              <div className="space-y-2">
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

                <div className="flex items-center justify-between mt-2">
                  <p className="text-[12px] italic" style={{ color: DS.muted }}>Sozlamalar saqlanadi (mahalliy holat)</p>
                  <Btn variant="primary" onClick={handleNotifSave}
                    icon={notifSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}>
                    {notifSaved ? 'Saqlandi' : 'Saqlash'}
                  </Btn>
                </div>
              </div>
            </PCard>
          )}

          {/* ══════════════════════ TIZIM TAB ══════════════════════ */}
          {activeTab === 'tizim' && isAdmin && (
            <>
              <PCard>
                <div className="mb-4">
                  <p className="text-[15px] font-bold" style={{ color: DS.text }}>Maktab ma&apos;lumotlari</p>
                  <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>Maktab nomi, telefon va manzil</p>
                </div>
                <div className="space-y-4">
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
                </div>
              </PCard>

              <PCard>
                <div className="mb-4">
                  <p className="text-[15px] font-bold" style={{ color: DS.text }}>Maosh va ta&apos;lim parametrlari</p>
                  <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>BHM (bazaviy hisob-kitob miqdori), o&apos;tish bali va ish kunlari</p>
                </div>
                <div className="space-y-4">
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
                    <Btn variant="primary" loading={sysConfigMutation.isPending} onClick={handleSysConfigSave}
                      icon={sysSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}>
                      {sysSaved ? 'Saqlandi' : 'Saqlash'}
                    </Btn>
                  </div>
                </div>
              </PCard>
            </>
          )}

          {/* ══════════════════════ INTERFEYS TAB ══════════════════════ */}
          {activeTab === 'interfeys' && (
            <>
              <PCard>
                <div className="mb-4">
                  <p className="text-[15px] font-bold" style={{ color: DS.text }}>Til sozlamalari</p>
                  <p className="text-[12px] mt-0.5" style={{ color: DS.muted }}>Interfeys tilini tanlang</p>
                </div>
                <div className="space-y-4">
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
                </div>
              </PCard>

              <PCard>
                <p className="text-[15px] font-bold mb-3" style={{ color: DS.text }}>Mavzu (Tema)</p>
                <div className="rounded-[16px] p-4 flex items-start gap-3" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <Palette className="h-5 w-5 mt-0.5 shrink-0" style={{ color: DS.muted }} />
                  <div className="space-y-1">
                    <p className="text-[14px] font-semibold" style={{ color: DS.text }}>Mavzu sarlavha panelida</p>
                    <p className="text-[13px]" style={{ color: DS.muted }}>
                      Qoron&apos;g&apos;i va yorqin rejimni almashtirish uchun sahifaning yuqori qismidagi sarlavha panelidagi mavzu tugmasidan foydalaning.
                    </p>
                  </div>
                </div>
              </PCard>

              <PCard>
                <p className="text-[15px] font-bold mb-3" style={{ color: DS.text }}>Joriy rol</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-[12px] flex items-center justify-center text-[14px] font-bold"
                    style={{ background: DS.primaryLight, color: DS.primary }}>
                    {userInitials}
                  </div>
                  <div>
                    <p className="font-semibold text-[14px]" style={{ color: DS.text }}>{user?.firstName} {user?.lastName}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadgeClass}`}>
                      <Shield className="h-3 w-3" />{roleLabel}
                    </span>
                  </div>
                </div>
                {roleDescription && (
                  <div className="rounded-[12px] p-3" style={{ background: 'rgba(0,0,0,0.025)' }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: DS.muted }}>{roleDescription}</p>
                  </div>
                )}
              </PCard>
            </>
          )}

        </div>
      </div>
    </PageShell>
  );
}
