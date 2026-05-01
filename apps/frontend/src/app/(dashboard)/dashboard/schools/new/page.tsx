'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { superAdminApi } from '@/lib/api/super-admin';

const TIERS = [
  {
    value: 'basic',
    label: 'Basic',
    price: 'Bepul',
    description: 'Kichik maktablar uchun',
    color: 'border-gray-300',
    features: ['50 ta foydalanuvchi', 'Asosiy modullar', 'Email qo\'llab-quvvatlash'],
  },
  {
    value: 'standard',
    label: 'Standard',
    price: '299,000 so\'m/oy',
    description: 'O\'rta maktablar uchun',
    color: 'border-blue-400',
    features: ['200 ta foydalanuvchi', 'To\'lov moduli', 'SMS xabarnomalar', 'Hisobotlar'],
  },
  {
    value: 'premium',
    label: 'Premium',
    price: '599,000 so\'m/oy',
    description: 'Katta maktablar uchun',
    color: 'border-violet-500',
    features: ['Cheksiz foydalanuvchi', 'Barcha modullar', 'API kirish', 'Maxsus qo\'llab-quvvatlash'],
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    price: 'Kelishuv asosida',
    description: 'Maktablar tarmog\'i uchun',
    color: 'border-amber-400',
    features: ['Ko\'p filial', 'White-label', 'SLA kafolati', 'Maxsus integratsiya'],
  },
];

export default function NewSchoolPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
    email: '',
    subscriptionTier: 'standard',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: superAdminApi.createSchool,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'stats'] });
      router.push(`/dashboard/schools/${data.id}`);
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      const status = err?.response?.status;
      // 409 Conflict = slug taken
      if (status === 409) {
        setErrors({ slug: 'Bu slug allaqachon band, boshqasini tanlang' });
        return;
      }
      const msg = typeof data?.message === 'string' ? data.message : JSON.stringify(data?.message ?? 'Xatolik yuz berdi');
      setErrors({ _form: msg });
    },
  });

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 50);
    setForm((f) => ({ ...f, name, slug }));
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Maktab nomi majburiy';
    if (!form.slug.trim()) e.slug = 'Slug majburiy';
    if (!/^[a-z0-9-]+$/.test(form.slug)) e.slug = 'Slug faqat kichik harf, raqam va defis bo\'lishi kerak';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email noto\'g\'ri';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    // Remove empty strings so backend @IsOptional() works correctly
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '')
    ) as typeof form;
    mutation.mutate(payload);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/schools">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Orqaga
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yangi maktab qo'shish</h1>
          <p className="text-muted-foreground">Platformga yangi maktab onboarding qilish</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Asosiy ma'lumotlar
            </CardTitle>
            <CardDescription>Maktab haqida asosiy ma'lumotlarni kiriting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors._form && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
                {errors._form}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  Maktab nomi <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Masalan: Najot ta'lim markazi"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">
                  Slug (URL) <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center">
                  <span className="flex h-9 items-center rounded-l-md border border-r-0 bg-muted px-3 text-xs text-muted-foreground">
                    eduplatform.uz/
                  </span>
                  <Input
                    id="slug"
                    placeholder="najot-talim"
                    value={form.slug}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, slug: e.target.value }));
                      setErrors({});
                    }}
                    className={`rounded-l-none ${errors.slug ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@school.uz"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-1 col-span-3">
                <Label htmlFor="address">Manzil</Label>
                <Input
                  id="address"
                  placeholder="Toshkent sh., Yunusobod t."
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Obuna tarifi</CardTitle>
            <CardDescription>Maktab uchun mos tarifni tanlang</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {TIERS.map((tier) => (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, subscriptionTier: tier.value }))}
                  className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all hover:bg-accent ${
                    form.subscriptionTier === tier.value
                      ? `${tier.color} bg-accent`
                      : 'border-border'
                  }`}
                >
                  {form.subscriptionTier === tier.value && (
                    <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{tier.label}</span>
                    <Badge variant="secondary" className="text-xs">{tier.price}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                  <ul className="space-y-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/schools">Bekor qilish</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="min-w-32">
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saqlanmoqda...
              </span>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Maktab yaratish
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
