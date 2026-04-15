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
  UserCircle, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

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
      { label: 'Mening portalim', href: '/dashboard/student', icon: UserCircle, roles: ['student'] },
      { label: 'Farzandlarim', href: '/dashboard/parent', icon: Heart, roles: ['parent'] },
    ],
  },
  {
    title: "TA'LIM",
    items: [
      { label: 'Sinflar', href: '/dashboard/classes', icon: School, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
      { label: 'Fanlar', href: '/dashboard/subjects', icon: BookOpen, roles: ['school_admin', 'vice_principal', 'teacher'] },
      { label: 'Davomat', href: '/dashboard/attendance', icon: ClipboardCheck, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Baholar', href: '/dashboard/grades', icon: BarChart2, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Imtihonlar', href: '/dashboard/exams', icon: FileText, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
      { label: 'Uy vazifalari', href: '/dashboard/homework', icon: BookMarked, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
    ],
  },
  {
    title: 'MOLIYA',
    items: [
      { label: "O'quvchilar to'lovi", href: '/dashboard/payments', icon: CreditCard, roles: ['school_admin', 'accountant'] },
      { label: 'Maosh tizimi', href: '/dashboard/payroll', icon: Banknote, roles: ['school_admin', 'accountant'] },
      { label: 'Hisobotlar', href: '/dashboard/reports', icon: BarChart3, roles: ['school_admin', 'vice_principal', 'accountant'] },
    ],
  },
  {
    title: 'XODIMLAR',
    items: [
      { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, roles: ['school_admin', 'vice_principal'] },
      { label: "Ta'til so'rovlari", href: '/dashboard/leave-requests', icon: CalendarOff, roles: ALL_STAFF },
    ],
  },
  {
    title: 'BOSHQA',
    items: [
      { label: 'Kutubxona', href: '/dashboard/library', icon: Library, roles: ['school_admin', 'vice_principal', 'librarian'] },
      { label: 'Xabarlar', href: '/dashboard/messages', icon: MessageSquare, roles: SCHOOL_ROLES },
      { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: SCHOOL_ROLES },
    ],
  },
];

const adminItems: NavItem[] = [
  { label: 'Maktablar', href: '/dashboard/schools', icon: GraduationCap, roles: ['super_admin'] },
  { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings },
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

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menyu</span>
      </Button>

      <Sheet open={open} onClose={() => setOpen(false)} side="left">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary" onClick={() => setOpen(false)}>
            <GraduationCap className="h-6 w-6" />
            EduPlatform
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 pb-20">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(canSee);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
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
                  })}
                </div>
              </div>
            );
          })}

          {adminItems.some(canSee) && (
            <>
              <Separator className="my-1" />
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                TIZIM
              </p>
              <div className="space-y-0.5">
                {adminItems.filter(canSee).map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
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
                })}
              </div>
            </>
          )}
        </nav>
      </Sheet>
    </>
  );
}
