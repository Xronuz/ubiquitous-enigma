'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Users, GraduationCap, Calendar, BookOpen,
  ClipboardList, TrendingUp, FileText, CreditCard, Bell,
  MessageSquare, Library, Settings, UserCircle, School,
  CheckSquare, Briefcase, Clock, Search, History,
  ShieldAlert, Bus, CalendarCheck, Shield, Banknote,
  Building2, Award, Wallet, Package, Coins, ShoppingBag,
  Brain, Megaphone,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { ROUTE_PERMISSIONS } from '@/config/permissions';

// ── Recent pages helpers ───────────────────────────────────────────────────────
const RECENT_KEY = 'command_recent_pages';
const MAX_RECENT = 5;

function getRecentPages(): { href: string; label: string }[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function pushRecentPage(href: string, label: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentPages().filter(p => p.href !== href);
    const updated = [{ href, label }, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

// ── Navigation items (from ROUTE_PERMISSIONS) ─────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ROUTE_PERMISSIONS['/dashboard'] },
  { label: 'Maktablar', href: '/dashboard/schools', icon: School, roles: ROUTE_PERMISSIONS['/dashboard/schools'] },
  { label: 'Filiallar', href: '/dashboard/branches', icon: Building2, roles: ROUTE_PERMISSIONS['/dashboard/branches'] },
  { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/users'] },
  { label: 'Xodimlar', href: '/dashboard/staff', icon: Briefcase, roles: ROUTE_PERMISSIONS['/dashboard/staff'] },
  { label: "Ta'lim", href: '/dashboard/education', icon: BookOpen, roles: ROUTE_PERMISSIONS['/dashboard/education'] },
  { label: "O'quvchilar", href: '/dashboard/students', icon: Users, roles: ROUTE_PERMISSIONS['/dashboard/students'] },
  { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ROUTE_PERMISSIONS['/dashboard/schedule'] },
  { label: 'Fanlar', href: '/dashboard/subjects', icon: BookOpen, roles: ROUTE_PERMISSIONS['/dashboard/subjects'] },
  { label: 'Davomat', href: '/dashboard/attendance', icon: CheckSquare, roles: ROUTE_PERMISSIONS['/dashboard/attendance'] },
  { label: 'Baholar', href: '/dashboard/grades', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/grades'] },
  { label: 'Imtihonlar', href: '/dashboard/exams', icon: FileText, roles: ROUTE_PERMISSIONS['/dashboard/exams'] },
  { label: 'Uy vazifalari', href: '/dashboard/homework', icon: ClipboardList, roles: ROUTE_PERMISSIONS['/dashboard/homework'] },
  { label: 'Moliya', href: '/dashboard/finance', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/finance'] },
  { label: "To'lovlar", href: '/dashboard/payments', icon: CreditCard, roles: ROUTE_PERMISSIONS['/dashboard/payments'] },
  { label: 'Tariflar', href: '/dashboard/fee-structures', icon: Wallet, roles: ROUTE_PERMISSIONS['/dashboard/fee-structures'] },
  { label: 'Ish haqi', href: '/dashboard/payroll', icon: Award, roles: ROUTE_PERMISSIONS['/dashboard/payroll'] },
  { label: 'Hisobotlar', href: '/dashboard/reports', icon: FileText, roles: ROUTE_PERMISSIONS['/dashboard/reports'] },
  { label: 'Intizom', href: '/dashboard/discipline', icon: ShieldAlert, roles: ROUTE_PERMISSIONS['/dashboard/discipline'] },
  { label: "Ta'til so'rovlar", href: '/dashboard/leave-requests', icon: Clock, roles: ROUTE_PERMISSIONS['/dashboard/leave-requests'] },
  { label: 'Resurslar', href: '/dashboard/resources', icon: Package, roles: ROUTE_PERMISSIONS['/dashboard/resources'] },
  { label: 'Kutubxona', href: '/dashboard/library', icon: Library, roles: ROUTE_PERMISSIONS['/dashboard/library'] },
  { label: 'EduCoin', href: '/dashboard/coins', icon: Coins, roles: ROUTE_PERMISSIONS['/dashboard/coins'] },
  { label: 'Transport', href: '/dashboard/transport', icon: Bus, roles: ROUTE_PERMISSIONS['/dashboard/transport'] },
  { label: 'Kommunikatsiya', href: '/dashboard/comms', icon: MessageSquare, roles: ROUTE_PERMISSIONS['/dashboard/comms'] },
  { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: ROUTE_PERMISSIONS['/dashboard/notifications'] },
  { label: 'Mening sinfim', href: '/dashboard/my-class', icon: GraduationCap, roles: ROUTE_PERMISSIONS['/dashboard/my-class'] },
  { label: "O'quvchi portal", href: '/dashboard/student', icon: UserCircle, roles: ROUTE_PERMISSIONS['/dashboard/student'] },
  { label: "O'quvchi do'koni", href: '/dashboard/student/shop', icon: ShoppingBag, roles: ROUTE_PERMISSIONS['/dashboard/student/shop'] },
  { label: 'Farzand', href: '/dashboard/parent', icon: UserCircle, roles: ROUTE_PERMISSIONS['/dashboard/parent'] },
  { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ROUTE_PERMISSIONS['/dashboard/settings'] },
  { label: 'Audit Log', href: '/dashboard/audit-log', icon: Shield, roles: ROUTE_PERMISSIONS['/dashboard/audit-log'] },
  { label: 'KPI Dashboard', href: '/dashboard/kpi', icon: TrendingUp, roles: ROUTE_PERMISSIONS['/dashboard/kpi'] },
  { label: 'AI Analytics', href: '/dashboard/ai-analytics', icon: Brain, roles: ROUTE_PERMISSIONS['/dashboard/ai-analytics'] },
  { label: 'Marketing', href: '/dashboard/marketing', icon: Megaphone, roles: ROUTE_PERMISSIONS['/dashboard/marketing'] },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [recentPages, setRecentPages] = useState<{ href: string; label: string }[]>([]);

  // Track page visits
  useEffect(() => {
    const navItem = NAV_ITEMS.find(n => n.href === pathname);
    if (navItem) pushRecentPage(navItem.href, navItem.label);
  }, [pathname]);

  // Load recent pages when palette opens
  useEffect(() => {
    if (open) setRecentPages(getRecentPages());
  }, [open]);

  // Filter nav items by user role
  const navItems = NAV_ITEMS.filter(item =>
    !user?.role || item.roles?.includes(user.role as any),
  );

  // Search users (debounced)
  const { data: usersData } = useQuery({
    queryKey: ['command-search-users', search],
    queryFn: () => usersApi.getAll({ search, limit: 5 }),
    enabled: open && search.length >= 2,
    staleTime: 30_000,
  });

  // Search classes
  const { data: classesData } = useQuery({
    queryKey: ['command-search-classes', search],
    queryFn: () => classesApi.getAll(),
    enabled: open && search.length >= 1,
    staleTime: 60_000,
  });

  const handleNavigate = useCallback((href: string) => {
    onOpenChange(false);
    router.push(href);
  }, [onOpenChange, router]);

  const recentItems = recentPages
    .map(r => navItems.find(n => n.href === r.href))
    .filter(Boolean) as typeof navItems;

  const filteredNav = search.trim()
    ? navItems.filter(n =>
        n.label.toLowerCase().includes(search.toLowerCase()) ||
        n.href.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Qidirish..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Hech narsa topilmadi</CommandEmpty>

        {recentItems.length > 0 && !search.trim() && (
          <CommandGroup heading="So'nggi sahifalar">
            {recentItems.map(item => (
              <CommandItem
                key={item.href}
                onSelect={() => handleNavigate(item.href)}
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredNav.length > 0 && (
          <CommandGroup heading="Navigatsiya">
            {filteredNav.map(item => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => handleNavigate(item.href)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {usersData?.data && usersData.data.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Foydalanuvchilar">
              {usersData.data.map((u: any) => (
                <CommandItem
                  key={u.id}
                  onSelect={() => handleNavigate(`/dashboard/users/${u.id}`)}
                  className="flex items-center gap-2"
                >
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  <span>{u.firstName} {u.lastName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {classesData?.data && classesData.data.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sinflar">
              {classesData.data.slice(0, 5).map((c: any) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => handleNavigate(`/dashboard/classes/${c.id}`)}
                  className="flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <span>{c.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
