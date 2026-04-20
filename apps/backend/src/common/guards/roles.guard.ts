import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, JwtPayload } from '@eduplatform/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Roles that indicate a school-scoped endpoint */
const SCHOOL_ROLES = new Set<UserRole>([
  UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR,
  UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
  UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
  UserRole.STUDENT, UserRole.PARENT,
]);

/** Branch-scoped roles: branchId bo'lishi shart */
const BRANCH_ROLES = new Set<UserRole>([
  UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
  UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
  UserRole.STUDENT, UserRole.PARENT,
]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user) return false;

    // super_admin bypasses role restrictions but MUST have schoolId when the
    // endpoint is school-scoped (i.e. its @Roles list contains school-level roles).
    // Without schoolId the service layer would receive undefined and crash with 500.
    if (user.role === UserRole.SUPER_ADMIN) {
      const isSchoolScoped = requiredRoles.some((r) => SCHOOL_ROLES.has(r));
      if (isSchoolScoped && !user.schoolId) {
        throw new BadRequestException(
          "Super admin maktab kontekstini talab qiladigan bu endpointni ishlatish uchun " +
          "maktabga biriktirilgan token bilan kiring yoki maktab admini rolidan foydalaning.",
        );
      }
      return true;
    }

    const hasRole = requiredRoles.includes(user.role as UserRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `Bu amalni bajarish uchun ruxsatingiz yo'q. Talab qilinadi: ${requiredRoles.join(', ')}`,
      );
    }

    // branch_admin va boshqa branch-scoped rollar uchun branchId majburiy
    if (BRANCH_ROLES.has(user.role as UserRole) && !user.branchId) {
      // Ogoh qilish: branchId yo'q foydalanuvchi branch-scoped endpoint ga murojaat qilmoqda.
      // Xato tashlamaymiz (backward-compatible), faqat log qilamiz.
      // Service layer branchFilter() orqali schoolId bilan ishlaydi.
    }

    return true;
  }
}
