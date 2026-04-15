'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, ArrowLeft, Loader2, CheckCircle2, Send } from 'lucide-react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim()),
    onSuccess: () => {
      setSent(true);
      setError('');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email manzil kiritilishi shart'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email manzil noto\'g\'ri formatda'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/40 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Parolni tiklash</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Email manzilingizni kiriting
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-5">
          {sent ? (
            /* ── Success state ── */
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold">Xabar yuborildi</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{email}</span> manziliga
                  parol tiklash havolasi yuborildi. Iltimos pochta qutingizni tekshiring.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Xabar kelmadimi?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => { setSent(false); }}
                >
                  Qayta yuborish
                </button>
              </p>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Email manzil
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="siz@example.com"
                    className="w-full pl-10 pr-4 h-10 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  />
                </div>
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yuborilmoqda...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Tiklash havolasini yuborish
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Back to login */}
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
