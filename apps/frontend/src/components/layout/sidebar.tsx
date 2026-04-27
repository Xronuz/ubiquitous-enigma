'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Users, TrendingUp,
  Briefcase, Package, MessageSquare,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';

const SECTION_MAP: Record<string, string> = {
  '/dashboard/education':         '/dashboard/education',
  '/dashboard/classes':           '/dashboard/education',
  '/dashboard/schedule':          '/dashboard/education',
  '/dashboard/academic-calendar': '/dashboard/education',
  '/dashboard/subjects':          '/dashboard/education',
  '/dashboard/my-class':          '/dashboard/education',
  '/dashboard/students':          '/dashboard/students',
  '/dashboard/attendance':        '/dashboard/students',
  '/dashboard/grades':            '/dashboard/students',
  '/dashboard/exams':             '/dashboard/students',
  '/dashboard/homework':          '/dashboard/students',
  '/dashboard/finance':           '/dashboard/finance',
  '/dashboard/payments':          '/dashboard/finance',
  '/dashboard/fee-structures':    '/dashboard/finance',
  '/dashboard/payroll':           '/dashboard/finance',
  '/dashboard/reports':           '/dashboard/finance',
  '/dashboard/staff':             '/dashboard/staff',
  '/dashboard/users':             '/dashboard/staff',
  '/dashboard/branches':          '/dashboard/staff',
  '/dashboard/crm':               '/dashboard/staff',
  '/dashboard/leave-requests':    '/dashboard/staff',
  '/dashboard/discipline':        '/dashboard/staff',
  '/dashboard/meetings':          '/dashboard/staff',
  '/dashboard/resources':         '/dashboard/resources',
  '/dashboard/library':           '/dashboard/resources',
  '/dashboard/learning-center':   '/dashboard/resources',
  '/dashboard/clubs':             '/dashboard/resources',
  '/dashboard/coins':             '/dashboard/resources',
  '/dashboard/canteen':           '/dashboard/resources',
  '/dashboard/transport':         '/dashboard/resources',
  '/dashboard/comms':             '/dashboard/comms',
  '/dashboard/messages':          '/dashboard/comms',
  '/dashboard/notifications':     '/dashboard/comms',
  '/dashboard/announcements':     '/dashboard/comms',
};

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { label: 'Dashboard',      href: '/dashboard',           icon: LayoutDashboard, exact: true },
  { label: "Ta'lim",         href: '/dashboard/education', icon: BookOpen },
  { label: "O'quvchilar",    href: '/dashboard/students',  icon: Users },
  { label: 'Moliya',         href: '/dashboard/finance',   icon: TrendingUp },
  { label: 'Xodimlar',       href: '/dashboard/staff',     icon: Briefcase },
  { label: 'Resurslar',      href: '/dashboard/resources', icon: Package },
  { label: 'Kommunikatsiya', href: '/dashboard/comms',     icon: MessageSquare },
];

function XeduMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-label="Xedu">
      <path d="M3 4 L13 13 L23 4"  stroke="#10b981" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 22 L13 13 L23 22" stroke="#34d399" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <rect x="7.5" y="3.5" width="11" height="3.5" rx="1.75" fill="#059669"/>
      <rect x="10" y="1.5" width="6" height="2.5" rx="1.25" fill="#10b981"/>
    </svg>
  );
}

function getActiveSection(pathname: string): string {
  if (pathname === '/dashboard') return '/dashboard';
  const sorted = Object.keys(SECTION_MAP).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname === route || pathname.startsWith(route + '/')) return SECTION_MAP[route];
  }
  return '/dashboard';
}

export function Sidebar() {
  const pathname      = usePathname();
  const activeSection = getActiveSection(pathname);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const expanded = !sidebarCollapsed;

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col rounded-2xl transition-all duration-300 ease-in-out overflow-hidden',
        expanded ? 'w-[220px]' : 'w-[56px]',
      )}
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Logo row */}
      <div className={cn(
        'flex h-14 shrink-0 items-center px-3 border-b border-slate-100',
        expanded ? 'justify-between' : 'flex-col justify-center gap-1.5',
      )}>
        <Link
          href="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors"
        >
          <XeduMark size={20} />
        </Link>

        {expanded && (
          <span className="flex-1 ml-2 text-[13px] font-semibold text-slate-700 tracking-tight truncate">
            Xedu
          </span>
        )}

        <button
          onClick={toggleSidebar}
          title={expanded ? 'Yopish' : 'Kengaytirish'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : activeSection === item.href;
          const Icon   = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={!expanded ? item.label : undefined}
              className={cn(
                'flex h-10 items-center gap-2.5 rounded-xl px-2.5 transition-all duration-150',
                expanded ? 'w-full' : 'w-10 justify-center',
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
              )}
            >
              <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-emerald-600' : 'text-slate-400')} style={{ width: 18, height: 18 }} />
              {expanded && (
                <span className={cn('text-[13px] font-medium truncate', active ? 'text-emerald-700' : 'text-slate-600')}>
                  {item.label}
                </span>
              )}
              {active && expanded && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer hint */}
      {expanded && (
        <div className="shrink-0 border-t border-slate-100 p-3">
          <p className="text-[11px] text-slate-400 text-center">Xedu v1.0</p>
        </div>
      )}
    </aside>
  );
}
