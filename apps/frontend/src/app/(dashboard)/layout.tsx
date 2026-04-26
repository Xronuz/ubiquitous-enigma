'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav';
import { MobileFab } from '@/components/layout/mobile-fab';
import { useAuthStore } from '@/store/auth.store';
import { PageErrorBoundary } from '@/components/providers/error-boundary';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { CommandPalette } from '@/components/command-palette';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

function RealtimeProvider() {
  useRealtimeNotifications();
  return null;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handler = () => setCommandOpen(true);
    document.addEventListener('open-command-palette', handler);
    return () => document.removeEventListener('open-command-palette', handler);
  }, []);

  // Wait for store hydration before deciding to redirect or render
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    // ── App shell — slate-100 canvas so shadows/glass pop visually ──
    <div className="flex h-screen overflow-hidden bg-[#EEF0F6] dark:bg-slate-950">
      <RealtimeProvider />
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <BreadcrumbNav />
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <ConfirmDialog />
      <MobileFab />
    </div>
  );
}
