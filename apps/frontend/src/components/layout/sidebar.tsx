'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardCheck,
  BarChart2,
  BarChart3,
  CreditCard,
  Bell,
  Settings,
  GraduationCap,
  School,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  BookMarked,
  FileText,
  Library,
  CalendarOff,
  Banknote,
  UserCircle,
  Heart,
  UtensilsCrossed,
  MonitorPlay,
  CalendarDays,
  ShieldAlert,
  Bus,
  CalendarCheck,
  TrendingUp,
  Activity,
  Puzzle,
  GitBranch,
  Target,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const SCHOOL_ROLES = ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'];
const ALL_STAFF    = ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'];
const ACADEMIC_STAFF = ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher'];

const navGroups: NavGroup[] = [
  {
    title: 'ASOSIY',
    items: [
      { label: 'Dashboard',      href: '/dashboard',          icon: LayoutDashboard, roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
      { label: 'Mening sinfim',  href: '/dashboard/my-class', icon: School,          roles: ['class_teacher', 'teacher'] },
      { label: 'Mening portalim',href: '/dashboard/student',  icon: UserCircle,      roles: ['student'] },
      { label: 'Farzandlarim',   href: '/dashboard/parent',   icon: Heart,           roles: ['parent'] },
    ],
  },
  {
    title: "TA'LIM",
    items: [
      { label: 'Sinflar',           href: '/dashboard/classes',           icon: School,       roles: ACADEMIC_STAFF },
      { label: 'Dars jadvali',      href: '/dashboard/schedule',          icon: Calendar,     roles: SCHOOL_ROLES },
      { label: 'Akademik kalendar', href: '/dashboard/academic-calendar', icon: CalendarDays, roles: ACADEMIC_STAFF },
      { label: 'Fanlar',            href: '/dashboard/subjects',          icon: BookOpen,     roles: ['school_admin', 'vice_principal'] },
    ],
  },
  {
    title: "O'QUVCHILAR",
    items: [
      { label: 'Davomat',     href: '/dashboard/attendance', icon: ClipboardCheck, roles: ACADEMIC_STAFF },
      { label: 'Baholar',     href: '/dashboard/grades',     icon: BarChart2,      roles: [...ACADEMIC_STAFF, 'student'] },
      { label: 'Imtihonlar',  href: '/dashboard/exams',      icon: FileText,       roles: [...ACADEMIC_STAFF, 'student'] },
      { label: 'Uy vazifalari',href: '/dashboard/homework',  icon: BookMarked,     roles: [...ACADEMIC_STAFF, 'student'] },
    ],
  },
  {
    title: 'MOLIYA',
    items: [
      { label: 'Moliyaviy dashboard', href: '/dashboard/finance',         icon: TrendingUp, roles: ['director', 'school_admin', 'vice_principal', 'accountant'] },
      { label: "O'quvchilar to'lovi", href: '/dashboard/payments',        icon: CreditCard, roles: ['school_admin', 'accountant'] },
      { label: "To'lov tartiblari",   href: '/dashboard/fee-structures',  icon: Banknote,   roles: ['school_admin', 'accountant'] },
      { label: 'Maosh tizimi',        href: '/dashboard/payroll',         icon: Banknote,   roles: ['school_admin', 'accountant'] },
      { label: 'Hisobotlar',          href: '/dashboard/reports',         icon: BarChart3,  roles: ['director', 'school_admin', 'vice_principal', 'accountant'] },
      { label: 'Ish yuklamasi',       href: '/dashboard/reports/workload',icon: TrendingUp, roles: ['director', 'school_admin', 'vice_principal'] },
    ],
  },
  {
    title: 'XODIMLAR',
    items: [
      { label: 'Foydalanuvchilar',      href: '/dashboard/users',          icon: Users,        roles: ['school_admin'] },
      { label: 'Filiallar',             href: '/dashboard/branches',       icon: GitBranch,    roles: ['school_admin', 'director'] },
      { label: 'CRM — Leadlar',         href: '/dashboard/crm',            icon: Target,       roles: ['school_admin', 'director', 'branch_admin', 'vice_principal', 'accountant'] },
      { label: "Ta'til so'rovlari",     href: '/dashboard/leave-requests', icon: CalendarOff,  roles: [...ALL_STAFF, 'student'] },
      { label: 'Intizom jurnali',       href: '/dashboard/discipline',     icon: ShieldAlert,  roles: ACADEMIC_STAFF },
      { label: 'Ota-ona uchrashuvlari', href: '/dashboard/meetings',       icon: CalendarCheck,roles: ACADEMIC_STAFF },
    ],
  },
  {
    title: 'RESURSLAR',
    items: [
      { label: 'Kutubxona',    href: '/dashboard/library',         icon: Library,        roles: ['director', 'school_admin', 'vice_principal', 'librarian'] },
      { label: "O'quv markazi",href: '/dashboard/learning-center', icon: MonitorPlay,    roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'student'] },
      { label: "To'garaklar",  href: '/dashboard/clubs',           icon: Puzzle,         roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student'] },
      { label: 'EduCoin',       href: '/dashboard/coins',           icon: Coins,          roles: ['director', 'school_admin', 'vice_principal', 'student'] },
      { label: 'Oshxona',      href: '/dashboard/canteen',         icon: UtensilsCrossed,roles: ['director', 'school_admin', 'vice_principal', 'teacher', 'class_teacher', 'student'] },
      { label: 'Transport',    href: '/dashboard/transport',       icon: Bus,            roles: ['director', 'school_admin', 'vice_principal', 'student', 'parent'] },
    ],
  },
  {
    title: 'KOMMUNIKATSIYA',
    items: [
      { label: 'Xabarlar',        href: '/dashboard/messages',      icon: MessageSquare, roles: [...SCHOOL_ROLES, 'super_admin'] },
      { label: 'Bildirishnomalar',href: '/dashboard/notifications',  icon: Bell,          roles: [...SCHOOL_ROLES, 'super_admin'] },
      { label: "E'lonlar",        href: '/dashboard/announcements',  icon: Bell,          roles: ['director'] },
    ],
  },
];

const adminItems: NavItem[] = [
  { label: 'Maktablar',    href: '/dashboard/schools',       icon: GraduationCap, roles: ['super_admin'] },
  { label: 'Tizim holati', href: '/dashboard/system-health', icon: Activity,      roles: ['super_admin'] },
  { label: 'Audit Log',    href: '/dashboard/audit-log',     icon: ShieldAlert,   roles: ['director', 'school_admin', 'vice_principal', 'super_admin'] },
  { label: 'Sozlamalar',   href: '/dashboard/settings',      icon: Settings },
  { label: 'Profil',       href: '/dashboard/profile',       icon: UserCircle,    roles: SCHOOL_ROLES },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUIStore();

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return false;
    const effectiveRoles =
      user.role === 'class_teacher' ? ['class_teacher', 'teacher'] : [user.role];
    return item.roles.some(r => effectiveRoles.includes(r));
  };

  // ── Nav link ────────────────────────────────────────────────────────────────
  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150',
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-2.5 rounded-xl mx-2 px-3 py-2 text-sm transition-all duration-150',
          isActive
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : '')} />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'relative flex h-screen flex-col border-r transition-all duration-300 ease-in-out',
          'bg-white dark:bg-slate-900',
          'border-slate-200 dark:border-slate-700/60',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* ── Logo ── */}
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-slate-200 dark:border-slate-700/60',
            collapsed ? 'justify-center px-0' : 'px-4 gap-3',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <GraduationCap className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-[15px] font-bold tracking-tight text-foreground leading-none">
                EduPlatform
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                Maktab boshqaruvi
              </p>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto scrollbar-sidebar py-3',
            collapsed ? 'px-2 space-y-1' : 'px-0 space-y-0.5',
          )}
        >
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(canSee);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-1">
                {/* Group header */}
                {!collapsed ? (
                  <p className="mb-1 mt-3 px-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 first:mt-0">
                    {group.title}
                  </p>
                ) : (
                  <div className="my-2 mx-1 h-px bg-slate-200 dark:bg-slate-700/60" />
                )}

                <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center space-y-1')}>
                  {visibleItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Admin / Settings group */}
          {adminItems.some(canSee) && (
            <div className="mb-1">
              {!collapsed ? (
                <p className="mb-1 mt-3 px-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  TIZIM
                </p>
              ) : (
                <div className="my-2 mx-1 h-px bg-slate-200 dark:bg-slate-700/60" />
              )}
              <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center space-y-1')}>
                {adminItems.filter(canSee).map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* ── Collapse toggle ── */}
        <button
          type="button"
          className={cn(
            'absolute -right-3.5 top-[72px] z-10 flex h-7 w-7 items-center justify-center rounded-full',
            'bg-white dark:bg-slate-900 shadow-pill',
            'text-slate-500 dark:text-slate-400',
            'hover:shadow-md hover:text-slate-900 dark:hover:text-white',
            'transition-all duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30',
          )}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft  className="h-3.5 w-3.5" />}
        </button>
      </aside>
    </TooltipProvider>
  );
}
