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
  branch_admin:   'ring-orange-400',
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
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    logout();
    // Full page reload so middleware runs and clears any stale cookie state
    window.location.href = '/login';
  };

  const ringColor = user ? (ROLE_COLORS[user.role] ?? 'ring-emerald-500') : 'ring-emerald-500';

  return (
    <header
      className="flex h-[74px] shrink-0 items-center justify-between gap-4 rounded-2xl px-5"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(226,232,240,0.7)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* Left: mobile nav + search */}
      <div className="flex items-center gap-3">
        <MobileNav />
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
          className="hidden md:flex items-center gap-2.5 rounded-full h-[42px] px-4 w-[360px] transition-colors cursor-pointer"
          style={{
            background: '#F7F8F8',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="flex-1 text-left text-[13px] text-slate-400">Qidiruv...</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded-md bg-slate-200/80 px-1.5 font-mono text-[10px] text-slate-500 tracking-tight">⌘K</kbd>
        </button>
      </div>

      {/* Center: contextual page actions */}
      <div className="flex flex-1 items-center justify-center">
        <HeaderActionsSlot />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <BranchSwitcher />

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="relative flex h-[42px] w-[42px] items-center justify-center rounded-full transition-colors text-slate-500 hover:text-slate-700"
          style={{ background: '#F7F8F8', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <Sun  className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </button>

        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full"
          style={{ background: '#F7F8F8', border: '1px solid rgba(0,0,0,0.06)' }}>
          <NotificationDrawer />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2.5 rounded-full pl-2 pr-4 ml-0.5',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
              'transition-all duration-200 hover:shadow-sm',
            )}
            style={{
              height: '52px',
              background: '#F7F8F8',
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <Avatar className={cn('h-8 w-8 ring-2 ring-offset-1 ring-offset-white shrink-0', ringColor)}>
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-[11px] font-bold bg-emerald-50 text-emerald-700">
                  {user ? getInitials(user.firstName, user.lastName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <p className="text-[13px] font-semibold leading-tight text-slate-800">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{user ? getRoleLabel(user.role) : ''}</p>
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400 ml-1 shrink-0" />
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
            {user && ['director', 'vice_principal', 'super_admin'].includes(user.role) && (
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
