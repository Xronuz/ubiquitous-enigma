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
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';

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

// ── Navigation items ───────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users, roles: ['school_admin', 'vice_principal'] },
  { label: 'Sinflar', href: '/dashboard/classes', icon: GraduationCap, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { label: 'Fanlar', href: '/dashboard/subjects', icon: BookOpen, roles: ['school_admin', 'vice_principal', 'teacher'] },
  { label: 'Davomat', href: '/dashboard/attendance', icon: CheckSquare, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { label: 'Baholar', href: '/dashboard/grades', icon: TrendingUp, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { label: 'Imtihonlar', href: '/dashboard/exams', icon: FileText, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { label: 'Uy vazifalari', href: '/dashboard/homework', icon: ClipboardList, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { label: 'To\'lovlar', href: '/dashboard/payments', icon: CreditCard, roles: ['school_admin', 'accountant'] },
  { label: 'Maosh tizimi', href: '/dashboard/payroll', icon: Briefcase, roles: ['school_admin', 'accountant'] },
  { label: 'Hisobotlar', href: '/dashboard/reports', icon: FileText, roles: ['school_admin', 'vice_principal', 'accountant'] },
  { label: 'Kutubxona', href: '/dashboard/library', icon: Library, roles: ['school_admin', 'vice_principal', 'librarian'] },
  { label: 'Xabarlar', href: '/dashboard/messages', icon: MessageSquare, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { label: 'Bildirishnomalar', href: '/dashboard/notifications', icon: Bell, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { label: 'Ta\'til so\'rovlari', href: '/dashboard/leave-requests', icon: Clock, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { label: 'Maktablar', href: '/dashboard/schools', icon: School, roles: ['super_admin'] },
  { label: 'Intizom jurnali', href: '/dashboard/discipline', icon: ShieldAlert, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { label: 'Ota-ona uchrashuvlari', href: '/dashboard/meetings', icon: CalendarCheck, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'] },
  { label: 'Transport', href: '/dashboard/transport', icon: Bus, roles: ['school_admin', 'vice_principal'] },
  { label: 'Ish yuklamasi', href: '/dashboard/reports/workload', icon: TrendingUp, roles: ['school_admin', 'vice_principal'] },
  { label: 'Profil', href: '/dashboard/profile', icon: UserCircle, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'] },
  { label: 'Sozlamalar', href: '/dashboard/settings', icon: Settings, roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'] },
  { label: 'Audit Log', href: '/dashboard/audit-log', icon: Shield, roles: ['school_admin', 'vice_principal', 'super_admin'] },
  { label: 'To\'lov tartiblari', href: '/dashboard/fee-structures', icon: Banknote, roles: ['school_admin', 'accountant'] },
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
    !user?.role || item.roles.includes(user.role),
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

  const navigate = useCallback((href: string, label?: string) => {
    if (label) pushRecentPage(href, label);
    router.push(href);
    onOpenChange(false);
    setSearch('');
  }, [router, onOpenChange]);

  // Filter classes by search
  const filteredClasses = (classesData ?? []).filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 5);

  const users = usersData?.data ?? [];

  const ROLE_UZ: Record<string, string> = {
    school_admin: 'Admin',
    vice_principal: 'Direktor o\'rinbosari',
    teacher: 'O\'qituvchi',
    class_teacher: 'Sinf rahbari',
    accountant: 'Hisobchi',
    librarian: 'Kutubxonachi',
    student: 'O\'quvchi',
    parent: 'Ota-ona',
  };

  return (
    <CommandDialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSearch(''); }}>
      <CommandInput
        placeholder="Qidiruv: sahifalar, o'quvchilar, sinflar..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <Search className="h-8 w-8 opacity-40" />
            <p className="text-sm">Natija topilmadi: &quot;{search}&quot;</p>
          </div>
        </CommandEmpty>

        {/* Recent pages — shown only when no search */}
        {!search && recentPages.length > 0 && (
          <>
            <CommandGroup heading="So'nggi sahifalar">
              {recentPages.map(p => {
                const navItem = NAV_ITEMS.find(n => n.href === p.href);
                const Icon = navItem?.icon ?? History;
                return (
                  <CommandItem
                    key={`recent-${p.href}`}
                    value={`recent-${p.href}-${p.label}`}
                    onSelect={() => navigate(p.href)}
                    className="cursor-pointer"
                  >
                    <History className="mr-2 h-4 w-4 text-muted-foreground opacity-60" />
                    <Icon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {p.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Navigation pages */}
        <CommandGroup heading="Sahifalar">
          {navItems
            .filter(item =>
              !search ||
              item.label.toLowerCase().includes(search.toLowerCase()),
            )
            .slice(0, search ? 10 : 6)
            .map(item => (
              <CommandItem
                key={item.href}
                value={`page-${item.href}-${item.label}`}
                onSelect={() => navigate(item.href, item.label)}
                className="cursor-pointer"
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {item.label}
                {item.href === pathname && (
                  <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Hozir</span>
                )}
              </CommandItem>
            ))}
        </CommandGroup>

        {/* Users search results */}
        {users.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Foydalanuvchilar">
              {users.map((u: any) => (
                <CommandItem
                  key={u.id}
                  value={`user-${u.id}-${u.firstName}-${u.lastName}`}
                  onSelect={() => navigate(`/dashboard/users`)}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{u.firstName} {u.lastName}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {ROLE_UZ[u.role] ?? u.role}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Classes search results */}
        {filteredClasses.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sinflar">
              {filteredClasses.map((c: any) => (
                <CommandItem
                  key={c.id}
                  value={`class-${c.id}-${c.name}`}
                  onSelect={() => navigate(`/dashboard/classes/${c.id}`)}
                  className="cursor-pointer"
                >
                  <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                  {c._count?.students !== undefined && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c._count.students} o&apos;quvchi
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Quick actions */}
        {!search && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tezkor amallar">
              <CommandItem onSelect={() => navigate('/dashboard/attendance')} className="cursor-pointer">
                <CheckSquare className="mr-2 h-4 w-4 text-green-500" />
                Davomat belgilash
              </CommandItem>
              <CommandItem onSelect={() => navigate('/dashboard/grades')} className="cursor-pointer">
                <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
                Baho kiritish
              </CommandItem>
              <CommandItem onSelect={() => navigate('/dashboard/notifications')} className="cursor-pointer">
                <Bell className="mr-2 h-4 w-4 text-yellow-500" />
                Bildirishnomalar
              </CommandItem>
              <CommandItem onSelect={() => navigate('/dashboard/messages')} className="cursor-pointer">
                <MessageSquare className="mr-2 h-4 w-4 text-purple-500" />
                Xabarlar
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
