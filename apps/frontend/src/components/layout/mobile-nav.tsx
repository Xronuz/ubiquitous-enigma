'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  GraduationCap,
  LayoutDashboard, Users, BookOpen, Calendar, ClipboardCheck,
  BarChart2, BarChart3, CreditCard, Bell, Settings, School,
  MessageSquare, BookMarked, FileText, Library, CalendarOff, Banknote,
  UserCircle, Heart, Building2, Shield, TrendingUp, Coins,
  ShoppingBag, Package, Bus, Award, Wallet,
  Brain, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ROUTE_PERMISSIONS } from '@/config/permissions';

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

const ALL_SCHOOL = ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'];
const STAFF = ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian'];

const navGroups: NavGroup[] = [
  {
    title: 'ASOSIY',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ALL_SCHOOL },
      { label: "O'quvchi portal", href: '/dashboard/student', icon: UserCircle, roles: ['student'] },
      { label: 'Farzand', href: '/dashboard/parent', icon: Heart, roles: ['parent'] },
    ],
  },
  {
    title: "TA'LIM",
    items: [
      { label: "Ta'lim markazi", href: '/dashboard/education', icon: School, roles: ROUTE_PERMISSIONS['/dashboard/education'] },
      { label: "O'quvchilar", href: '/dashboard/students', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/students'] },
      { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ROUTE_PERMISSIONS['/dashboard/schedule'] },
      { label: 'Davomat', href: '/dashboard/attendance', icon: ClipboardCheck, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
      { label: 'Baholar', href: '/dashboard/grades', icon: BarChart2, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: FileText, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
      { label: 'Uy vazifalari', href: '/dashboard/homework', icon: BookMarked, roles: ROUTE_PERMISSIONS['/dashboard/homework'] },
    ],
  },
  {
    title: 'MOLIYA',
    items: [
      { label: 'Moliya', href: '/dashboard/finance', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/finance'] },
      { label: "To'lovlar", href: '/dashboard/payments', icon: CreditCard, roles: ROUTE_PERMISSIONS['/dashboard/payments'] },
      { label: 'Tariflar', href: '/dashboard/fee-structures', icon: Wallet, roles: ROUTE_PERMISSIONS['/dashboard/fee-structures'] },
      { label: 'Ish haqi', href: '/dashboard/payroll', icon: Award, roles: ROUTE_PERMISSIONS['/dashboard/payroll'] },
      { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, roles: ROUTE_PERMISSIONS['/dashboard/reports'] },
      { label: 'KPI Dashboard', href: '/dashboard/kpi', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/kpi'] },
      { label: 'AI Analytics', href: '/dashboard/ai-analytics', icon: Brain, roles: ROUTE_PERMISSIONS['/dashboard/ai-analytics'] },
      { label: 'Marketing', href: '/dashboard/marketing', icon: Megaphone, roles: ROUTE_PERMISSIONS['/dashboard/marketing'] },
    ],
  },
  {
    title: 'BOSHQARUV',
    items: [
      { label: 'Xodimlar', href: '/dashboard/staff', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/staff'] },
      { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/users'] },
      { label: "Ta'til so'rovlar", href: '/dashboard/leave-requests', icon: CalendarOff, roles: ROUTE_PERMISSIONS['/dashboard/leave-requests'] },
      { label: 'Intizom', href: '/dashboard/discipline', icon: Shield, roles: ROUTE_PERMISSIONS['/dashboard/discipline'] },
    ],
  },
  {
    title: 'RESURSLAR',
    items: [
      { label: 'Resurslar', href: '/dashboard/resources', icon: Package, roles: ROUTE_PERMISSIONS['/dashboard/resources'] },
      { label: 'Kutubxona', href: '/dashboard/library', icon: Library, roles: ROUTE_PERMISSIONS['/dashboard/library'] },
      { label: 'Transport', href: '/dashboard/transport', icon: Bus, roles: ROUTE_PERMISSIONS['/dashboard/transport'] },
    ],
  },
  {
    title: 'ALOQA',
    items: [
      { label: 'Kommunikatsiya', href: '/dashboard/comms', icon: MessageSquare, roles: ROUTE_PERMISSIONS['/dashboard/comms'] },
      { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: ROUTE_PERMISSIONS['/dashboard/notifications'] },
    ],
  },
];

const adminItems: NavItem[] = [
  { label: 'Maktablar', href: '/dashboard/schools', icon: School, roles: ROUTE_PERMISSIONS['/dashboard/schools'] },
  { label: 'Filiallar', href: '/dashboard/branches', icon: Building2, roles: ROUTE_PERMISSIONS['/dashboard/branches'] },
  { label: 'Audit log', href: '/dashboard/audit-log', icon: Shield, roles: ROUTE_PERMISSIONS['/dashboard/audit-log'] },
  { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ROUTE_PERMISSIONS['/dashboard/settings'] },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  };

  const visibleGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(canSee) }))
    .filter(g => g.items.length > 0);

  const visibleAdmin = adminItems.filter(canSee);

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="px-4 py-4 border-b">
            <SheetTitle className="text-left text-lg font-bold">Xedu Platform</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col overflow-y-auto h-[calc(100vh-80px)] px-3 py-2">
            {visibleGroups.map(group => (
              <div key={group.title} className="mb-3">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                <Separator className="mt-2" />
              </div>
            ))}

            {visibleAdmin.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">TIZIM</p>
                <div className="flex flex-col gap-0.5">
                  {visibleAdmin.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
