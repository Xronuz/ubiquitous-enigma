import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TenantMiddleware
 *
 * Har bir so'rov uchun ikki qatlam tenant izolyatsiyasi:
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
 * Qo'shimcha: `req.tenantId` va `req.isSuperAdmin` set qilinadi —
 * service lardan `@Request() req` orqali foydalanish mumkin.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    // Auth guard o'rnatmagan (public endpoint) — o'tkazib yuborish
    if (!user) return next();

    const isSuperAdmin = user.role === 'super_admin';

    // Super admin — barcha maktablarga kirish huquqi bor
    if (isSuperAdmin) {
      (req as any).tenantId = null;
      (req as any).isSuperAdmin = true;
      await this.prisma.setTenantContext(null, true);
      return next();
    }

    // Boshqa rollar uchun schoolId majburiy
    if (!user.schoolId) {
      throw new ForbiddenException('Maktab tayinlanmagan foydalanuvchi');
    }

    // Request ga tenant context qo'shish (service larda ishlatilishi mumkin)
    (req as any).tenantId = user.schoolId;
    (req as any).isSuperAdmin = false;

    // PostgreSQL session variable o'rnatish (RLS uchun)
    await this.prisma.setTenantContext(user.schoolId, false);

    next();
  }
}
