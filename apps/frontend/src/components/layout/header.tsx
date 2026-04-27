'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Moon, Sun, Search, User, ChevronDown, Settings, ClipboardList, GraduationCap, Activity } from 'lucide-react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NotificationDrawer } from '@/components/layout/notification-drawer';
import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth';
import { getInitials, getRoleLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Role → gradient color map for avatar ring
const ROLE_COLORS: Record<string, string> = {
  director:       'ring-violet-400',
  school_admin:   'ring-blue-400',
  vice_principal: 'ring-indigo-400',
  teacher:        'ring-emerald-400',
  class_teacher:  'ring-emerald-400',
  accountant:     'ring-amber-400',
  librarian:      'ring-cyan-400',
  student:        'ring-sky-400',
  parent:         'ring-rose-400',
  super_admin:    'ring-primary',
};

export function Header() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, logout, refreshToken } = useAuthStore();

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  const avatarRingColor = user ? (ROLE_COLORS[user.role] ?? 'ring-primary') : 'ring-primary';

  return (
    <header
      className={cn(
        'flex h-16 shrink-0 items-center justify-between',
        // True glassmorphism — works on the slate-100 canvas
        'bg-white/70 dark:bg-slate-900/70',
        'backdrop-blur-xl',
        'border-b border-slate-200/60 dark:border-slate-700/40',
        'shadow-[0_1px_0_rgba(0,0,0,0.04)]',
        'px-4 sm:px-5',
        'sticky top-0 z-30',
      )}
    >
      {/* Left — mobile nav or search */}
      <div className="flex items-center gap-3">
        <MobileNav />

        {/* Search trigger — pill style (SugarCRM premium) */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
          className={cn(
            'hidden md:flex items-center gap-2.5 rounded-full px-4 h-10 w-64',
            'bg-white dark:bg-slate-900 shadow-pill',
            'text-sm text-muted-foreground',
            'hover:shadow-md transition-shadow duration-150 cursor-pointer',
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="flex-1 text-left text-sm">Qidiruv...</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 font-mono text-[10px] text-slate-500">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right — actions (floating pills) */}
      <div className="flex items-center gap-2">
        {/* Branch switcher */}
        <BranchSwitcher />

        {/* Theme toggle — circular pill button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Temani almashtirish"
          className={cn(
            'relative flex h-10 w-10 items-center justify-center',
            'rounded-full bg-white dark:bg-slate-900 shadow-pill',
            'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
            'hover:shadow-md transition-all duration-150',
          )}
        >
          <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Temani almashtirish</span>
        </button>

        {/* Notifications */}
        <NotificationDrawer />

        {/* User menu — floating pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 ml-2',
              'bg-white dark:bg-slate-900 shadow-pill',
              'hover:shadow-md transition-all duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}>
              <Avatar className={cn(
                'h-8 w-8 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 transition-all',
                avatarRingColor,
              )}>
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {user ? getInitials(user.firstName, user.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <p className="text-sm font-medium leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-px">
                  {user ? getRoleLabel(user.role) : ''}
                </p>
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground ml-0.5" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 shadow-elevated">
            {/* User info */}
            <DropdownMenuLabel className="pb-1">
              <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">{user ? getRoleLabel(user.role) : ''}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Personal */}
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              Sozlamalar
            </DropdownMenuItem>

            {/* Admin-only system items */}
            {user && ['director', 'school_admin', 'vice_principal', 'super_admin'].includes(user.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground/70 py-0.5">
                  Tizim
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/dashboard/audit-log')} className="cursor-pointer">
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" />
                  Audit Log
                </DropdownMenuItem>
                {user.role === 'super_admin' && (
                  <>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/schools')} className="cursor-pointer">
                      <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" />
                      Maktablar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/system-health')} className="cursor-pointer">
                      <Activity className="mr-2 h-4 w-4 text-muted-foreground" />
                      Tizim holati
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/8"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
