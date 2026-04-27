'use client';

import { useRouter } from 'next/navigation';
import {
  LogOut, Moon, Sun, Search, User, ChevronDown,
  Settings, ClipboardList, GraduationCap, Activity,
} from 'lucide-react';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NotificationDrawer } from '@/components/layout/notification-drawer';
import { BranchSwitcher } from '@/components/layout/branch-switcher';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth';
import { getInitials, getRoleLabel } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { HeaderActionsSlot } from '@/lib/header-actions-context';

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
  super_admin:    'ring-emerald-500',
};

export function Header() {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, logout, refreshToken } = useAuthStore();

  const handleLogout = async () => {
    try { if (refreshToken) await authApi.logout(refreshToken); } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  const ringColor = user ? (ROLE_COLORS[user.role] ?? 'ring-emerald-500') : 'ring-emerald-500';

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between gap-3 rounded-2xl px-4"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(226,232,240,0.8)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Left: mobile nav + search */}
      <div className="flex items-center gap-2.5">
        <MobileNav />
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="hidden md:flex items-center gap-2 rounded-full h-9 px-3.5 w-52 bg-slate-50 border border-slate-200 text-[13px] text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Qidiruv...</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded bg-slate-200 px-1.5 font-mono text-[10px] text-slate-500">⌘K</kbd>
        </button>
      </div>

      {/* Center: contextual page actions */}
      <div className="flex flex-1 items-center justify-center">
        <HeaderActionsSlot />
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <BranchSwitcher />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-slate-500"
        >
          <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <NotificationDrawer />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 ml-1',
              'bg-slate-50 border border-slate-200',
              'hover:bg-slate-100 transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
            )}>
              <Avatar className={cn('h-7 w-7 ring-2 ring-offset-1 ring-offset-white', ringColor)}>
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                  {user ? getInitials(user.firstName, user.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <p className="text-[13px] font-semibold leading-tight text-slate-700">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-400 leading-tight">{user ? getRoleLabel(user.role) : ''}</p>
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400 ml-0.5" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="pb-1">
              <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">{user ? getRoleLabel(user.role) : ''}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-muted-foreground" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> Sozlamalar
            </DropdownMenuItem>
            {user && ['director', 'school_admin', 'vice_principal', 'super_admin'].includes(user.role) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground/70 py-0.5">Tizim</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/dashboard/audit-log')} className="cursor-pointer">
                  <ClipboardList className="mr-2 h-4 w-4 text-muted-foreground" /> Audit Log
                </DropdownMenuItem>
                {user.role === 'super_admin' && (
                  <>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/schools')} className="cursor-pointer">
                      <GraduationCap className="mr-2 h-4 w-4 text-muted-foreground" /> Maktablar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/system-health')} className="cursor-pointer">
                      <Activity className="mr-2 h-4 w-4 text-muted-foreground" /> Tizim holati
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/8">
              <LogOut className="mr-2 h-4 w-4" /> Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
