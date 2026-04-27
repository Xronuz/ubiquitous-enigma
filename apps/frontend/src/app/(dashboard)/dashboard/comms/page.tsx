'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';

import MessagesPage       from '../messages/page';
import NotificationsPage  from '../notifications/page';
import AnnouncementsPage  from '../announcements/page';

const TABS = [
  {
    id: 'messages',
    label: 'Xabarlar',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'parent', 'student'],
  },
  {
    id: 'notifications',
    label: 'Bildirishnomalar',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'parent', 'student'],
  },
  {
    id: 'announcements',
    label: 'E\'lonlar',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
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
    case 'notifications':  return <NotificationsPage />;
    case 'announcements':  return <AnnouncementsPage />;
    default:               return <MessagesPage />;
  }
}

function CommsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'messages';

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Kommunikatsiya</h1>
        <p className="text-sm text-muted-foreground">Xabarlar, bildirishnomalar va e&apos;lonlar</p>
      </div>

      <div className="mt-4">
        <SectionTabs tabs={TABS} defaultTab="messages" />
      </div>

      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function CommsPage() {
  return (
    <Suspense>
      <CommsContent />
    </Suspense>
  );
}
