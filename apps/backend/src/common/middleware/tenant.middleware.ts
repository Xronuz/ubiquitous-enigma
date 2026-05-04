import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

/**
 * TenantMiddleware
 *
 * Har bir so'rov uchun ikki qatlam tenant izolyatsiyasi:
 *
 * 1. Validatsiya qatlami:
 *    - schoolId va branchId majburiy
 *    - schoolId yo'q bo'lsa → 403 Forbidden
 *
 * 2. PostgreSQL RLS qatlami:
 *    - `SET app.current_school_id = '<uuid>'` — session variable
 *    - `SET app.is_super_admin = 'true/false'`
 *    - PostgreSQL RLS policy lar shu variableni o'qiydi
 *
 * req.tenantId, req.isSuperAdmin set qilinadi.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // JWT ni middleware darajasida o'zimiz decode qilamiz (guarddan OLDIN)
    const user = this.extractUser(req);

    // Auth guard o'rnatmagan (public endpoint) yoki token yaroqsiz
    if (!user) {
      return next();
    }

    const isSuperAdmin = user.role === 'super_admin';

    // super_admin schoolId talab qilmaydi — platformani boshqaradi
    if (isSuperAdmin) {
      (req as any).tenantId = null;
      (req as any).isSuperAdmin = true;
      await this.prisma.setTenantContext(null, true);
      return next();
    }

    // Boshqa barcha rollar uchun schoolId majburiy
    if (!user.schoolId) {
      throw new ForbiddenException('Maktab tayinlanmagan foydalanuvchi');
    }

    // Request ga tenant context qo'shish
    (req as any).tenantId = user.schoolId;
    (req as any).isSuperAdmin = false;

    // PostgreSQL session variable o'rnatish (RLS uchun)
    await this.prisma.setTenantContext(user.schoolId, false);

    next();
  }

  /**
   * Request'dan tokenni olib, JWT ni verify qiladi.
   * NestJS lifecycle'da middleware guard'dan OLDIN ishlaydi,
   * shuning uchun req.user hali yo'q — o'zimiz decode qilishimiz kerak.
   */
  private extractUser(req: Request): JwtPayload | null {
    const token = this.extractToken(req);
    if (!token) return null;

    try {
      return this.jwtService.verify(token) as JwtPayload;
    } catch {
      // Token yaroqsiz yoki muddati o'tgan — guard keyin tekshiradi
      return null;
    }
  }

  /**
   * Tokenni Authorization header yoki cookie'dan oladi.
   */
  private extractToken(req: Request): string | undefined {
    // 1. Authorization header (Bearer)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // 2. Cookie (access_token)
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    return undefined;
  }
}
