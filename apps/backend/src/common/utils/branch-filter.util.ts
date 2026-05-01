import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * SCHOOL_WIDE_ROLES — bu rollar barcha filiallarga kirish huquqiga ega.
 * branchId filter QOLLANILMAYDI, faqat schoolId bo'yicha ko'radi.
 */
export const SCHOOL_WIDE_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.DIRECTOR,
]);

/**
 * branchFilter(user, overrideBranchId?)
 *
 * Prisma `where` clauseiga qo'shiladigan tenant + branch filter.
 *
 * Logika:
 * - SUPER_ADMIN / SCHOOL_ADMIN / DIRECTOR → { schoolId } (hamma filialni ko'radi)
 * - BRANCH_ADMIN / VICE_PRINCIPAL / TEACHER / ... → { schoolId, branchId }
 *   (faqat o'z filialini ko'radi)
 * - overrideBranchId berilsa — SCHOOL_WIDE rollar uchun ham branchId filtr
 *   qo'shiladi (masalan: director aniq bir filialning hisobotini ko'rmoqchi)
 *
 * @example
 * // Barcha xodimlarni faqat o'z filialida ko'rsatish
 * const users = await prisma.user.findMany({
 *   where: {
 *     ...branchFilter(currentUser),
 *     isActive: true,
 *   },
 * });
 *
 * @example
 * // Director aniq bir filialning to'lovlarini ko'rmoqchi
 * const payments = await prisma.payment.findMany({
 *   where: branchFilter(currentUser, query.branchId),
 * });
 */
export function branchFilter(
  user: JwtPayload,
  overrideBranchId?: string | null,
): { schoolId: string; branchId?: string } {
  const schoolId = user.schoolId!;

  // Admin/director tomonidan explicit filial tanlangan
  if (overrideBranchId) {
    return { schoolId, branchId: overrideBranchId };
  }

  // School-wide rollar: barcha filiallarni ko'radi
  if (SCHOOL_WIDE_ROLES.has(user.role)) {
    return { schoolId };
  }

  // Branch-scoped rollar: faqat o'z filiali
  if (user.branchId) {
    return { schoolId, branchId: user.branchId };
  }

  // branchId yo'q branch-scoped user — xavfsizlik uchun faqat schoolId
  // (bu holat to'g'ri konfiguratsiyada bo'lmasligi kerak)
  return { schoolId };
}

/**
 * isBranchScoped(user)
 *
 * Foydalanuvchi filialga bog'liqmi yoki yo'qmi tekshiradi.
 * Guard va service larda qo'shimcha tekshiruv uchun.
 */
export function isBranchScoped(user: JwtPayload): boolean {
  return !SCHOOL_WIDE_ROLES.has(user.role) && !!user.branchId;
}

/**
 * canAccessBranch(user, targetBranchId)
 *
 * Foydalanuvchi berilgan filialga kirish huquqi bor-yo'qligini tekshiradi.
 * Controller va service larda authorization uchun.
 *
 * @example
 * if (!canAccessBranch(currentUser, params.branchId)) {
 *   throw new ForbiddenException('Bu filialga kirish taqiqlangan');
 * }
 */
export function canAccessBranch(user: JwtPayload, targetBranchId: string): boolean {
  // School-wide rollar barcha filiallarga kira oladi
  if (SCHOOL_WIDE_ROLES.has(user.role)) return true;
  // Branch-scoped foydalanuvchi faqat o'z filialiga kira oladi
  return user.branchId === targetBranchId;
}
