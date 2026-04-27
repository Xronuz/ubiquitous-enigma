'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  TrendingUp,
  Briefcase,
  Package,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ── Route → section mapping (highlights correct sidebar item for sub-pages) ──
const SECTION_MAP: Record<string, string> = {
  // Ta'lim
  '/dashboard/education':        '/dashboard/education',
  '/dashboard/classes':          '/dashboard/education',
  '/dashboard/schedule':         '/dashboard/education',
  '/dashboard/academic-calendar':'/dashboard/education',
  '/dashboard/subjects':         '/dashboard/education',
  '/dashboard/my-class':         '/dashboard/education',
  // O'quvchilar
  '/dashboard/students':         '/dashboard/students',
  '/dashboard/attendance':       '/dashboard/students',
  '/dashboard/grades':           '/dashboard/students',
  '/dashboard/exams':            '/dashboard/students',
  '/dashboard/homework':         '/dashboard/students',
  // Moliya
  '/dashboard/finance':          '/dashboard/finance',
  '/dashboard/payments':         '/dashboard/finance',
  '/dashboard/fee-structures':   '/dashboard/finance',
  '/dashboard/payroll':          '/dashboard/finance',
  '/dashboard/reports':          '/dashboard/finance',
  // Xodimlar
  '/dashboard/staff':            '/dashboard/staff',
  '/dashboard/users':            '/dashboard/staff',
  '/dashboard/branches':         '/dashboard/staff',
  '/dashboard/crm':              '/dashboard/staff',
  '/dashboard/leave-requests':   '/dashboard/staff',
  '/dashboard/discipline':       '/dashboard/staff',
  '/dashboard/meetings':         '/dashboard/staff',
  // Resurslar
  '/dashboard/resources':        '/dashboard/resources',
  '/dashboard/library':          '/dashboard/resources',
  '/dashboard/learning-center':  '/dashboard/resources',
  '/dashboard/clubs':            '/dashboard/resources',
  '/dashboard/coins':            '/dashboard/resources',
  '/dashboard/canteen':          '/dashboard/resources',
  '/dashboard/transport':        '/dashboard/resources',
  // Kommunikatsiya
  '/dashboard/comms':            '/dashboard/comms',
  '/dashboard/messages':         '/dashboard/comms',
  '/dashboard/notifications':    '/dashboard/comms',
  '/dashboard/announcements':    '/dashboard/comms',
};

import type { LucideIcon } from 'lucide-react';

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean };

const NAV: NavItem[] = [
  { label: 'Dashboard',       href: '/dashboard',            icon: LayoutDashboard, exact: true },
  { label: "Ta'lim",          href: '/dashboard/education',  icon: BookOpen },
  { label: "O'quvchilar",     href: '/dashboard/students',   icon: Users },
  { label: 'Moliya',          href: '/dashboard/finance',    icon: TrendingUp },
  { label: 'Xodimlar',        href: '/dashboard/staff',      icon: Briefcase },
  { label: 'Resurslar',       href: '/dashboard/resources',  icon: Package },
  { label: 'Kommunikatsiya',  href: '/dashboard/comms',      icon: MessageSquare },
];

function XeduMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-label="Xedu">
      {/* X shape */}
      <path d="M3 4 L13 13 L23 4"  stroke="#22c55e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 22 L13 13 L23 22" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
      {/* Cap brim */}
      <rect x="7.5" y="3.5" width="11" height="4" rx="2" fill="#166534"/>
      {/* Cap top */}
      <rect x="10" y="1.5" width="6" height="2.5" rx="1.25" fill="#22c55e"/>
    </svg>
  );
}

function getActiveSection(pathname: string): string {
  // Exact dashboard check
  if (pathname === '/dashboard') return '/dashboard';

  // Check from longest prefix to avoid false matches
  const sorted = Object.keys(SECTION_MAP).sort((a, b) => b.length - a.length);
  for (const route of sorted) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return SECTION_MAP[route];
    }
  }
  return '/dashboard';
}

export function Sidebar() {
  const pathname = usePathname();
  const activeSection = getActiveSection(pathname);

  return (
    <TooltipProvider delayDuration={180}>
      <aside
        className="flex h-screen w-[72px] shrink-0 flex-col items-center py-2"
        style={{
          background: '#0f3d2e',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* ── Logo ── */}
        <div className="flex h-14 w-full items-center justify-center">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-2xl transition-opacity duration-150 hover:opacity-80"
            style={{
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.22)',
            }}
          >
            <XeduMark />
          </Link>
        </div>

        {/* ── Divider ── */}
        <div
          className="mb-2 w-10"
          style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }}
        />

        {/* ── Nav items ── */}
        <nav className="flex flex-1 flex-col items-center gap-[3px] px-2 w-full">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : activeSection === item.href;
            const Icon = item.icon;

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex h-11 w-11 items-center justify-center rounded-xl',
                      'transition-all duration-200',
                      !active && 'hover:bg-white/[0.07]',
                    )}
                    style={active ? {
                      background: 'rgba(34,197,94,0.14)',
                      boxShadow: '0 0 20px rgba(34,197,94,0.16)',
                    } : undefined}
                  >
                    {/* Active left accent bar */}
                    {active && (
                      <span
                        className="absolute -left-[10px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                        style={{
                          background: '#22c55e',
                          boxShadow: '0 0 8px rgba(34,197,94,0.7)',
                        }}
                      />
                    )}
                    <Icon
                      className="h-[19px] w-[19px] transition-colors duration-200"
                      style={{ color: active ? '#22c55e' : 'rgba(255,255,255,0.36)' }}
                    />
                  </Link>
                </TooltipTrigger>

                {/* Liquid glass tooltip */}
                <TooltipContent
                  side="right"
                  sideOffset={14}
                  className={cn(
                    'rounded-[10px] border px-3 py-1.5',
                    'text-[13px] font-medium text-white',
                    'shadow-[0_8px_32px_rgba(0,0,0,0.45)]',
                  )}
                  style={{
                    background: 'rgba(15,61,46,0.88)',
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

        {/* ── Bottom spacer ── */}
        <div className="h-3" />
      </aside>
    </TooltipProvider>
  );
}
