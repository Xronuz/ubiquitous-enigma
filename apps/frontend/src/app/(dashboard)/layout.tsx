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
      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <div className="flex h-screen bg-[#f0f5f1] dark:bg-[#0a0f0a] overflow-hidden">
        <RealtimeProvider />

        {/* ── Sidebar capsule ─────────────────────────────────────────────── */}
        <div className="hidden md:block shrink-0">
          <Sidebar />
        </div>

        {/* ── Main capsule ────────────────────────────────────────────────── */}
        <div
          className="flex flex-1 min-w-0 flex-col my-4 mr-4 overflow-hidden rounded-3xl"
          style={{
            background: 'rgba(255,255,255,0.62)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.82)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.9) inset',
          }}
        >
          <Header />

          {/* Content area — click collapses sidebar */}
          <main
            className="flex-1 overflow-y-auto px-5 pt-2 pb-6"
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
