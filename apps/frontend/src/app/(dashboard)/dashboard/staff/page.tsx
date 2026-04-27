'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';

import UsersPage        from '../users/page';
import BranchesPage     from '../branches/page';
import CrmPage          from '../crm/page';
import LeaveRequestsPage from '../leave-requests/page';
import DisciplinePage   from '../discipline/page';
import MeetingsPage     from '../meetings/page';

const TABS = [
  {
    id: 'users',
    label: 'Foydalanuvchilar',
    roles: ['school_admin'],
  },
  {
    id: 'branches',
    label: 'Filiallar',
    roles: ['school_admin', 'director'],
  },
  {
    id: 'crm',
    label: 'CRM — Leadlar',
    roles: ['school_admin', 'director', 'branch_admin', 'vice_principal'],
  },
  {
    id: 'leave',
    label: "Ta'til so'rovlari",
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'],
  },
  {
    id: 'discipline',
    label: 'Intizom jurnali',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'meetings',
    label: 'Uchrashuvlar',
    roles: ['director', 'school_admin', 'vice_principal', 'class_teacher'],
  },
];

function TabFallback() {
  return (
    <div className="space-y-2">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
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
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'users';

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Xodimlar</h1>
        <p className="text-sm text-muted-foreground">Foydalanuvchilar, filiallar, CRM va boshqaruv</p>
      </div>

      <div className="mt-4">
        <SectionTabs tabs={TABS} defaultTab="users" />
      </div>

      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function StaffPage() {
  return (
    <Suspense>
      <StaffContent />
    </Suspense>
  );
}
