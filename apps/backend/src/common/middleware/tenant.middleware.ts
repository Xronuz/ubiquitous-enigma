import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

/** School-wide rollar: barcha filiallarga kirish, branchId filter yo'q */
const SCHOOL_WIDE_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.DIRECTOR,
]);

/** Bu rollar x-branch-id header orqali filial tanlashi mumkin */
const CAN_OVERRIDE_BRANCH = SCHOOL_WIDE_ROLES;

/**
 * TenantMiddleware
 *
 * Har bir so'rov uchun ikki qatlam tenant izolyatsiyasi + branch context:
 *
 * 1. Validatsiya qatlami:
 *    - Super admin → har qanday maktabga kirish (bypass)
 *    - Boshqa rollar → schoolId mavjudligi tekshiriladi
 *    - schoolId yo'q bo'lsa → 403 Forbidden
 *
 * 2. PostgreSQL RLS qatlami:
 *    - `SET app.current_school_id = '<uuid>'` — session variable
 *    - `SET app.is_super_admin = 'true/false'`
 *    - PostgreSQL RLS policy lar shu variableni o'qiydi
 *
 * 3. Branch context (YANGI):
 *    - `req.branchContext` — aktiv filial ID (null = barcha filiallar)
 *    - x-branch-id header → faqat school-wide rollar uchun override
 *    - Oddiy foydalanuvchi → user.branchId (JWT dan)
 *
 * req.tenantId, req.isSuperAdmin, req.branchContext set qilinadi.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as JwtPayload | undefined;

    // Auth guard o'rnatmagan (public endpoint) — o'tkazib yuborish
    if (!user) {
      (req as any).branchContext = null;
      return next();
    }

    const isSuperAdmin = user.role === 'super_admin';

    // Super admin — barcha maktablarga kirish huquqi bor
    if (isSuperAdmin) {
      (req as any).tenantId = null;
      (req as any).isSuperAdmin = true;
      (req as any).branchContext = this.resolveBranchContext(req, user);
      await this.prisma.setTenantContext(null, true);
      return next();
    }

    // Boshqa rollar uchun schoolId majburiy
    if (!user.schoolId) {
      throw new ForbiddenException('Maktab tayinlanmagan foydalanuvchi');
    }

    // Request ga tenant context qo'shish
    (req as any).tenantId = user.schoolId;
    (req as any).isSuperAdmin = false;
    (req as any).branchContext = this.resolveBranchContext(req, user);

    // PostgreSQL session variable o'rnatish (RLS uchun)
    await this.prisma.setTenantContext(user.schoolId, false);

    next();
  }

  /**
   * branchContext ni aniqlash:
   * - school-wide rol + x-branch-id header → override
   * - boshqalar → user.branchId (JWT) yoki null
   */
  private resolveBranchContext(req: Request, user: JwtPayload): string | null {
    const headerBranchId = req.headers['x-branch-id'] as string | undefined;
    if (headerBranchId && CAN_OVERRIDE_BRANCH.has(user.role)) {
      return headerBranchId;
    }
    return user.branchId ?? null;
  }
}
