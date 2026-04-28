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

type NavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean; section: 'main' | 'system' };

const NAV: NavItem[] = [
  { label: 'Dashboard',      href: '/dashboard',           icon: LayoutDashboard, exact: true, section: 'main' },
  { label: "Ta'lim",         href: '/dashboard/education', icon: BookOpen,                     section: 'main' },
  { label: "O'quvchilar",    href: '/dashboard/students',  icon: Users,                        section: 'main' },
  { label: 'Moliya',         href: '/dashboard/finance',   icon: TrendingUp,                   section: 'main' },
  { label: 'Xodimlar',       href: '/dashboard/staff',     icon: Briefcase,                    section: 'system' },
  { label: 'Resurslar',      href: '/dashboard/resources', icon: Package,                      section: 'system' },
  { label: 'Kommunikatsiya', href: '/dashboard/comms',     icon: MessageSquare,                section: 'system' },
];

const MAIN_ITEMS  = NAV.filter(n => n.section === 'main');
const SYSTEM_ITEMS = NAV.filter(n => n.section === 'system');

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

function NavLink({ item, active, expanded }: { item: NavItem; active: boolean; expanded: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={!expanded ? item.label : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-xl transition-all duration-150',
        expanded ? 'h-[50px] w-full px-3.5' : 'h-[50px] w-[50px] justify-center',
        active
          ? 'text-emerald-700'
          : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700',
      )}
      style={active ? {
        background: '#DDF5EA',
        boxShadow: '0 2px 8px rgba(15,123,83,0.12)',
      } : undefined}
    >
      <Icon
        style={{ width: 18, height: 18 }}
        className={cn('shrink-0', active ? 'text-emerald-600' : 'text-slate-400')}
      />
      {expanded && (
        <span className={cn(
          'text-[15px] font-semibold truncate',
          active ? 'text-emerald-700' : 'text-slate-600',
        )}>
          {item.label}
        </span>
      )}
      {active && expanded && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
      )}
    </Link>
  );
}

function SectionLabel({ label, expanded }: { label: string; expanded: boolean }) {
  if (!expanded) return <div className="h-px w-8 my-1.5 mx-auto bg-slate-100 rounded-full" />;
  return (
    <p className="mt-4 mb-1 px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 select-none">
      {label}
    </p>
  );
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
        expanded ? 'w-[260px]' : 'w-[62px]',
      )}
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226,232,240,0.7)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* Logo row */}
      <div className={cn(
        'flex h-[70px] shrink-0 items-center px-4 border-b border-slate-100/80',
        expanded ? 'justify-between' : 'flex-col justify-center gap-2',
      )}>
        <Link
          href="/dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100/80 hover:bg-emerald-100 transition-colors"
        >
          <XeduMark size={22} />
        </Link>

        {expanded && (
          <span className="flex-1 ml-2.5 text-[15px] font-bold text-slate-800 tracking-tight truncate">
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
      <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 pb-2">
        <SectionLabel label="Asosiy" expanded={expanded} />
        <div className="flex flex-col gap-0.5">
          {MAIN_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : activeSection === item.href;
            return <NavLink key={item.href} item={item} active={active} expanded={expanded} />;
          })}
        </div>

        <SectionLabel label="Tizim" expanded={expanded} />
        <div className="flex flex-col gap-0.5">
          {SYSTEM_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : activeSection === item.href;
            return <NavLink key={item.href} item={item} active={active} expanded={expanded} />;
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className={cn(
        'shrink-0 border-t border-slate-100/80 py-3',
        expanded ? 'px-4' : 'px-2.5',
      )}>
        {expanded ? (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400 font-medium">Xedu Platform</p>
            <span className="text-[10px] text-slate-300 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">v1.0</span>
          </div>
        ) : (
          <p className="text-[10px] text-slate-300 text-center font-semibold">v1</p>
        )}
      </div>
    </aside>
  );
}
