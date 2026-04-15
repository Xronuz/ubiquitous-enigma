import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';

/**
 * Checks that the school has an active or trial subscription.
 * Apply with @UseGuards(SubscriptionGuard) on routes that require active subscription.
 * super_admin always bypasses this check.
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!user) return false;

    // super_admin bypasses subscription check
    if (user.role === 'super_admin') return true;

    // Users without schoolId (shouldn't happen, but safe guard)
    if (!user.schoolId) return false;

    const school = await this.prisma.school.findUnique({
      where: { id: user.schoolId },
      select: { isActive: true },
    });

    if (!school?.isActive) {
      throw new ForbiddenException(
        'Maktab obunasi faol emas. Iltimos, administrator bilan bog\'laning.',
      );
    }

    // Check subscription record if it exists
    const subscription = await this.prisma.subscription.findUnique({
      where: { schoolId: user.schoolId },
      select: { status: true, trialEndsAt: true, nextBilling: true },
    });

    if (!subscription) return true; // No subscription record → allow (new school)

    const now = new Date();

    if (subscription.status === 'active') return true;

    if (subscription.status === 'trial') {
      if (!subscription.trialEndsAt || subscription.trialEndsAt > now) return true;
      throw new ForbiddenException('Sinov muddati tugadi. Obunani yangilang.');
    }

    if (subscription.status === 'expired' || subscription.status === 'cancelled' || subscription.status === 'inactive') {
      throw new ForbiddenException(
        'Obuna muddati tugadi yoki bekor qilindi. Iltimos, to\'lovni amalga oshiring.',
      );
    }

    return true;
  }
}
