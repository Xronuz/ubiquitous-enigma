'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Target, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { kpiApi } from '@/lib/api/kpi';
import { branchesApi } from '@/lib/api/branches';
import { useAuthStore } from '@/store/auth.store';

const CATEGORY_OPTIONS = [
  { value: 'STRATEGY', label: 'Strategiya' },
  { value: 'ACADEMIC', label: 'Akademik' },
  { value: 'TEACHER', label: "O'qituvchi" },
  { value: 'STUDENT', label: "O'quvchi" },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'FINANCE', label: 'Moliya' },
  { value: 'OPERATIONS', label: 'Operatsiya' },
  { value: 'AI_IT', label: 'AI & IT' },
  { value: 'BRANDING', label: 'Brending' },
  { value: 'MONITORING', label: 'Monitoring' },
];

const PERIOD_OPTIONS = [
  { value: 'WEEKLY', label: 'Haftalik' },
  { value: 'MONTHLY', label: 'Oylik' },
  { value: 'QUARTERLY', label: 'Choraklik' },
  { value: 'YEARLY', label: 'Yillik' },
];

const schema = z.object({
  name: z.string().min(2, 'Kamida 2 ta belgi').max(100, 'Ko\'pi bilan 100 ta belgi'),
  description: z.string().optional(),
  category: z.string().min(1, 'Kategoriya tanlanishi shart'),
  targetValue: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  period: z.string().optional(),
  branchId: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewKpiMetricPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const canManage = ['vice_principal', 'super_admin'].includes(user?.role ?? '');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Guard: only managers can create KPIs (wait for auth hydration)
  useEffect(() => {
    if (mounted && user && !canManage) {
      router.replace('/dashboard/kpi');
    }
  }, [mounted, user, canManage, router]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      targetValue: 0,
      unit: '%',
      period: 'MONTHLY',
      isActive: true,
    },
  });

  // Load branches for branch selector
  const { data: branchesData } = useQuery({
    queryKey: ['branches', user?.schoolId],
    queryFn: () => branchesApi.getAll(),
    enabled: canManage && !!user?.schoolId,
  });
  const branchesList = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];

  const mutation = useMutation({
    mutationFn: kpiApi.createMetric,
    onSuccess: () => {
      toast({ title: '✅ KPI metrika yaratildi' });
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
      router.push('/dashboard/kpi');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Xato',
        description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      name: values.name,
      description: values.description?.trim() || undefined,
      category: values.category,
      targetValue: values.targetValue,
      unit: values.unit?.trim() || undefined,
      period: values.period,
      branchId: values.branchId || undefined,
      isActive: values.isActive,
    });
  };

  // Show loading while auth store hydrates
  if (!mounted || !user) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!canManage) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/kpi">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Orqaga
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yangi KPI metrika</h1>
          <p className="text-muted-foreground">Maktab uchun kalit ko&apos;rsatkich yaratish</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Asosiy ma'lumotlar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Asosiy ma&apos;lumotlar
            </CardTitle>
            <CardDescription>KPI metrika nomi, kategoriyasi va maqsadi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nomi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Masalan: Davomat foizi"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Tavsif</Label>
              <Input
                id="description"
                placeholder="KPI maqsadi va tavsifi"
                {...register('description')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kategoriya <span className="text-destructive">*</span></Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Kategoriya tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Davr</Label>
                <Controller
                  name="period"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Davr tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maqsad va birlik */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maqsad va birlik</CardTitle>
            <CardDescription>Ko&apos;rsatkichning maqsad qiymati va o&apos;lchov birligi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="targetValue">Maqsad qiymat</Label>
                <Input
                  id="targetValue"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="95"
                  {...register('targetValue')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Birlik</Label>
                <Input
                  id="unit"
                  placeholder="%, so'm, ta, ball"
                  {...register('unit')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filial va holat */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qo'shimcha sozlamalar</CardTitle>
            <CardDescription>Filial biriktirish va holat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branchesList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Controller
                  name="branchId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filial tanlang (ixtiyoriy)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesList.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">Tanlanmasa, maktab bo&apos;yicha KPI hisoblanadi</p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Aktiv holat</Label>
                <p className="text-xs text-muted-foreground">KPI monitoring tizimida ko&apos;rinadi</p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/kpi">Bekor qilish</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="min-w-32">
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saqlanmoqda...
              </span>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Yaratish
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
