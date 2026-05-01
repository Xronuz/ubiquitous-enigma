import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simple JWT payload decoder (no signature verification — backend handles that).
 * Works in Edge Runtime (no jsonwebtoken dependency needed).
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

/** Role-appropriate default dashboard landing pages */
const ROLE_HOME: Record<string, string> = {
  super_admin: '/dashboard/schools',
  student: '/dashboard/student',
  parent: '/dashboard/parent',
};

/** Routes restricted to specific roles */
const ROLE_RESTRICTIONS: Array<{ path: string; roles: string[] }> = [
  { path: '/dashboard/schools',    roles: ['super_admin'] },
  { path: '/dashboard/audit-log',  roles: ['super_admin'] },
  { path: '/dashboard/student',    roles: ['student'] },
  { path: '/dashboard/student/shop', roles: ['student'] },
  { path: '/dashboard/parent',     roles: ['parent'] },
  { path: '/dashboard/finance',    roles: ['school_admin', 'director', 'accountant', 'branch_admin'] },
  { path: '/dashboard/payroll',    roles: ['school_admin', 'director', 'accountant'] },
  { path: '/dashboard/fee-structures', roles: ['school_admin', 'director', 'accountant'] },
  { path: '/dashboard/staff',      roles: ['school_admin', 'director', 'vice_principal'] },
  { path: '/dashboard/users',      roles: ['super_admin', 'school_admin', 'director', 'vice_principal', 'branch_admin'] },
  { path: '/dashboard/leave-requests', roles: ['school_admin', 'director', 'vice_principal'] },
  { path: '/dashboard/discipline', roles: ['school_admin', 'director', 'vice_principal', 'branch_admin'] },
  { path: '/dashboard/reports',    roles: ['school_admin', 'director', 'vice_principal', 'accountant'] },
];

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & API routes — skip
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(?:png|jpg|jpeg|svg|gif|ico|css|js|woff|woff2)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const payload = token ? decodeJwtPayload(token) : null;
  const isAuthenticated = !!payload && typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  const role = (payload?.role as string) || '';

  // ── 1. Public auth pages ──────────────────────────────────────────────
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // Already logged in → redirect away from login/register pages
    if (isAuthenticated) {
      const home = ROLE_HOME[role] ?? '/dashboard';
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // ── 1.5. /dashboard/classes → /dashboard/education (duplicate route) ───
  if (pathname === '/dashboard/classes') {
    return NextResponse.redirect(new URL('/dashboard/education', request.url));
  }

  // ── 2. Dashboard routes require authentication ────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role-specific route guards
    for (const restriction of ROLE_RESTRICTIONS) {
      if (pathname === restriction.path || pathname.startsWith(restriction.path + '/')) {
        if (!restriction.roles.includes(role)) {
          const home = ROLE_HOME[role] ?? '/dashboard';
          return NextResponse.redirect(new URL(home, request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Run on all routes except static files & API routes (already handled above)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
