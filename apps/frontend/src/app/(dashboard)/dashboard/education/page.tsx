'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, CalendarDays, BookOpen } from 'lucide-react';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePageActions } from '@/lib/header-actions-context';

import ClassesPage          from '../classes/page';
import SchedulePage         from '../schedule/page';
import AcademicCalendarPage from '../academic-calendar/page';
import SubjectsPage         from '../subjects/page';

const TABS = [
  { id: 'classes',  label: 'Sinflar',          roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { id: 'schedule', label: 'Dars jadvali',      roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { id: 'calendar', label: 'Akademik kalendar', roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { id: 'subjects', label: 'Fanlar',            roles: ['director', 'school_admin', 'vice_principal'] },
];

// Per-tab header actions (dispatches custom events — each child page listens)
const TAB_ACTIONS: Record<string, React.ReactNode> = {
  classes: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('classes:open-add'))}>
      <Plus className="h-4 w-4" /> Sinf qo&apos;shish
    </Button>
  ),
  schedule: (
    <Button size="sm" variant="outline" onClick={() => document.dispatchEvent(new CustomEvent('schedule:open-add'))}>
      <CalendarDays className="h-4 w-4" /> Dars qo&apos;shish
    </Button>
  ),
  subjects: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('subjects:open-add'))}>
      <BookOpen className="h-4 w-4" /> Fan qo&apos;shish
    </Button>
  ),
};

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

  // Inject primary CTA into navbar based on active tab
  useEffect(() => {
    setActions(TAB_ACTIONS[tab] ?? null);
    return () => setActions(null);
  }, [tab, setActions]);

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
