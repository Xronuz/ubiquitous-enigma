import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * buildTenantWhere(user)
 *
 * Universal tenant filter for Prisma `where` clauses.
 * - super_admin → no filters (platform-wide access)
 * - schoolId is always required for non-super-admin
 * - branchId is included only when present in JWT (directors may have null branchId → school-wide)
 */
export function buildTenantWhere(user: JwtPayload): { schoolId?: string; branchId?: string } {
  if (user.isSuperAdmin || user.role === UserRole.SUPER_ADMIN) {
    return {}; // Super admin sees everything
  }
  const where: { schoolId: string; branchId?: string } = { schoolId: user.schoolId! };
  if (user.branchId) where.branchId = user.branchId;
  return where;
}
