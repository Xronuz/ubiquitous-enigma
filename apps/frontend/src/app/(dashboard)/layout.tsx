'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

function RealtimeProvider() {
  useRealtimeNotifications();
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((p) => !p);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const h = () => setCommandOpen(true);
    document.addEventListener('open-command-palette', h);
    return () => document.removeEventListener('open-command-palette', h);
  }, []);

  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f5f1]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <HeaderActionsProvider>
      {/*
        Island UI — mayin yashil kanvas ustida 3 ta mustaqil orolcha:
          1. Sidebar island   (chapda, o'z m-4 rounded-3xl bilan)
          2. Header island    (o'ng ustida, m-4 rounded-3xl bilan)
          3. Main content     (shaffof, ramkasiz — faqat ichki card'lar glass)
      */}
      <div className="flex h-screen overflow-hidden bg-[#f0f5f1] dark:bg-[#0a0f0a]">
        <RealtimeProvider />

        {/* ── Sidebar island ──────────────────────────────────────────────── */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* ── Right column: header island + transparent content ───────────── */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

          {/* Header island */}
          <div className="shrink-0 px-4 pt-4 pb-3">
            <Header />
          </div>

          {/* Main content — shaffof, ramkasiz, faqat ichki card'lar glass */}
          <main
            className="flex-1 overflow-y-auto px-4 pb-4"
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
