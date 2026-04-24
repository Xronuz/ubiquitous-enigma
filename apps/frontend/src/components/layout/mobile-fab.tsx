'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, ClipboardCheck, BookOpen, MessageSquare,
  Calendar, GraduationCap, BookMarked,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

interface FabAction {
  label: string;
  icon: React.ElementType;
  href: string;
  color: string;
  roles?: string[];
}

const FAB_ACTIONS: FabAction[] = [
  {
    label: 'Davomat',
    icon: ClipboardCheck,
    href: '/dashboard/attendance',
    color: 'bg-green-500 hover:bg-green-600',
    roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    label: 'Baho',
    icon: BookOpen,
    href: '/dashboard/grades',
    color: 'bg-blue-500 hover:bg-blue-600',
    roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    label: 'Imtihon',
    icon: GraduationCap,
    href: '/dashboard/exams',
    color: 'bg-orange-500 hover:bg-orange-600',
    roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher'],
  },
  {
    label: 'Vazifa',
    icon: BookMarked,
    href: '/dashboard/homework',
    color: 'bg-violet-500 hover:bg-violet-600',
    roles: ['teacher', 'class_teacher'],
  },
  {
    label: 'Jadval',
    icon: Calendar,
    href: '/dashboard/schedule',
    color: 'bg-teal-500 hover:bg-teal-600',
    roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'],
  },
  {
    label: 'Xabar',
    icon: MessageSquare,
    href: '/dashboard/messages',
    color: 'bg-pink-500 hover:bg-pink-600',
    roles: ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'],
  },
];

export function MobileFab() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const role = user?.role ?? '';

  // Only show for staff roles, not student/parent/super_admin
  const staffRoles = ['school_admin', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'];
  if (!staffRoles.includes(role)) return null;

  const actions = FAB_ACTIONS.filter(a => !a.roles || a.roles.includes(role));

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action buttons — stacked above the FAB */}
      <div
        className={`fixed bottom-20 right-4 z-50 flex flex-col-reverse gap-3 transition-all duration-200 md:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {actions.map(({ label, icon: Icon, href, color }) => (
          <div key={href} className="flex items-center gap-3 justify-end">
            {/* Label tooltip */}
            <span className={`rounded-full bg-foreground text-background text-xs font-medium px-2.5 py-1 shadow-md transition-all ${open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
              {label}
            </span>
            <button
              onClick={() => { router.push(href); setOpen(false); }}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg ${color} transition-transform active:scale-95`}
            >
              <Icon className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB button — dark premium emphasis */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_8px_24px_rgba(15,23,42,0.35)] text-white transition-all duration-200 active:scale-95 md:hidden ${
          open ? 'bg-slate-700 rotate-45' : 'bg-slate-900 hover:bg-slate-800'
        }`}
        aria-label="Tezkor amallar"
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </>
  );
}
