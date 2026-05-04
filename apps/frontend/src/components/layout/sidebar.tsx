'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Users, TrendingUp,
  Briefcase, Package, MessageSquare, ClipboardCheck,
  ChevronLeft, ChevronRight, Calendar, GraduationCap,
  ClipboardList, BookMarked, CalendarCheck, UserCircle,
  BookCheck, School, Settings, Shield, CreditCard,
  Wallet, BarChart3, ShoppingBag, Coins, FileText,
  Building2, Bell, Award, Library, Bus,
  Brain, Megaphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { ROUTE_PERMISSIONS } from '@/config/permissions';

// ── Section map: child route → parent nav item ────────────────────────────────
const SECTION_MAP: Record<string, string> = {
  // Education
  '/dashboard/education':         '/dashboard/education',
  '/dashboard/classes':           '/dashboard/education',
  '/dashboard/schedule':          '/dashboard/schedule',
  '/dashboard/academic-calendar': '/dashboard/education',
  '/dashboard/subjects':          '/dashboard/education',
  '/dashboard/my-class':          '/dashboard/my-class',

  // Students
  '/dashboard/students':          '/dashboard/students',

  // Staff
  '/dashboard/staff':             '/dashboard/staff',
  '/dashboard/users':             '/dashboard/staff',
  '/dashboard/branches':          '/dashboard/staff',
  '/dashboard/crm':               '/dashboard/staff',
  '/dashboard/leave-requests':    '/dashboard/staff',
  '/dashboard/discipline':        '/dashboard/staff',
  '/dashboard/meetings':          '/dashboard/staff',

  // Finance
  '/dashboard/finance':           '/dashboard/finance',
  '/dashboard/payments':          '/dashboard/finance',
  '/dashboard/fee-structures':    '/dashboard/finance',
  '/dashboard/payroll':           '/dashboard/finance',
  '/dashboard/reports':           '/dashboard/finance',

  // Resources
  '/dashboard/resources':         '/dashboard/resources',
  '/dashboard/library':           '/dashboard/resources',
  '/dashboard/learning-center':   '/dashboard/resources',
  '/dashboard/clubs':             '/dashboard/resources',
  '/dashboard/coins':             '/dashboard/coins',
  '/dashboard/canteen':           '/dashboard/resources',
  '/dashboard/transport':         '/dashboard/resources',
  '/dashboard/student/shop':      '/dashboard/student/shop',

  // Comms
  '/dashboard/comms':             '/dashboard/comms',
  '/dashboard/messages':          '/dashboard/comms',
  '/dashboard/notifications':     '/dashboard/comms',
  '/dashboard/announcements':     '/dashboard/comms',

  // Parent / Student portals
  '/dashboard/parent':            '/dashboard/parent',
  '/dashboard/student':           '/dashboard/student',

  // Super admin
  '/dashboard/schools':           '/dashboard/schools',
  '/dashboard/modules':           '/dashboard/schools',
  '/dashboard/subscriptions':     '/dashboard/schools',
  '/dashboard/audit-log':         '/dashboard/audit-log',
  '/dashboard/settings':          '/dashboard/settings',

  // Attendance / Grades / Exams / Homework (individual)
  '/dashboard/attendance':        '/dashboard/attendance',
  '/dashboard/grades':            '/dashboard/grades',
  '/dashboard/exams':             '/dashboard/exams',
  '/dashboard/homework':          '/dashboard/homework',
};

// ── Nav item type ─────────────────────────────────────────────────────────────
type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  section: 'main' | 'system' | 'portal';
  roles?: string[]; // undefined = all roles
};

// ── Navigation config ─────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  // ═════════════════════════════════════════════════════════════════════════════
  // ALL ROLES — Dashboard (landing varies by role, but link is always /dashboard)
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: 'Dashboard', href: '/dashboard',
    icon: LayoutDashboard, exact: true, section: 'main',
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // SUPER ADMIN — Platform-wide management
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: 'Maktablar', href: '/dashboard/schools',
    icon: School, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/schools'],
  },
  {
    label: 'Foydalanuvchilar', href: '/dashboard/users',
    icon: Users, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/users'],
  },
  {
    label: 'Audit log', href: '/dashboard/audit-log',
    icon: Shield, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/audit-log'],
  },
  {
    label: 'Filiallar', href: '/dashboard/branches',
    icon: Building2, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/branches'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // DIRECTOR / VICE_PRINCIPAL / BRANCH_ADMIN — Full school management
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: "Ta'lim", href: '/dashboard/education',
    icon: BookOpen, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/education'],
  },
  {
    label: "O'quvchilar", href: '/dashboard/students',
    icon: Users, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/students'],
  },
  {
    label: 'Xodimlar', href: '/dashboard/staff',
    icon: Briefcase, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/staff'],
  },
  {
    label: 'Moliya', href: '/dashboard/finance',
    icon: TrendingUp, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/finance'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // VICE PRINCIPAL — Academic & discipline oversight
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: "Ta'til so'rovlar", href: '/dashboard/leave-requests',
    icon: FileText, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/leave-requests'],
  },
  {
    label: 'Intizom', href: '/dashboard/discipline',
    icon: Shield, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/discipline'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // TEACHER / CLASS_TEACHER — Academic tasks
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: 'Dars jadvali', href: '/dashboard/schedule',
    icon: Calendar, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/schedule'],
  },
  {
    label: 'Baholar', href: '/dashboard/grades',
    icon: GraduationCap, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/grades'],
  },
  {
    label: 'Imtihonlar', href: '/dashboard/exams',
    icon: ClipboardList, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/exams'],
  },
  {
    label: 'Uy vazifalari', href: '/dashboard/homework',
    icon: BookMarked, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/homework'],
  },
  {
    label: 'Davomat', href: '/dashboard/attendance',
    icon: CalendarCheck, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/attendance'],
  },
  {
    label: 'Mening sinfim', href: '/dashboard/my-class',
    icon: BookCheck, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/my-class'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // ACCOUNTANT — Finance only
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: "To'lovlar", href: '/dashboard/payments',
    icon: CreditCard, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/payments'],
  },
  {
    label: 'Tariflar', href: '/dashboard/fee-structures',
    icon: Wallet, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/fee-structures'],
  },
  {
    label: 'Ish haqi', href: '/dashboard/payroll',
    icon: Award, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/payroll'],
  },
  {
    label: 'Hisobotlar', href: '/dashboard/reports',
    icon: BarChart3, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/reports'],
  },
  {
    label: 'KPI Dashboard', href: '/dashboard/kpi',
    icon: TrendingUp, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/kpi'],
  },
  {
    label: 'AI Analytics', href: '/dashboard/ai-analytics',
    icon: Brain, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/ai-analytics'],
  },
  {
    label: 'Marketing', href: '/dashboard/marketing',
    icon: Megaphone, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/marketing'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // STUDENT — Student portal
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: "O'quvchi portal", href: '/dashboard/student',
    icon: UserCircle, section: 'portal',
    roles: ROUTE_PERMISSIONS['/dashboard/student'],
  },
  {
    label: 'Do\'kon', href: '/dashboard/student/shop',
    icon: ShoppingBag, section: 'portal',
    roles: ROUTE_PERMISSIONS['/dashboard/student/shop'],
  },
  {
    label: 'EduCoin', href: '/dashboard/coins',
    icon: Coins, section: 'portal',
    roles: ROUTE_PERMISSIONS['/dashboard/coins'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // PARENT — Parent portal
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: 'Farzand', href: '/dashboard/parent',
    icon: UserCircle, section: 'portal',
    roles: ROUTE_PERMISSIONS['/dashboard/parent'],
  },
  {
    label: "O'quvchi to'lovlari", href: '/dashboard/payments',
    icon: CreditCard, section: 'portal',
    roles: ROUTE_PERMISSIONS['/dashboard/payments'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // BRANCH ADMIN — Branch-scoped management
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: 'Filial xodimlari', href: '/dashboard/staff',
    icon: Briefcase, section: 'main',
    roles: ROUTE_PERMISSIONS['/dashboard/staff'],
  },

  // ═════════════════════════════════════════════════════════════════════════════
  // SYSTEM section — Shared resources & comms
  // ═════════════════════════════════════════════════════════════════════════════
  {
    label: 'Resurslar', href: '/dashboard/resources',
    icon: Package, section: 'system',
    roles: ROUTE_PERMISSIONS['/dashboard/resources'],
  },
  {
    label: 'Kommunikatsiya', href: '/dashboard/comms',
    icon: MessageSquare, section: 'system',
    roles: ROUTE_PERMISSIONS['/dashboard/comms'],
  },
  {
    label: 'Sozlamalar', href: '/dashboard/settings',
    icon: Settings, section: 'system',
    roles: ROUTE_PERMISSIONS['/dashboard/settings'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
          ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200',
      )}
    >
      <Icon
        style={{ width: 18, height: 18 }}
        className={cn('shrink-0', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500')}
      />
      {expanded && (
        <span className={cn(
          'text-[15px] font-semibold truncate',
          active ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300',
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
  if (!expanded) return <div className="h-px w-8 my-1.5 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full" />;
  return (
    <p className="mt-4 mb-1 px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 select-none">
      {label}
    </p>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname      = usePathname();
  const activeSection = getActiveSection(pathname);
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user } = useAuthStore();
  const expanded = !sidebarCollapsed;
  const userRole = user?.role ?? '';

  // Filter nav items by current user's role
  const visibleNav = NAV.filter(item =>
    !item.roles || item.roles.includes(userRole),
  );

  const MAIN_ITEMS   = visibleNav.filter(n => n.section === 'main');
  const PORTAL_ITEMS = visibleNav.filter(n => n.section === 'portal');
  const SYSTEM_ITEMS = visibleNav.filter(n => n.section === 'system');

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col rounded-2xl transition-all duration-300 ease-in-out',
        'bg-white/95 dark:bg-slate-900/95',
        'border border-slate-200/70 dark:border-slate-700/70',
        'shadow-sm dark:shadow-slate-900/20',
        '[backdrop-filter:blur(20px)] [-webkit-backdrop-filter:blur(20px)]',
        expanded ? 'w-[260px]' : 'w-[62px]',
      )}
    >
      {/* Logo row */}
      <div className={cn(
        'flex h-[70px] shrink-0 items-center px-4 border-b border-slate-100/80 dark:border-slate-700/80',
        expanded ? 'justify-between' : 'flex-col justify-center gap-2',
      )}>
        <Link
          href="/dashboard"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100/80 dark:border-emerald-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
        >
          <XeduMark size={22} />
        </Link>

        {expanded && (
          <span className="flex-1 ml-2.5 text-[15px] font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">
            Xedu
          </span>
        )}

        <button
          onClick={toggleSidebar}
          title={expanded ? 'Yopish' : 'Kengaytirish'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-2.5 pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* Main section */}
        {MAIN_ITEMS.length > 0 && (
          <>
            <SectionLabel label="Asosiy" expanded={expanded} />
            <div className="flex flex-col gap-0.5">
              {MAIN_ITEMS.map((item) => {
                const active = item.exact ? pathname === item.href : activeSection === item.href;
                return <NavLink key={item.href} item={item} active={active} expanded={expanded} />;
              })}
            </div>
          </>
        )}

        {/* Portal section (student / parent) */}
        {PORTAL_ITEMS.length > 0 && (
          <>
            <SectionLabel label="Mening bo'limim" expanded={expanded} />
            <div className="flex flex-col gap-0.5">
              {PORTAL_ITEMS.map((item) => {
                const active = item.exact ? pathname === item.href : activeSection === item.href;
                return <NavLink key={item.href} item={item} active={active} expanded={expanded} />;
              })}
            </div>
          </>
        )}

        {/* System section */}
        {SYSTEM_ITEMS.length > 0 && (
          <>
            <SectionLabel label="Tizim" expanded={expanded} />
            <div className="flex flex-col gap-0.5">
              {SYSTEM_ITEMS.map((item) => {
                const active = item.exact ? pathname === item.href : activeSection === item.href;
                return <NavLink key={item.href} item={item} active={active} expanded={expanded} />;
              })}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className={cn(
        'shrink-0 border-t border-slate-100/80 dark:border-slate-700/80 py-3',
        expanded ? 'px-4' : 'px-2.5',
      )}>
        {expanded ? (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Xedu Platform</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">v1.0</span>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-semibold">v1</p>
        )}
      </div>
    </aside>
  );
}
