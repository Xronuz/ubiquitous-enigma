'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2, ArrowLeft, Save, Layers, Users,
  Globe, Phone, Mail, MapPin, CheckCircle2, XCircle,
  BookOpen, CreditCard, Bell, Calendar, GraduationCap,
  Utensils, Library, Bus, Package, UserPlus, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { superAdminApi } from '@/lib/api/super-admin';
import { usersApi } from '@/lib/api/users';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const MODULE_META: Record<string, { icon: React.ElementType; label: string; description: string; category: string }> = {
  attendance:  { icon: CheckCircle2, label: 'Davomat',        description: 'Kunlik davomat belgilash va hisobotlar',          category: 'Asosiy' },
  grades:      { icon: BookOpen,     label: 'Baholar & Jurnal', description: 'Elektron jurnal, baholar va GPA hisoblash',     category: 'Asosiy' },
  schedule:    { icon: Calendar,     label: 'Dars jadvali',   description: 'Haftalik jadval va zal monitori',                 category: 'Asosiy' },
  payments:    { icon: CreditCard,   label: 'To\'lovlar',     description: 'Payme/Click integratsiyasi, qarzdorlik nazorati', category: 'Moliya' },
  notifications:{ icon: Bell,        label: 'Xabarnomalar',   description: 'SMS va push xabarnomalar',                       category: 'Asosiy' },
  homework:    { icon: GraduationCap,label: 'Vazifalar',      description: 'Uy vazifalari va topshiriqlar',                   category: 'Ta\'lim' },
  library:     { icon: Library,      label: 'Kutubxona',      description: 'Kitob katalog, berib-olish, eslatmalar',          category: 'Qo\'shimcha' },
  cafeteria:   { icon: Utensils,     label: 'Ovqatxona',      description: 'Haftalik menyu va QR hisobdan chiqarish',         category: 'Qo\'shimcha' },
  transport:   { icon: Bus,          label: 'Transport',      description: 'Avtobus marshrut va o\'quvchi tracking',          category: 'Qo\'shimcha' },
  inventory:   { icon: Package,      label: 'Inventar',       description: 'Maktab mulki va ombor boshqaruvi',                category: 'Qo\'shimcha' },
};

const CATEGORIES = ['Asosiy', 'Moliya', 'Ta\'lim', 'Qo\'shimcha'];

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'modules'>('info');
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminForm, setAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'school_admin',
  });

  const { data: school, isLoading } = useQuery({
    queryKey: ['school', id],
    queryFn: () => superAdminApi.getSchool(id),
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['school-modules', id],
    queryFn: () => superAdminApi.getModules(id),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: object) => superAdminApi.updateSchool(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', id] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setEditMode(false);
    },
  });

  const toggleModule = useMutation({
    mutationFn: ({ moduleName, isEnabled }: { moduleName: string; isEnabled: boolean }) =>
      superAdminApi.toggleModule(id, moduleName, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-modules', id] });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        firstName: adminForm.firstName,
        lastName: adminForm.lastName,
        email: adminForm.email,
        phone: adminForm.phone || undefined,
        password: adminForm.password,
        role: 'school_admin',
        schoolId: id,
      }),
    onSuccess: () => {
      toast({
        title: 'Foydalanuvchi muvaffaqiyatli yaratildi',
        description: `${adminForm.firstName} ${adminForm.lastName} maktabga qo'shildi.`,
      });
      setShowAdminDialog(false);
      setAdminForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'school_admin' });
      queryClient.invalidateQueries({ queryKey: ['school', id] });
    },
    onError: (err: any) => {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || err?.message || 'Noma\'lum xatolik yuz berdi',
        variant: 'destructive',
      });
    },
  });

  const startEdit = () => {
    setEditForm({
      name: school.name,
      address: school.address ?? '',
      phone: school.phone ?? '',
      email: school.email ?? '',
    });
    setEditMode(true);
  };

  const modulesMap = Array.isArray(modules)
    ? modules.reduce((acc: any, m: any) => ({ ...acc, [m.moduleName]: m }), {})
    : {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Maktab topilmadi</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/schools">← Orqaga</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/schools">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Orqaga
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{school.name}</h1>
              <Badge variant={school.isActive ? 'success' : 'destructive'}>
                {school.isActive ? 'Aktiv' : 'Bloklangan'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Globe className="h-3 w-3" />
              {school.slug}
              {school.createdAt && ` · Qo'shilgan: ${formatDate(school.createdAt)}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowAdminDialog(true)}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Foydalanuvchi qo\'shish
          </Button>
          <Button
            variant={school.isActive ? 'destructive' : 'default'}
            size="sm"
            onClick={() => updateMutation.mutate({ isActive: !school.isActive })}
            disabled={updateMutation.isPending}
          >
            {school.isActive ? (
              <><XCircle className="mr-1.5 h-3.5 w-3.5" />Bloklash</>
            ) : (
              <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Faollashtirish</>
            )}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{school._count?.users ?? 0}</p>
              <p className="text-xs text-muted-foreground">Foydalanuvchilar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Array.isArray(modules) ? modules.filter((m: any) => m.isEnabled).length : '—'}
              </p>
              <p className="text-xs text-muted-foreground">Aktiv modullar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold capitalize">{school.subscriptionTier ?? 'basic'}</p>
              <p className="text-xs text-muted-foreground">Obuna tarifi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['info', 'modules'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'info' ? 'Ma\'lumotlar' : 'Modullar'}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Maktab ma\'lumotlari</CardTitle>
              <CardDescription>Asosiy kontakt va manzil ma\'lumotlari</CardDescription>
            </div>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                Tahrirlash
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(false)}
                  disabled={updateMutation.isPending}
                >
                  Bekor
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate(editForm)}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <><Save className="mr-1.5 h-3.5 w-3.5" />Saqlash</>
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editMode && editForm ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Maktab nomi</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, email: e.target.value }))}
                    placeholder="info@school.uz"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Manzil</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, address: e.target.value }))}
                    placeholder="Toshkent sh., Yunusobod t."
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Building2, label: 'Maktab nomi', value: school.name },
                  { icon: Globe, label: 'Slug', value: school.slug },
                  { icon: Phone, label: 'Telefon', value: school.phone || '—' },
                  { icon: Mail, label: 'Email', value: school.email || '—' },
                  { icon: MapPin, label: 'Manzil', value: school.address || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Modules */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          {modulesLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            CATEGORIES.map((category) => {
              const catModules = Object.entries(MODULE_META).filter(
                ([, meta]) => meta.category === category,
              );
              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0">
                    {catModules.map(([name, meta]) => {
                      const mod = modulesMap[name];
                      const isEnabled = mod?.isEnabled ?? false;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Icon className={`h-4 w-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{meta.label}</p>
                              <p className="text-xs text-muted-foreground">{meta.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs ${isEnabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                              {isEnabled ? 'Yoqilgan' : 'O\'chirilgan'}
                            </span>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                toggleModule.mutate({ moduleName: name, isEnabled: checked })
                              }
                              disabled={toggleModule.isPending}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Admin qo'shish dialogi */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foydalanuvchi qo\'shish</DialogTitle>
            <DialogDescription>
              {school.name} maktabiga yangi foydalanuvchi qo\'shing. Parol tizimga kirish uchun ishlatiladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-role">Rol</Label>
              <Select
                value={adminForm.role}
                onValueChange={(value) => setAdminForm((f) => ({ ...f, role: value }))}
              >
                <SelectTrigger id="admin-role">
                  <SelectValue placeholder="Rol tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school_admin">Maktab admini</SelectItem>
                  <SelectItem value="director">Direktor</SelectItem>
                  <SelectItem value="vice_principal">O\'rinbosar</SelectItem>
                  <SelectItem value="accountant">Hisobchi</SelectItem>
                  <SelectItem value="teacher">O\'qituvchi</SelectItem>
                  <SelectItem value="class_teacher">Sinf rahbari</SelectItem>
                  <SelectItem value="librarian">Kutubxonachi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-firstName">Ism</Label>
                <Input
                  id="admin-firstName"
                  value={adminForm.firstName}
                  onChange={(e) => setAdminForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Ali"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-lastName">Familiya</Label>
                <Input
                  id="admin-lastName"
                  value={adminForm.lastName}
                  onChange={(e) => setAdminForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Valiyev"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="admin@school.uz"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-phone">Telefon</Label>
              <Input
                id="admin-phone"
                value={adminForm.phone}
                onChange={(e) => setAdminForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+998 90 123 45 67"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Parol</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Kamida 8 ta belgi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAdminDialog(false)}
              disabled={createAdminMutation.isPending}
            >
              Bekor
            </Button>
            <Button
              onClick={() => createAdminMutation.mutate()}
              disabled={
                createAdminMutation.isPending ||
                !adminForm.firstName ||
                !adminForm.lastName ||
                !adminForm.email ||
                !adminForm.password
              }
            >
              {createAdminMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-4 w-4" />
              )}
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
