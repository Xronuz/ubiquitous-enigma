'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

/**
 * ROLE_ROUTE_MAP — qaysi route qaysi rollar uchun ruxsat etilgan.
 * Agar route bu ro'yxatda bo'lmasa, barcha authenticated user'larga ochiq.
 */
export const ROLE_ROUTE_MAP: Record<string, string[]> = {
  // Admin-only routes
  '/dashboard/users': ['super_admin', 'school_admin', 'director', 'vice_principal'],
  '/dashboard/staff': ['super_admin', 'school_admin', 'director', 'vice_principal'],
  '/dashboard/branches': ['super_admin', 'school_admin', 'director', 'vice_principal'],
  '/dashboard/crm': ['super_admin', 'school_admin', 'director', 'vice_principal'],
  '/dashboard/discipline': ['super_admin', 'school_admin', 'director', 'vice_principal', 'class_teacher'],
  '/dashboard/meetings': ['super_admin', 'school_admin', 'director', 'vice_principal'],
  '/dashboard/leave-requests': ['super_admin', 'school_admin', 'director', 'vice_principal'],

  // Finance routes
  '/dashboard/finance': ['super_admin', 'school_admin', 'director', 'vice_principal', 'accountant'],
  '/dashboard/payments': ['super_admin', 'school_admin', 'director', 'vice_principal', 'accountant'],
  '/dashboard/payroll': ['super_admin', 'school_admin', 'director', 'vice_principal', 'accountant'],
  '/dashboard/fee-structures': ['super_admin', 'school_admin', 'director', 'vice_principal', 'accountant'],

  // Education / Academic routes
  '/dashboard/education': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/students': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/classes': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/subjects': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/academic-calendar': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],

  // Reports
  '/dashboard/reports': ['super_admin', 'school_admin', 'director', 'vice_principal', 'accountant', 'teacher', 'class_teacher'],

  // Student routes
  '/dashboard/student': ['student'],
  '/dashboard/parent': ['parent'],

  // System
  '/dashboard/schools': ['super_admin'],
  '/dashboard/system-health': ['super_admin'],
  '/dashboard/audit': ['super_admin', 'school_admin', 'director'],

  // Resources
  '/dashboard/resources': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin'],
  '/dashboard/library': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin'],
  '/dashboard/learning-center': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  '/dashboard/clubs': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  '/dashboard/coins': ['super_admin', 'school_admin', 'director', 'vice_principal', 'student', 'parent'],
  '/dashboard/canteen': ['super_admin', 'school_admin', 'director', 'vice_principal', 'branch_admin'],
  '/dashboard/transport': ['super_admin', 'school_admin', 'director', 'vice_principal', 'branch_admin'],

  // Shared academic (student + teacher)
  '/dashboard/schedule': ['student', 'teacher', 'class_teacher', 'school_admin', 'vice_principal', 'director', 'branch_admin'],
  '/dashboard/grades': ['student', 'teacher', 'class_teacher', 'school_admin', 'vice_principal', 'director', 'branch_admin'],
  '/dashboard/exams': ['student', 'teacher', 'class_teacher', 'school_admin', 'vice_principal', 'director', 'branch_admin'],
  '/dashboard/homework': ['student', 'teacher', 'class_teacher', 'school_admin', 'vice_principal', 'director', 'branch_admin'],
  '/dashboard/attendance': ['student', 'teacher', 'class_teacher', 'school_admin', 'vice_principal', 'director', 'branch_admin'],
  '/dashboard/attendance/bulk': ['school_admin', 'vice_principal', 'director', 'class_teacher'],

  // Communication
  '/dashboard/comms': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/messages': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/notifications': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/announcements': ['super_admin', 'school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
};

/**
 * Tekshiradi: berilgan role uchun bu route ruxsat etilganmi?
 */
export function canAccessRoute(role: string | undefined, pathname: string): boolean {
  if (!role) return false;

  // To'liq mos keladigan route'ni qidiramiz
  const exactMatch = ROLE_ROUTE_MAP[pathname];
  if (exactMatch) {
    return exactMatch.includes(role);
  }

  // Agar aniq moslik bo'lmasa, parent route'ni qidiramiz
  // (masalan: /dashboard/users/123 → /dashboard/users)
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 1; i--) {
    const partialPath = '/' + segments.slice(0, i + 1).join('/');
    const partialMatch = ROLE_ROUTE_MAP[partialPath];
    if (partialMatch) {
      return partialMatch.includes(role);
    }
  }

  // Ro'yxatda bo'lmagan route → barcha authenticated user'larga ochiq
  return true;
}

/**
 * Role-based route guard hook.
 * Agar user ruxsat etilmagan bo'lsa, redirect qiladi.
 */
export function useRoleGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const allowed = canAccessRoute(user.role, pathname);
    if (!allowed) {
      // Ruxsat yo'q → role'ga mos dashboard'ga yuboramiz
      switch (user.role) {
        case 'student':
          router.replace('/dashboard/student');
          break;
        case 'parent':
          router.replace('/dashboard/parent');
          break;
        case 'accountant':
          router.replace('/dashboard/finance');
          break;
        case 'librarian':
          router.replace('/dashboard/resources');
          break;
        case 'teacher':
        case 'class_teacher':
          router.replace('/dashboard/education');
          break;
        default:
          router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, user, pathname, router]);
}

/**
 * Reusable RoleGuard wrapper component.
 */
interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback ?? (
      <div className="flex h-[60vh] flex-col items-center justify-center text-slate-500">
        <h2 className="text-xl font-semibold text-slate-700">Ruxsat yo&apos;q</h2>
        <p className="mt-2">Bu sahifani ko&apos;rish huquqiga ega emassiz.</p>
      </div>
    );
  }

  return <>{children}</>;
}
