'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, UserPlus } from 'lucide-react';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePageActions } from '@/lib/header-actions-context';
import { useAuthStore } from '@/store/auth.store';

import UsersPage         from '../users/page';
import BranchesPage      from '../branches/page';
import CrmPage           from '../crm/page';
import LeaveRequestsPage from '../leave-requests/page';
import DisciplinePage    from '../discipline/page';
import MeetingsPage      from '../meetings/page';

const TABS = [
  { id: 'users',      label: 'Foydalanuvchilar', roles: ['director'] },
  { id: 'branches',   label: 'Filiallar',         roles: ['director'] },
  { id: 'crm',        label: 'CRM — Leadlar',     roles: ['director', 'branch_admin', 'vice_principal'] },
  { id: 'leave',      label: "Ta'til so'rovlari", roles: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { id: 'discipline', label: 'Intizom jurnali',   roles: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'] },
  { id: 'meetings',   label: 'Uchrashuvlar',      roles: ['director', 'vice_principal', 'class_teacher'] },
];

const TAB_ACTIONS: Record<string, React.ReactNode> = {
  users: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('users:open-add'))}>
      <UserPlus className="h-4 w-4" /> Foydalanuvchi qo&apos;shish
    </Button>
  ),
  branches: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('branches:open-add'))}>
      <Plus className="h-4 w-4" /> Filial qo&apos;shish
    </Button>
  ),
  crm: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('crm:open-add'))}>
      <Plus className="h-4 w-4" /> Lead qo&apos;shish
    </Button>
  ),
  meetings: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('meetings:open-add'))}>
      <Plus className="h-4 w-4" /> Uchrashuv qo&apos;shish
    </Button>
  ),
};

function TabFallback() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
    </div>
  );
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'branches':   return <BranchesPage />;
    case 'crm':        return <CrmPage />;
    case 'leave':      return <LeaveRequestsPage />;
    case 'discipline': return <DisciplinePage />;
    case 'meetings':   return <MeetingsPage />;
    default:           return <UsersPage />;
  }
}

function StaffContent() {
  const searchParams   = useSearchParams();
  const { user }       = useAuthStore();
  const { setActions } = usePageActions();

  // Compute first accessible tab for this role (fallback when no ?tab= param)
  const firstVisibleTab = TABS.find(t =>
    !t.roles || t.roles.includes(user?.role ?? ''),
  )?.id ?? 'branches';
  const tab = searchParams.get('tab') ?? firstVisibleTab;

  useEffect(() => {
    setActions(TAB_ACTIONS[tab] ?? null);
    return () => setActions(null);
  }, [tab, setActions]);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-foreground">Xodimlar</h1>
        <p className="text-sm text-muted-foreground">Foydalanuvchilar, filiallar, CRM va boshqaruv</p>
      </div>
      <div className="mt-3">
        <SectionTabs tabs={TABS} defaultTab={firstVisibleTab} />
      </div>
      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function StaffPage() {
  return <Suspense><StaffContent /></Suspense>;
}
