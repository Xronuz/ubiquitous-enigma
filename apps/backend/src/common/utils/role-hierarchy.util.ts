import { ForbiddenException } from '@nestjs/common';
import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * Rol ierarxiyasi: yuqori son = ko'proq huquq.
 * Bir rol o'z darajasidan QAT'IY past rolni boshqarishi mumkin.
 */
export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.DIRECTOR]: 80,
  [UserRole.VICE_PRINCIPAL]: 60,
  [UserRole.BRANCH_ADMIN]: 40,
  [UserRole.ACCOUNTANT]: 20,
  [UserRole.LIBRARIAN]: 20,
  [UserRole.CLASS_TEACHER]: 15,
  [UserRole.TEACHER]: 10,
  [UserRole.PARENT]: 5,
  [UserRole.STUDENT]: 5,
};

/** actor target'dan qat'iy yuqorimi? */
export function isHigherRole(actor: UserRole, target: UserRole): boolean {
  return (ROLE_RANK[actor] ?? 0) > (ROLE_RANK[target] ?? 0);
}

/**
 * actor target'ni boshqara oladimi (block/unblock/delete/role-change)?
 * Qoidalar:
 * - SUPER_ADMIN faqat boshqa SUPER_ADMINni boshqara olmaydi (boshqalarni ha)
 * - O'z-o'ziga teginish — alohida `assertNotSelf` orqali tekshiriladi
 * - Boshqa rollar faqat o'zidan past rolni boshqarishi mumkin
 */
export function canManageUser(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  if (actorRole === UserRole.SUPER_ADMIN) {
    return targetRole !== UserRole.SUPER_ADMIN;
  }
  return isHigherRole(actorRole, targetRole);
}

/** O'zini-o'zi boshqarmaslik (block, delete) */
export function assertNotSelf(actorId: string, targetId: string): void {
  if (actorId === targetId) {
    throw new ForbiddenException("O'zingizga nisbatan bu amalni bajara olmaysiz");
  }
}

/** Target rolni boshqarish huquqini tekshirish — yo'q bo'lsa Forbidden tashlash */
export function assertCanManage(
  actor: JwtPayload,
  targetRole: UserRole,
): void {
  if (!canManageUser(actor.role as UserRole, targetRole)) {
    throw new ForbiddenException(
      `"${actor.role}" "${targetRole}" rolidagi foydalanuvchini boshqara olmaydi`,
    );
  }
}

/**
 * Foydalanuvchilar ro'yxatida ko'rinadigan rollarni filtrlash:
 * actor o'zidan QAT'IY yuqori rollarni ko'rmasligi kerak (super_admin yopishi).
 * SUPER_ADMIN hammani ko'radi.
 */
export function buildVisibleRoleFilter(actorRole: UserRole): { notIn?: UserRole[] } | undefined {
  if (actorRole === UserRole.SUPER_ADMIN) return undefined;
  const hidden = (Object.keys(ROLE_RANK) as UserRole[]).filter(
    (r) => (ROLE_RANK[r] ?? 0) > (ROLE_RANK[actorRole] ?? 0),
  );
  return hidden.length ? { notIn: hidden } : undefined;
}
