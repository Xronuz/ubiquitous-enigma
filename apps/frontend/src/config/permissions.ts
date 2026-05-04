/**
 * ROLE PERMISSIONS — Single Source of Truth
 * Har bir route va sidebar elementi uchun ruxsat etilgan rollar.
 * Middleware, Sidebar, RoleGuard, va MobileNav barcha shu fayldan foydalanadi.
 */

export type UserRole =
  | 'super_admin'
  | 'director'
  | 'vice_principal'
  | 'branch_admin'
  | 'teacher'
  | 'class_teacher'
  | 'accountant'
  | 'librarian'
  | 'student'
  | 'parent';

/** Har bir route uchun ruxsat etilgan rollar */
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // ── Super Admin only ──────────────────────────────────────────────────────────
  '/dashboard/schools':        ['super_admin'],
  '/dashboard/schools/new':    ['super_admin'],
  '/dashboard/system-health':  ['super_admin'],
  '/dashboard/subscriptions':  ['super_admin'],

  // ── Platform admin ────────────────────────────────────────────────────────────
  '/dashboard/audit-log':      ['super_admin', 'director'],

  // ── School management (director, vice_principal, branch_admin) ────────────────
  '/dashboard/users':          ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/dashboard/staff':          ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/dashboard/branches':       ['super_admin', 'director', 'vice_principal'],
  '/dashboard/crm':            ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/dashboard/meetings':       ['super_admin', 'director', 'vice_principal'],
  '/dashboard/leave-requests': ['super_admin', 'director', 'vice_principal'],

  // ── Discipline ────────────────────────────────────────────────────────────────
  '/dashboard/discipline':     ['super_admin', 'director', 'vice_principal', 'class_teacher', 'branch_admin'],

  // ── Finance ───────────────────────────────────────────────────────────────────
  '/dashboard/finance':        ['super_admin', 'director', 'accountant', 'branch_admin'],
  '/dashboard/payments':       ['super_admin', 'director', 'accountant', 'branch_admin'],
  '/dashboard/payroll':        ['super_admin', 'director', 'accountant'],
  '/dashboard/fee-structures': ['super_admin', 'director', 'accountant'],

  // ── Reports ───────────────────────────────────────────────────────────────────
  '/dashboard/reports':        ['super_admin', 'director', 'vice_principal', 'accountant', 'teacher', 'class_teacher'],

  // ── Education ─────────────────────────────────────────────────────────────────
  '/dashboard/education':      ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/students':       ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/classes':        ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/subjects':       ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],
  '/dashboard/academic-calendar': ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],

  // ── Shared academic (view for students/parents, manage for staff) ─────────────
  '/dashboard/schedule':       ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/grades':         ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/exams':          ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/homework':       ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/attendance':     ['student', 'teacher', 'class_teacher', 'vice_principal', 'director', 'branch_admin', 'parent'],
  '/dashboard/attendance/bulk': ['director', 'vice_principal', 'class_teacher'],
  '/dashboard/my-class':       ['class_teacher'],

  // ── Resources ─────────────────────────────────────────────────────────────────
  '/dashboard/resources':      ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin', 'student'],
  '/dashboard/library':        ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin'],
  '/dashboard/learning-center': ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  '/dashboard/clubs':          ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  '/dashboard/coins':          ['super_admin', 'director', 'vice_principal', 'student', 'parent'],
  '/dashboard/canteen':        ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/dashboard/transport':      ['super_admin', 'director', 'vice_principal', 'branch_admin'],

  // ── Communication ─────────────────────────────────────────────────────────────
  '/dashboard/comms':          ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/messages':       ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/notifications':  ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  '/dashboard/announcements':  ['super_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],

  // ── Portals ───────────────────────────────────────────────────────────────────
  '/dashboard/student':        ['student'],
  '/dashboard/student/shop':   ['student'],
  '/dashboard/parent':         ['parent'],

  // ── Settings ──────────────────────────────────────────────────────────────────
  '/dashboard/settings':       ['super_admin', 'director', 'vice_principal'],
  '/dashboard/profile':        ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'],
  '/dashboard/kpi':            ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/dashboard/kpi/metrics':    ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  '/dashboard/ai-analytics':   ['super_admin', 'director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  '/dashboard/marketing':     ['super_admin', 'director', 'vice_principal', 'branch_admin'],
};

/** Sidebar nav elementlari uchun ruxsat etilgan rollar */
export const SIDEBAR_PERMISSIONS: Record<string, UserRole[]> = {
  'Dashboard':       undefined as any, // all roles
  'Maktablar':       ['super_admin'],
  'Foydalanuvchilar': ['super_admin', 'director', 'vice_principal', 'branch_admin'],
  'Audit log':       ['super_admin'],
  'Filiallar':       ['super_admin', 'director'],

  "Ta'lim":          ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  "O'quvchilar":     ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  'Xodimlar':        ['director', 'vice_principal'],
  'Moliya':          ['director', 'accountant'],
  "Ta'til so'rovlar": ['director', 'vice_principal'],
  'Intizom':         ['vice_principal', 'director', 'branch_admin', 'class_teacher'],

  'Dars jadvali':    ['teacher', 'class_teacher', 'student', 'parent'],
  'Baholar':         ['teacher', 'class_teacher', 'student', 'parent'],
  'Imtihonlar':      ['teacher', 'class_teacher', 'student', 'parent', 'director', 'vice_principal', 'branch_admin'],
  'Uy vazifalari':   ['teacher', 'class_teacher', 'student', 'parent', 'director', 'vice_principal', 'branch_admin'],
  'Davomat':         ['teacher', 'class_teacher', 'student', 'parent', 'director', 'vice_principal', 'branch_admin'],
  'Mening sinfim':   ['class_teacher'],

  'To\'lovlar':      ['director', 'accountant', 'branch_admin'],
  'Tariflar':        ['director', 'accountant'],
  'Ish haqi':        ['director', 'accountant'],
  'Hisobotlar':      ['director', 'vice_principal', 'accountant', 'teacher', 'class_teacher'],

  'Kutubxona':       ['director', 'vice_principal', 'teacher', 'class_teacher', 'librarian', 'branch_admin'],
  'O\'quv markazi':  ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  'To\'garaklar':    ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin', 'student'],
  'EduCoin':         ['director', 'vice_principal', 'student', 'parent'],
  'Oshxona':         ['director', 'vice_principal', 'branch_admin'],
  'Transport':       ['director', 'vice_principal', 'branch_admin'],

  'Kommunikatsiya':  ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  'Xabarlar':        ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  'Bildirishnomalar': ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'student', 'parent'],
  'E\'lonlar':       ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'],

  'O\'quvchi portal': ['student'],
  'Do\'kon':          ['student'],
  'Farzand':         ['parent'],
  'O\'quvchi to\'lovlari': ['parent'],

  'Sozlamalar':      ['super_admin', 'director', 'vice_principal'],
  'KPI Dashboard':   ['super_admin', 'director', 'vice_principal', 'branch_admin'],
};

/** Rollarga mos default dashboard */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: '/dashboard/schools',
  director: '/dashboard',
  vice_principal: '/dashboard',
  branch_admin: '/dashboard',
  teacher: '/dashboard',
  class_teacher: '/dashboard',
  accountant: '/dashboard/finance',
  librarian: '/dashboard/resources',
  student: '/dashboard/student',
  parent: '/dashboard/parent',
};

/** Route ruxsatini tekshirish */
export function canAccessRoute(role: string | undefined, pathname: string): boolean {
  if (!role) return false;

  // Aniq moslik
  const exactMatch = ROUTE_PERMISSIONS[pathname];
  if (exactMatch) {
    return exactMatch.includes(role as UserRole);
  }

  // Parent route ni qidirish (e.g. /dashboard/users/123 → /dashboard/users)
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 1; i--) {
    const partialPath = '/' + segments.slice(0, i + 1).join('/');
    const partialMatch = ROUTE_PERMISSIONS[partialPath];
    if (partialMatch) {
      return partialMatch.includes(role as UserRole);
    }
  }

  // Ro'yxatda bo'lmagan route → barcha authenticated user'larga ochiq
  return true;
}
