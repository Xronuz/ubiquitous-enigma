'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { canAccessRoute, ROLE_HOME, type UserRole } from '@/config/permissions';

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
      const home = ROLE_HOME[user.role as UserRole] ?? '/dashboard';
      router.replace(home);
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
      <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <p className="text-lg font-medium">Ruxsat yo'q</p>
        <p className="text-sm">Bu sahifani ko'rish uchun huquqingiz yetarli emas</p>
      </div>
    );
  }

  return <>{children}</>;
}
