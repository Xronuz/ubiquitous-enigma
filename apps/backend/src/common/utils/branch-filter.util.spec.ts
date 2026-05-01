import { branchFilter, isBranchScoped, canAccessBranch } from './branch-filter.util';
import { UserRole } from '@eduplatform/types';

describe('branchFilter', () => {
  const schoolId = 'school-1';

  const makeUser = (role: UserRole, branchId?: string) =>
    ({ schoolId, role, branchId: branchId ?? null, sub: 'user-1', email: 'test@test.com' }) as any;

  it('super_admin → schoolId only (all branches)', () => {
    const result = branchFilter(makeUser(UserRole.SUPER_ADMIN));
    expect(result).toEqual({ schoolId });
  });

  it('school_admin → schoolId only (all branches)', () => {
    const result = branchFilter(makeUser(UserRole.SCHOOL_ADMIN));
    expect(result).toEqual({ schoolId });
  });

  it('director → schoolId only (all branches)', () => {
    const result = branchFilter(makeUser(UserRole.DIRECTOR));
    expect(result).toEqual({ schoolId });
  });

  it('teacher + branchId → schoolId + branchId', () => {
    const result = branchFilter(makeUser(UserRole.TEACHER, 'branch-a'));
    expect(result).toEqual({ schoolId, branchId: 'branch-a' });
  });

  it('branch_admin + branchId → schoolId + branchId', () => {
    const result = branchFilter(makeUser(UserRole.BRANCH_ADMIN, 'branch-b'));
    expect(result).toEqual({ schoolId, branchId: 'branch-b' });
  });

  it('scoped role without branchId → schoolId only (fallback)', () => {
    const result = branchFilter(makeUser(UserRole.TEACHER));
    expect(result).toEqual({ schoolId });
  });

  it('overrideBranchId always wins', () => {
    const result = branchFilter(makeUser(UserRole.SUPER_ADMIN), 'override-1');
    expect(result).toEqual({ schoolId, branchId: 'override-1' });
  });

  it('overrideBranchId works for scoped roles too', () => {
    const result = branchFilter(makeUser(UserRole.TEACHER, 'branch-a'), 'override-2');
    expect(result).toEqual({ schoolId, branchId: 'override-2' });
  });
});

describe('isBranchScoped', () => {
  const makeUser = (role: UserRole, branchId?: string) =>
    ({ schoolId: 's1', role, branchId: branchId ?? null, sub: 'u1', email: 't@t.com' }) as any;

  it('super_admin → false', () => {
    expect(isBranchScoped(makeUser(UserRole.SUPER_ADMIN))).toBe(false);
  });

  it('teacher + branchId → true', () => {
    expect(isBranchScoped(makeUser(UserRole.TEACHER, 'b1'))).toBe(true);
  });

  it('teacher without branchId → false', () => {
    expect(isBranchScoped(makeUser(UserRole.TEACHER))).toBe(false);
  });
});

describe('canAccessBranch', () => {
  const makeUser = (role: UserRole, branchId?: string) =>
    ({ schoolId: 's1', role, branchId: branchId ?? null, sub: 'u1', email: 't@t.com' }) as any;

  it('super_admin can access any branch', () => {
    expect(canAccessBranch(makeUser(UserRole.SUPER_ADMIN), 'any-branch')).toBe(true);
  });

  it('teacher can access own branch', () => {
    expect(canAccessBranch(makeUser(UserRole.TEACHER, 'b1'), 'b1')).toBe(true);
  });

  it('teacher cannot access other branch', () => {
    expect(canAccessBranch(makeUser(UserRole.TEACHER, 'b1'), 'b2')).toBe(false);
  });
});
