'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageActions } from '@/lib/header-actions-context';

import ClassesPage          from '../classes/page';
import SchedulePage         from '../schedule/page';
import AcademicCalendarPage from '../academic-calendar/page';
import SubjectsPage         from '../subjects/page';

const TABS = [
  { id: 'classes',  label: 'Sinflar',          roles: ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'] },
  { id: 'schedule', label: 'Dars jadvali',      roles: ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'] },
  { id: 'calendar', label: 'Akademik kalendar', roles: ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'] },
  { id: 'subjects', label: 'Fanlar',            roles: ['director', 'vice_principal', 'branch_admin'] },
];

// Har bir child page o'z tugmasini o'z ichida ushlab turadi (TAB_ACTIONS olib tashlandi)

function TabFallback() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
    </div>
  );
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'schedule': return <SchedulePage />;
    case 'calendar': return <AcademicCalendarPage />;
    case 'subjects': return <SubjectsPage />;
    default:         return <ClassesPage />;
  }
}

function EducationContent() {
  const searchParams   = useSearchParams();
  const tab            = searchParams.get('tab') ?? 'classes';
  const { setActions } = usePageActions();

  // Header actions har bir child page o'zida
  useEffect(() => {
    setActions(null);
  }, [setActions]);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-foreground">Ta&apos;lim</h1>
        <p className="text-sm text-muted-foreground">Sinflar, dars jadvali va akademik rejalar</p>
      </div>

      <div className="mt-3">
        <SectionTabs tabs={TABS} defaultTab="classes" />
      </div>

      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function EducationPage() {
  return (
    <Suspense>
      <EducationContent />
    </Suspense>
  );
}
