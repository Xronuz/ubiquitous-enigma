'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SectionTabs } from '@/components/layout/section-tabs';
import { Skeleton } from '@/components/ui/skeleton';

import AttendancePage from '../attendance/page';
import GradesPage     from '../grades/page';
import ExamsPage      from '../exams/page';
import HomeworkPage   from '../homework/page';

const TABS = [
  {
    id: 'attendance',
    label: 'Davomat',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'grades',
    label: 'Baholar',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'exams',
    label: 'Imtihonlar',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    id: 'homework',
    label: 'Uy vazifalari',
    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
];

function TabFallback() {
  return (
    <div className="space-y-2">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
    </div>
  );
}

function TabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'grades':    return <GradesPage />;
    case 'exams':     return <ExamsPage />;
    case 'homework':  return <HomeworkPage />;
    default:          return <AttendancePage />;
  }
}

function StudentsContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'attendance';

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-[#1e293b] dark:text-white">O&apos;quvchilar</h1>
        <p className="text-sm text-muted-foreground">Davomat, baholar, imtihonlar va uy vazifalari</p>
      </div>

      <div className="mt-4">
        <SectionTabs tabs={TABS} defaultTab="attendance" />
      </div>

      <Suspense fallback={<TabFallback />}>
        <TabContent tab={tab} />
      </Suspense>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsContent />
    </Suspense>
  );
}
