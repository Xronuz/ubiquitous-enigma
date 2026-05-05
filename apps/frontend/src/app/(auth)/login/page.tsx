'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth';
import { useToast } from '@/components/ui/use-toast';

const loginSchema = z.object({
  email: z.string().email("Email noto'g'ri formatda"),
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const [loginError, setLoginError] = useState('');

  const onSubmit = async (data: LoginForm) => {
    setLoginError('');
    try {
      const result = await authApi.login(data);
      setAuth(result.user, result.tokens);
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Tizimga kirishda xato yuz berdi';
      setLoginError(typeof msg === 'string' ? msg : 'Email yoki parol noto\'g\'ri');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(210,20%,98%)] dark:bg-[hsl(222,47%,5%)]">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[400px] animate-fade-up">
        {/* Logo bar */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/xedu-logo-social.png"
            alt="Xedu"
            width={200}
            height={200}
            className="object-contain mix-blend-multiply dark:mix-blend-normal"
            priority
          />
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Tizimga kirish</CardTitle>
            <CardDescription>Hisobingiz ma'lumotlarini kiriting</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {loginError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
                  <span className="shrink-0 mt-px">⚠</span>
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.uz"
                  autoComplete="email"
                  className="h-10"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium">Parol</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-10 pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
                )}
              </div>

              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Parolni unutdingizmi?
                </a>
              </div>

              <Button type="submit" className="w-full h-10 font-semibold" disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Kirish...
                  </>
                ) : (
                  'Kirish →'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} EduPlatform. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}
