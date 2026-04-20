import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Controller parameter decorator — TenantMiddleware/BranchContextMiddleware
 * tomonidan req.branchContext ga yozilgan qiymatni oladi.
 *
 * Ishlatish:
 *   findAll(@CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null)
 */
export const BranchContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return (request as any).branchContext ?? null;
  },
);
