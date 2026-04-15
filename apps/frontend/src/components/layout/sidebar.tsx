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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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

const SCHOOL_ROLES = ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'];
const ALL_STAFF = ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'];

const navGroups: NavGroup[] = [
  {
    title: 'ASOSIY',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
      { label: 'Mening sinfim', href: '/dashboard/my-class', icon: School, roles: ['class_teacher'] },
      { label: 'Mening portalim', href: '/dashboard/student', icon: UserCircle, roles: ['student'] },
      { label: 'Farzandlarim', href: '/dashboard/parent', icon: Heart, roles: ['parent'] },
    ],
  },
  {
    title: "TA'LIM",
    items: [
      { label: 'Sinflar', href: '/dashboard/classes', icon: School, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: SCHOOL_ROLES },
      { label: 'Akademik kalendar', href: '/dashboard/academic-calendar', icon: CalendarDays, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Fanlar', href: '/dashboard/subjects', icon: BookOpen, roles: ['school_admin', 'vice_principal', 'teacher'] },
    ],
  },
  {
    title: "O'QUVCHILAR",
    items: [
      { label: 'Davomat', href: '/dashboard/attendance', icon: ClipboardCheck, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Baholar', href: '/dashboard/grades', icon: BarChart2, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'student'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: FileText, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'student'] },
      { label: 'Uy vazifalari', href: '/dashboard/homework', icon: BookMarked, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'student'] },
    ],
  },
  {
    title: 'MOLIYA',
    items: [
      { label: 'Moliyaviy dashboard', href: '/dashboard/finance', icon: TrendingUp, roles: ['school_admin', 'vice_principal', 'accountant'] },
      { label: "O'quvchilar to'lovi", href: '/dashboard/payments', icon: CreditCard, roles: ['school_admin', 'accountant'] },
      { label: "To'lov tartiblari", href: '/dashboard/fee-structures', icon: Banknote, roles: ['school_admin', 'accountant'] },
      { label: 'Maosh tizimi', href: '/dashboard/payroll', icon: Banknote, roles: ['school_admin', 'accountant'] },
      { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, roles: ['school_admin', 'vice_principal', 'accountant'] },
      { label: 'Ish yuklamasi', href: '/dashboard/reports/workload', icon: TrendingUp, roles: ['school_admin', 'vice_principal'] },
    ],
  },
  {
    title: 'XODIMLAR',
    items: [
      { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, roles: ['school_admin', 'vice_principal'] },
      { label: "Ta'til so'rovlari", href: '/dashboard/leave-requests', icon: CalendarOff, roles: ALL_STAFF },
      { label: 'Intizom jurnali', href: '/dashboard/discipline', icon: ShieldAlert, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Ota-ona uchrashuvlari', href: '/dashboard/meetings', icon: CalendarCheck, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
    ],
  },
  {
    title: 'RESURSLAR',
    items: [
      { label: 'Kutubxona', href: '/dashboard/library', icon: Library, roles: ['school_admin', 'vice_principal', 'librarian'] },
      { label: "O'quv markazi", href: '/dashboard/learning-center', icon: MonitorPlay, roles: ['school_admin', 'vice_principal', 'teacher', 'student'] },
      { label: "To'garaklar", href: '/dashboard/clubs', icon: Puzzle, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'student', 'parent'] },
      { label: 'Ovqatxona', href: '/dashboard/canteen', icon: UtensilsCrossed, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'student'] },
      { label: 'Transport', href: '/dashboard/transport', icon: Bus, roles: ['school_admin', 'vice_principal', 'student', 'parent'] },
    ],
  },
  {
    title: 'KOMMUNIKATSIYA',
    items: [
      { label: 'Xabarlar', href: '/dashboard/messages', icon: MessageSquare, roles: SCHOOL_ROLES },
      { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: SCHOOL_ROLES },
    ],
  },
];

const adminItems: NavItem[] = [
  { label: 'Maktablar', href: '/dashboard/schools', icon: GraduationCap, roles: ['super_admin'] },
  { label: 'Tizim holati', href: '/dashboard/system-health', icon: Activity, roles: ['super_admin'] },
  { label: 'Audit Log', href: '/dashboard/audit-log', icon: ShieldAlert, roles: ['school_admin', 'vice_principal', 'super_admin'] },
  { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings },
  { label: 'Profil', href: '/dashboard/profile', icon: UserCircle, roles: SCHOOL_ROLES },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUIStore();

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

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
                'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex h-screen flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className={cn('flex h-16 items-center border-b px-4', collapsed && 'justify-center px-2')}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
              <GraduationCap className="h-6 w-6" />
              EduPlatform
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard">
              <GraduationCap className="h-6 w-6 text-primary" />
            </Link>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(canSee);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title}>
                {!collapsed && (
                  <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {group.title}
                  </p>
                )}
                {collapsed && <Separator className="my-1" />}
                <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center')}>
                  {visibleItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Admin / Settings */}
          {adminItems.some(canSee) && (
            <>
              {!collapsed && (
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  TIZIM
                </p>
              )}
              {collapsed && <Separator className="my-1" />}
              <div className={cn('space-y-0.5', collapsed && 'flex flex-col items-center')}>
                {adminItems.filter(canSee).map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm"
          onClick={toggleSidebar}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </aside>
    </TooltipProvider>
  );
}
