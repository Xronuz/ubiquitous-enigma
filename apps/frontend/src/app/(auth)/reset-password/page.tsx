'use client';

import { useState, Suspense } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';

// ── Password strength indicator ───────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const strength = Math.min(Math.floor(password.length / 3), 4);
  const labels = ['', 'Juda zaif', 'Zaif', 'O\'rtacha', 'Kuchli'];
  const colors = ['', 'bg-destructive', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className={`h-1 flex-1 rounded-full transition-colors ${l <= strength ? colors[strength] : 'bg-muted'}`}
          />
        ))}
      </div>
      {strength > 0 && (
        <p className={`text-xs ${strength <= 1 ? 'text-destructive' : strength <= 2 ? 'text-orange-500' : strength <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
          {labels[strength]}
        </p>
      )}
    </div>
  );
}

// ── Inner component (uses useSearchParams inside Suspense) ────────────────────
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: () => {
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setErrors({ api: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (password.length < 8) e.password = 'Parol kamida 8 belgi bo\'lishi kerak';
    if (password !== confirm) e.confirm = 'Parollar mos kelmadi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setErrors({ api: 'Token topilmadi. Havolani qayta tekshiring.' }); return; }
    if (!validate()) return;
    mutation.mutate();
  };

  if (!token) {
    return (
      <div className="rounded-2xl border bg-card shadow-sm p-6 text-center space-y-3">
        <KeyRound className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
        <p className="font-semibold">Token topilmadi</p>
        <p className="text-sm text-muted-foreground">
          Parol tiklash havolasi noto'g'ri yoki muddati o'tgan.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block mt-2 text-sm text-primary hover:underline font-medium"
        >
          Yangi havola so'rash
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border bg-card shadow-sm p-6 text-center space-y-4 py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">Parol muvaffaqiyatli yangilandi!</p>
          <p className="text-sm text-muted-foreground">
            3 soniyada kirish sahifasiga yo'naltirilasiz...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Yangi parol <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => { const n = {...p}; delete n.password; return n; }); }}
              placeholder="Kamida 8 belgi"
              className="w-full pl-10 pr-10 h-10 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPw ? 'Yashirish' : 'Ko\'rsatish'}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium">
            Parolni tasdiqlang <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="confirm"
              type={showCf ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setErrors((p) => { const n = {...p}; delete n.confirm; return n; }); }}
              placeholder="Takrorlang"
              className={`w-full pl-10 pr-10 h-10 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow ${
                confirm && password === confirm ? 'border-green-500 focus:ring-green-400/40' : ''
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCf((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCf ? 'Yashirish' : 'Ko\'rsatish'}
            >
              {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirm && password === confirm && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Parollar mos keldi
            </p>
          )}
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
        </div>

        {errors.api && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
            {errors.api}
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saqlanmoqda...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Parolni yangilash
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Yangi parol o'rnatish</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kamida 8 ta belgi bo'lsin
          </p>
        </div>

        <Suspense fallback={
          <div className="rounded-2xl border bg-card shadow-sm p-6 text-center text-muted-foreground text-sm">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Yuklanmoqda...
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>

        <div className="text-center mt-5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kirish sahifasiga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
