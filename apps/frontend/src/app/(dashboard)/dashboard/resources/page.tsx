'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';

import LibraryPage       from '../library/page';
import LearningCenterPage from '../learning-center/page';
import ClubsPage         from '../clubs/page';
import CoinsPage         from '../coins/page';
import CanteenPage       from '../canteen/page';
import TransportPage     from '../transport/page';

const TABS = [
  {
    id: 'library',
    label: 'Kutubxona',
    roles: ['director', 'vice_principal', 'librarian'],
  },
  {
    id: 'learning',
    label: "O'quv markazi",
    roles: ['director', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'clubs',
    label: "To'garaklar",
    roles: ['director', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'coins',
    label: 'EduCoin',
    roles: ['director', 'vice_principal'],
  },
  {
    id: 'canteen',
    label: 'Oshxona',
    roles: ['director', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'transport',
    label: 'Transport',
    roles: ['director', 'vice_principal'],
  },
];

function TabFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
    </div>
  );
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'learning':  return <LearningCenterPage />;
    case 'clubs':     return <ClubsPage />;
    case 'coins':     return <CoinsPage />;
    case 'canteen':   return <CanteenPage />;
    case 'transport': return <TransportPage />;
    default:          return <LibraryPage />;
  }
}

function ResourcesContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'library';

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-foreground">Resurslar</h1>
        <p className="text-sm text-muted-foreground">Kutubxona, o&apos;quv markazi, EduCoin va boshqalar</p>
      </div>

      <div className="mt-4">
        <SectionTabs tabs={TABS} defaultTab="library" />
      </div>

      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Suspense>
      <ResourcesContent />
    </Suspense>
  );
}
