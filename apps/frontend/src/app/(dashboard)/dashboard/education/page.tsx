'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';

import ClassesPage          from '../classes/page';
import SchedulePage         from '../schedule/page';
import AcademicCalendarPage from '../academic-calendar/page';
import SubjectsPage         from '../subjects/page';

const TABS = [
  {
    id: 'classes',
    label: 'Sinflar',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'schedule',
    label: 'Dars jadvali',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'calendar',
    label: 'Akademik kalendar',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'subjects',
    label: 'Fanlar',
    roles: ['school_admin', 'vice_principal'],
  },
];

function TabFallback() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'schedule':  return <SchedulePage />;
    case 'calendar':  return <AcademicCalendarPage />;
    case 'subjects':  return <SubjectsPage />;
    default:          return <ClassesPage />;
  }
}

function EducationContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'classes';

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">Ta&apos;lim</h1>
        <p className="text-sm text-muted-foreground">Sinflar, dars jadvali va akademik rejalar</p>
      </div>

      <div className="mt-4">
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
