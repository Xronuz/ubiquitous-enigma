'use client';

import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { MobileFab } from '@/components/layout/mobile-fab';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { PageErrorBoundary } from '@/components/providers/error-boundary';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { CommandPalette } from '@/components/command-palette';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { HeaderActionsProvider } from '@/lib/header-actions-context';
import { useRoleGuard } from '@/components/auth/role-guard';
import { authApi } from '@/lib/api/auth';

function RealtimeProvider() {
  useRealtimeNotifications();
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated, restoreAuth } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [commandOpen, setCommandOpen] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const recoveryAttempted = useRef(false);

  // Role-based route guard — har bir dashboard route'da tekshiradi
  useRoleGuard();

  // Session recovery: zustand cleared lekin server cookie hali valid bo'lsa re-sync qiladi.
  // Faqat sahifa yangilanishida ishlashi kerak, LOGOUT dan keyin EMAS.
  useEffect(() => {
    if (!_hasHydrated) return;
    if (isAuthenticated) {
      // Foydalanuvchi allaqachon autentifikatsiyadan o'tgan.
      // Flagni true qilamiz: logout isAuthenticated-ni false qilganda bu effect
      // session recovery'ni qayta ishga tushirmasin.
      recoveryAttempted.current = true;
      return;
    }
    if (recoveryAttempted.current) return;
    recoveryAttempted.current = true;
    setIsRecovering(true);
    authApi.me()
      .then((meData) => {
        restoreAuth({
          id: meData.id,
          email: meData.email,
          firstName: meData.firstName,
          lastName: meData.lastName,
          role: meData.role,
          schoolId: meData.schoolId ?? null,
          branchId: null,
        });
      })
      .catch(() => {
        // Cookie ham yo'q — login sahifasiga yuboramiz (to'liq reload, middleware orqali)
        window.location.href = '/login';
      })
      .finally(() => setIsRecovering(false));
  }, [_hasHydrated, isAuthenticated, restoreAuth]);

  // bfcache fix: Chrome back-forward cache sahifani qayta ko'rsatganda
  // React effectlari qayta ishlamaydi, shuning uchun pageshow orqali tekshiramiz.
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !useAuthStore.getState().isAuthenticated) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCommandOpen(p => !p); }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const h = () => setCommandOpen(true);
    document.addEventListener('open-command-palette', h);
    return () => document.removeEventListener('open-command-palette', h);
  }, []);

  if (!_hasHydrated || isRecovering) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8faf8]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <HeaderActionsProvider>
      {/*
        Modern Bento Box:
        bg-[#f8faf8] + p-3 gap-3 = yaxlit, ixcham, tartibli
        ┌──────────┬────────────────────────────┐
        │ Sidebar  │ Header                     │  <- yagona chiziqda
        │ rounded  ├────────────────────────────│
        │          │ Main content (transparent) │
        └──────────┴────────────────────────────┘
      */}
      <div className="flex h-screen bg-[#F7F8F8] dark:bg-[#0d1117] p-3 gap-3 overflow-hidden">
        <RealtimeProvider />

        {/* Sidebar bento panel */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* O'ng ustun: header + content */}
        <div className="flex flex-1 min-w-0 flex-col gap-3 overflow-hidden">

          {/* Header panel */}
          <Header />

          {/* Transparent content — ramka yo'q, faqat ichki card'lar styled */}
          <main
            className="flex-1 min-h-0 overflow-y-auto"
            onClick={() => { if (!sidebarCollapsed) setSidebarCollapsed(true); }}
          >
            <BreadcrumbNav />
            <PageErrorBoundary>{children}</PageErrorBoundary>
          </main>
        </div>

        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <ConfirmDialog />
        <MobileFab />
      </div>
    </HeaderActionsProvider>
  );
}
