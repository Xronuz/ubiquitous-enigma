'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, FileDown } from 'lucide-react';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { usePageActions } from '@/lib/header-actions-context';

import AttendancePage from '../attendance/page';
import GradesPage     from '../grades/page';
import ExamsPage      from '../exams/page';
import HomeworkPage   from '../homework/page';

const TABS = [
  { id: 'attendance', label: 'Davomat',      roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { id: 'grades',     label: 'Baholar',      roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { id: 'exams',      label: 'Imtihonlar',   roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { id: 'homework',   label: 'Uy vazifalari',roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
];

const TAB_ACTIONS: Record<string, React.ReactNode> = {
  grades: (
    <Button size="sm" variant="outline" onClick={() => document.dispatchEvent(new CustomEvent('grades:export'))}>
      <FileDown className="h-4 w-4" /> Excel
    </Button>
  ),
  exams: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('exams:open-add'))}>
      <Plus className="h-4 w-4" /> Imtihon qo&apos;shish
    </Button>
  ),
  homework: (
    <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('homework:open-add'))}>
      <Plus className="h-4 w-4" /> Vazifa qo&apos;shish
    </Button>
  ),
};

function TabFallback() {
  return (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
    </div>
  );
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'grades':   return <GradesPage />;
    case 'exams':    return <ExamsPage />;
    case 'homework': return <HomeworkPage />;
    default:         return <AttendancePage />;
  }
}

function StudentsContent() {
  const searchParams   = useSearchParams();
  const tab            = searchParams.get('tab') ?? 'attendance';
  const { setActions } = usePageActions();

  useEffect(() => {
    setActions(TAB_ACTIONS[tab] ?? null);
    return () => setActions(null);
  }, [tab, setActions]);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold text-foreground">O&apos;quvchilar</h1>
        <p className="text-sm text-muted-foreground">Davomat, baholar, imtihonlar va uy vazifalari</p>
      </div>
      <div className="mt-3">
        <SectionTabs tabs={TABS} defaultTab="attendance" />
      </div>
      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function StudentsPage() {
  return <Suspense><StudentsContent /></Suspense>;
}
