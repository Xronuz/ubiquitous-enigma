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

  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f4f7f4]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <HeaderActionsProvider>
      {/*
        Island UI kanvasi:
        ┌─────────────────────────────────────────────────────┐
        │  bg-[#f4f7f4]  (ochiq yashil-kulrang kanvas)        │
        │                                                     │
        │  [Sidebar island]  [Header island        ]          │
        │  (m-4 rounded-3xl) (mt-4 mx-4 rounded-3xl)         │
        │                    [Shaffof kontent oyna ]          │
        │                    (card'lar glass, wrapper yo'q)   │
        └─────────────────────────────────────────────────────┘

        ⚠️  Root div da overflow-hidden YO'Q — orolchalar soyasi ko'rinadi.
            overflow-hidden faqat ichki kontent ustuniga berilgan.
      */}
      <div className="flex h-screen bg-[#f4f7f4] dark:bg-[#0a0f0a]">
        <RealtimeProvider />

        {/* ── Sidebar island — root farzandi, soyasi to'liq ko'rinadi ──── */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* ── O'ng ustun: header + kontent ────────────────────────────── */}
        {/* overflow-hidden faqat shu ustun ichida — sidebar soyasiga ta'sir etmaydi */}
        <div className="flex flex-1 min-w-0 flex-col overflow-hidden">

          {/* Header island: mt-4 mx-4 — kanvasdan ajralib turadi */}
          <div className="shrink-0 mt-4 mx-4">
            <Header />
          </div>

          {/* Shaffof kontent oyna — ramkasiz, fonsiz */}
          <main
            className="flex-1 overflow-y-auto px-4 pt-3 pb-4 min-h-0"
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
