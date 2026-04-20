import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * SCHOOL_WIDE_ROLES — bu rollar uchun x-branch-id header
 * orqali boshqa filialga switch qilish ruxsat etiladi.
 */
const CAN_OVERRIDE_BRANCH = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.DIRECTOR,
]);

/**
 * BranchContextMiddleware
 *
 * Har bir request uchun filial kontekstini aniqlaydi va
 * `req.branchContext` ga joylashtiradi.
 *
 * Manba ierarxiyasi (ustuvorlik tartibida):
 * 1. `x-branch-id` header (faqat school-wide rollar uchun)
 * 2. `user.branchId` (JWT tokendan)
 * 3. null (filial filtri qo'llanilmaydi)
 *
 * Frontend qanday ishlatadi:
 * - Oddiy foydalanuvchi: token ichidagi branchId avtomatik ishlatiladi
 * - Director/admin boshqa filialga o'tish uchun:
 *   `axios.defaults.headers['x-branch-id'] = selectedBranchId`
 *
 * @example Backend serviceda:
 * ```typescript
 * const overrideBranchId = (req as any).branchContext;
 * const filter = branchFilter(currentUser, overrideBranchId);
 * ```
 */
@Injectable()
export class BranchContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as JwtPayload | undefined;

    // Auth guard o'rnatmagan (public endpoint) — o'tkazib yuborish
    if (!user) {
      (req as any).branchContext = null;
      return next();
    }

    const headerBranchId = req.headers['x-branch-id'] as string | undefined;

    if (headerBranchId && CAN_OVERRIDE_BRANCH.has(user.role)) {
      // School-wide rol: admin/director boshqa filialga switch qilmoqchi
      (req as any).branchContext = headerBranchId;
    } else {
      // Oddiy foydalanuvchi: JWT dan kelgan branchId
      (req as any).branchContext = user.branchId ?? null;
    }

    next();
  }
}
