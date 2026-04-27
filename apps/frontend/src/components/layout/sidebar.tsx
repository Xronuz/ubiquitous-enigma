'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Users, TrendingUp,
  Briefcase, Package, MessageSquare,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

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

function XeduMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 26 26" fill="none" aria-label="Xedu">
      <path d="M3 4 L13 13 L23 4"  stroke="#22c55e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 22 L13 13 L23 22" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
      <rect x="7.5" y="3.5" width="11" height="4" rx="2" fill="#166534"/>
      <rect x="10" y="1.5" width="6" height="2.5" rx="1.25" fill="#22c55e"/>
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
    <TooltipProvider delayDuration={200}>
      {/* ── Floating capsule ──────────────────────────────────────────────── */}
      <aside
        className={cn(
          'm-4 flex shrink-0 flex-col rounded-3xl py-3',
          'transition-all duration-300 ease-in-out',
          expanded ? 'w-[232px]' : 'w-[64px]',
        )}
        style={{
          height: 'calc(100vh - 2rem)',
          background: '#0f3d2e',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.12)',
        }}
      >
        {/* Logo + toggle row */}
        <div className={cn(
          'flex h-14 shrink-0 items-center px-3',
          expanded ? 'gap-2' : 'flex-col justify-center gap-1',
        )}>
          <Link
            href="/dashboard"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-opacity hover:opacity-80"
            style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.22)' }}
          >
            <XeduMark />
          </Link>

          {expanded && (
            <span className="flex-1 truncate text-sm font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Xedu
            </span>
          )}

          <button
            onClick={toggleSidebar}
            title={expanded ? 'Yopish' : 'Kengaytirish'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.38)' }}
          >
            {expanded
              ? <PanelLeftClose className="h-3.5 w-3.5" />
              : <PanelLeftOpen  className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 mb-2" style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden px-2 scrollbar-sidebar">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : activeSection === item.href;
            const Icon   = item.icon;

            const linkEl = (
              <Link
                href={item.href}
                className={cn(
                  'relative flex h-11 items-center gap-3 rounded-2xl px-2.5',
                  'transition-all duration-200',
                  expanded ? 'w-full' : 'w-10 justify-center',
                  !active && 'hover:bg-white/[0.08]',
                )}
                style={active ? {
                  background: 'rgba(34,197,94,0.15)',
                  boxShadow: '0 0 20px rgba(34,197,94,0.12)',
                } : undefined}
              >
                {active && (
                  <span
                    className="absolute -left-[9px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                    style={{ background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }}
                  />
                )}
                <Icon
                  className="h-[18px] w-[18px] shrink-0 transition-colors"
                  style={{ color: active ? '#22c55e' : 'rgba(255,255,255,0.38)' }}
                />
                {expanded && (
                  <span
                    className="truncate text-[13px] font-medium"
                    style={{ color: active ? '#22c55e' : 'rgba(255,255,255,0.70)' }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );

            if (expanded) return <div key={item.href}>{linkEl}</div>;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={12}
                  className="rounded-xl border px-3 py-1.5 text-[13px] font-medium text-white shadow-2xl"
                  style={{
                    background: 'rgba(15,61,46,0.92)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(200%)',
                    borderColor: 'rgba(34,197,94,0.28)',
                  }}
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className="h-3" />
      </aside>
    </TooltipProvider>
  );
}
