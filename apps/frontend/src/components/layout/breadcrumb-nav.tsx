'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

// Map of path segments → Uzbek labels
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Foydalanuvchilar',
  classes: 'Sinflar',
  schedule: 'Dars jadvali',
  subjects: 'Fanlar',
  attendance: 'Davomat',
  grades: 'Baholar',
  quarterly: 'Choraklik',
  exams: 'Imtihonlar',
  homework: 'Uy vazifalari',
  payments: 'To\'lovlar',
  payroll: 'Maosh tizimi',
  reports: 'Hisobotlar',
  library: 'Kutubxona',
  messages: 'Xabarlar',
  notifications: 'Bildirishnomalar',
  'leave-requests': 'Ta\'til so\'rovlari',
  schools: 'Maktablar',
  profile: 'Profil',
  settings: 'Sozlamalar',
  student: 'O\'quvchi portali',
  parent: 'Ota-ona portali',
  'academic-calendar': 'Akademik kalendar',
  canteen: 'Oshxona',
  'learning-center': 'O\'quv markazi',
  transport: 'Transport',
  discipline: 'Intizom jurnali',
  meetings: 'Ota-ona uchrashuvlari',
  'fee-structures': 'To\'lov tartiblari',
  'audit-log': 'Audit Log',
  workload: 'Ish yuklamasi',
  new: 'Yangi',
  edit: 'Tahrirlash',
};

function getLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  // UUID or numeric id — show "Batafsil"
  if (/^[0-9a-f-]{20,}$/i.test(segment)) return 'Batafsil';
  if (/^\d+$/.test(segment)) return `#${segment}`;
  // Capitalize otherwise
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
}

export function BreadcrumbNav() {
  const pathname = usePathname();

  // Split and build crumbs
  const segments = pathname.split('/').filter(Boolean);

  // Skip breadcrumb for dashboard root (single crumb isn't useful)
  if (segments.length <= 1) return null;

  interface Crumb {
    label: string;
    href: string;
  }

  const crumbs: Crumb[] = segments.map((seg, idx) => ({
    label: getLabel(seg),
    href: '/' + segments.slice(0, idx + 1).join('/'),
  }));

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm mb-5 flex-wrap"
    >
      <Link
        href="/dashboard"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-pill text-slate-500 hover:text-slate-900 hover:shadow-md transition-all dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <Home className="h-3.5 w-3.5 shrink-0" />
      </Link>
      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
            {isLast ? (
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[220px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors truncate max-w-[140px]"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
