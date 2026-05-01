# RBAC & Sidebar Audit Report — Xedu Platform

**Audit Date:** 2026-04-30  
**Test Environment:** Local (`http://localhost:3000`)  
**Frontend:** Next.js 14 (App Router)  
**Backend:** NestJS 10  
**Auth:** JWT (access + refresh) in httpOnly cookies  

---

## 1. Executive Summary

The audit was performed by programmatically logging in with **10 distinct user roles** (out of 11 defined roles) via Playwright, capturing the sidebar navigation for each role, and testing direct URL access to restricted dashboard pages.

**Critical security issues were found:** several restricted pages are accessible via direct URL to roles that should NOT have access, most notably `/dashboard/attendance/bulk` which is open to **all authenticated users**.

---

## 2. Test Methodology

1. **Seed Data:** Fresh database seeded with `pnpm prisma db seed` providing test accounts for each role.
2. **Browser Automation:** Playwright (headless Chromium) used to:
   - Log in with each role's credentials
   - Capture the sidebar DOM and extract visible navigation items
   - Take a full-viewport dashboard screenshot per role
   - Attempt direct navigation to 11 restricted URLs and record whether the page loads or redirects
3. **Roles Tested:**
   - `super_admin`, `school_admin`, `director`, `vice_principal`, `teacher`, `class_teacher`, `accountant`, `librarian`, `student`, `parent`
   - **Not tested:** `branch_admin` (no seed account exists)

---

## 3. Role-by-Role Sidebar Navigation

### 3.1 Super Admin — 5 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | Maktablar | `/dashboard/schools` |
| 3 | Foydalanuvchilar | `/dashboard/users` |
| 4 | Audit log | `/dashboard/audit-log` |
| 5 | Sozlamalar | `/dashboard/settings` |

**Expected:** ✅ Matches design. No extraneous items.

---

### 3.2 School Admin — 17 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | Ta'lim | `/dashboard/education` |
| 3 | O'quvchilar | `/dashboard/students` |
| 4 | Xodimlar | `/dashboard/staff` |
| 5 | Moliya | `/dashboard/finance` |
| 6 | Ta'til so'rovlar | `/dashboard/leave-requests` |
| 7 | Intizom | `/dashboard/discipline` |
| 8 | Imtihonlar | `/dashboard/exams` |
| 9 | Uy vazifalari | `/dashboard/homework` |
| 10 | Davomat | `/dashboard/attendance` |
| 11 | To'lovlar | `/dashboard/payments` |
| 12 | Tariflar | `/dashboard/fee-structures` |
| 13 | Ish haqi | `/dashboard/payroll` |
| 14 | Hisobotlar | `/dashboard/reports` |
| 15 | Resurslar | `/dashboard/resources` |
| 16 | Kommunikatsiya | `/dashboard/comms` |
| 17 | Sozlamalar | `/dashboard/settings` |

**Expected:** ✅ Full school management access.

---

### 3.3 Director — 17 nav items
*Identical to School Admin.*

**Expected:** ✅ Directors have same scope as school admins in this configuration.

---

### 3.4 Vice Principal — 12 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | Ta'lim | `/dashboard/education` |
| 3 | O'quvchilar | `/dashboard/students` |
| 4 | Xodimlar | `/dashboard/staff` |
| 5 | Ta'til so'rovlar | `/dashboard/leave-requests` |
| 6 | Intizom | `/dashboard/discipline` |
| 7 | Imtihonlar | `/dashboard/exams` |
| 8 | Uy vazifalari | `/dashboard/homework` |
| 9 | Davomat | `/dashboard/attendance` |
| 10 | Hisobotlar | `/dashboard/reports` |
| 11 | Resurslar | `/dashboard/resources` |
| 12 | Kommunikatsiya | `/dashboard/comms` |

**Expected:** ✅ No finance/payroll (correct). Has staff access (correct).

---

### 3.5 Teacher — 9 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | O'quvchilar | `/dashboard/students` |
| 3 | Dars jadvali | `/dashboard/schedule` |
| 4 | Baholar | `/dashboard/grades` |
| 5 | Imtihonlar | `/dashboard/exams` |
| 6 | Uy vazifalari | `/dashboard/homework` |
| 7 | Davomat | `/dashboard/attendance` |
| 8 | Resurslar | `/dashboard/resources` |
| 9 | Kommunikatsiya | `/dashboard/comms` |

**Expected:** ✅ Academic-focused. No finance/staff (correct).

---

### 3.6 Class Teacher — 10 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | O'quvchilar | `/dashboard/students` |
| 3 | Dars jadvali | `/dashboard/schedule` |
| 4 | Baholar | `/dashboard/grades` |
| 5 | Imtihonlar | `/dashboard/exams` |
| 6 | Uy vazifalari | `/dashboard/homework` |
| 7 | Davomat | `/dashboard/attendance` |
| 8 | **Mening sinfim** | `/dashboard/my-class` |
| 9 | Resurslar | `/dashboard/resources` |
| 10 | Kommunikatsiya | `/dashboard/comms` |

**Expected:** ✅ Same as Teacher plus "Mening sinfim" (class_teacher only).

---

### 3.7 Accountant — 7 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | Moliya | `/dashboard/finance` |
| 3 | To'lovlar | `/dashboard/payments` |
| 4 | Tariflar | `/dashboard/fee-structures` |
| 5 | Ish haqi | `/dashboard/payroll` |
| 6 | Hisobotlar | `/dashboard/reports` |
| 7 | Kommunikatsiya | `/dashboard/comms` |

**Expected:** ✅ Finance-only. No education/staff (correct).

---

### 3.8 Librarian — 2 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | Resurslar | `/dashboard/resources` |

**Expected:** ✅ Minimal access. Missing "Kommunikatsiya" in sidebar — see Finding #5.

---

### 3.9 Student — 10 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | Dars jadvali | `/dashboard/schedule` |
| 3 | Baholar | `/dashboard/grades` |
| 4 | Imtihonlar | `/dashboard/exams` |
| 5 | Uy vazifalari | `/dashboard/homework` |
| 6 | Davomat | `/dashboard/attendance` |
| 7 | O'quvchi portal | `/dashboard/student` |
| 8 | Do'kon | `/dashboard/student/shop` |
| 9 | EduCoin | `/dashboard/coins` |
| 10 | Kommunikatsiya | `/dashboard/comms` |

**Expected:** ✅ Student portal items present. No staff/finance (correct).

---

### 3.10 Parent — 9 nav items
| # | Label | Route |
|---|-------|-------|
| 1 | Dashboard | `/dashboard` |
| 2 | Dars jadvali | `/dashboard/schedule` |
| 3 | Baholar | `/dashboard/grades` |
| 4 | Imtihonlar | `/dashboard/exams` |
| 5 | Uy vazifalari | `/dashboard/homework` |
| 6 | Davomat | `/dashboard/attendance` |
| 7 | Farzand | `/dashboard/parent` |
| 8 | O'quvchi to'lovlari | `/dashboard/payments` |
| 9 | Kommunikatsiya | `/dashboard/comms` |

**Expected:** ✅ Parent portal items present.

---

## 4. Restricted URL Access Test

Direct URL attempts (e.g. typing `http://localhost:3000/dashboard/finance` in the browser) were performed for every role.

| URL | Allowed Roles (per code) | **Actual Behavior** |
|-----|--------------------------|---------------------|
| `/dashboard/finance` | school_admin, director, accountant | ✅ Correctly blocked for teacher, student, parent, vice_principal, librarian |
| `/dashboard/staff` | school_admin, director, vice_principal | ✅ Correctly blocked for teacher, student, parent, accountant, librarian |
| `/dashboard/users` | super_admin, school_admin, director, vice_principal, branch_admin | ✅ Correctly blocked for teacher, student, parent, accountant, librarian |
| `/dashboard/discipline` | school_admin, director, vice_principal, branch_admin, class_teacher | ✅ Blocked for teacher, student, parent, accountant, librarian |
| `/dashboard/reports` | school_admin, director, vice_principal, accountant, teacher, class_teacher | ✅ Blocked for student, parent, librarian |
| `/dashboard/attendance/bulk` | school_admin, vice_principal, director, class_teacher | ❌ **OPEN TO ALL ROLES** — critical |
| `/dashboard/student/shop` | student | ✅ Correctly blocked for all non-student roles |
| `/dashboard/parent` | parent | ✅ Correctly blocked for all non-parent roles |
| `/dashboard/student` | student | ✅ Correctly blocked for all non-student roles |
| `/dashboard/onboarding` | Not restricted in code | ✅ Open to all (by design?) |
| `/dashboard/settings` | school_admin, director, super_admin (sidebar) | ❌ **OPEN TO ALL ROLES** via direct URL |

---

## 5. Critical Findings

### 🔴 Finding #1: `/dashboard/attendance/bulk` is accessible to ALL roles
- **Risk:** Teachers, students, parents, accountants, librarians can all access the bulk attendance page.
- **Root Cause:** The page component does **not** use the `useRoleGuard()` hook. Only `ROLE_ROUTE_MAP` lists restrictions, but without the hook being invoked on the page, the client-side guard never fires.
- **Fix:** Add `useRoleGuard()` to the `attendance/bulk/page.tsx` component, OR add the route to `middleware.ts` `ROLE_RESTRICTIONS`.

### 🔴 Finding #2: `/dashboard/settings` is accessible via direct URL to all roles
- **Risk:** Students, parents, teachers, etc. can open the settings page even though it is hidden from their sidebar.
- **Root Cause:** `ROLE_ROUTE_MAP` only restricts settings to `super_admin, school_admin, director`, but the middleware does **not** include `/dashboard/settings` in `ROLE_RESTRICTIONS`. The `useRoleGuard()` hook may also be missing on the settings page.
- **Fix:** Add `/dashboard/settings` to `middleware.ts` `ROLE_RESTRICTIONS` and ensure the page uses `useRoleGuard()`.

### 🟡 Finding #3: Inconsistent `branch_admin` handling
- **Risk:** `branch_admin` is allowed by middleware for `/dashboard/users` and `/dashboard/discipline`, but the sidebar and `ROLE_ROUTE_MAP` do not include `branch_admin` for those routes.
- **Root Cause:** `middleware.ts` allows `branch_admin` for `/dashboard/users` and `/dashboard/discipline`, but `sidebar.tsx` and `role-guard.tsx` do not.
- **Fix:** Align all three layers (middleware, sidebar, role-guard) for `branch_admin`.

### 🟡 Finding #4: `/dashboard/discipline` — `class_teacher` mismatch
- **Risk:** `ROLE_ROUTE_MAP` allows `class_teacher`, but the sidebar does not show the nav item.
- **Root Cause:** `sidebar.tsx` roles array for Discipline is `['vice_principal', 'school_admin', 'director', 'branch_admin']` — missing `class_teacher`.
- **Fix:** Add `class_teacher` to the sidebar nav item for discipline.

### 🟡 Finding #5: Librarian missing "Kommunikatsiya"
- **Risk:** Low — just a missing nav item; the route is allowed in `ROLE_ROUTE_MAP`.
- **Root Cause:** `sidebar.tsx` Comms nav item roles are `['school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'branch_admin', 'student', 'parent']` — missing `librarian`.
- **Fix:** Add `librarian` to the Comms sidebar item.

### 🟡 Finding #6: `/dashboard/reports` — Teacher/Class Teacher mismatch
- **Risk:** `ROLE_ROUTE_MAP` allows `teacher` and `class_teacher`, but sidebar does not show the nav item.
- **Root Cause:** `sidebar.tsx` Reports nav item roles are `['accountant', 'school_admin', 'director', 'vice_principal']` — missing `teacher`, `class_teacher`.
- **Fix:** Add `teacher` and `class_teacher` to the Reports sidebar item.

### 🟡 Finding #7: `/dashboard/onboarding` has no guard at all
- **Risk:** Any authenticated user can access onboarding.
- **Root Cause:** No entry in `ROLE_ROUTE_MAP`, no middleware restriction, no sidebar nav item.
- **Fix:** Decide which roles need onboarding and restrict accordingly (likely `school_admin` and `director` only).

### 🟡 Finding #8: Parent `/dashboard/payments` portal route
- **Risk:** Parent has a portal nav item for payments, but `ROLE_ROUTE_MAP` does not include `/dashboard/payments` for `parent`.
- **Root Cause:** Missing entry in `ROLE_ROUTE_MAP`.
- **Fix:** Add `/dashboard/payments` to `ROLE_ROUTE_MAP` for `parent`.

### 🟡 Finding #9: Super Admin missing dedicated landing page
- **Observation:** Super admin is redirected to `/dashboard` after login, but the middleware's `ROLE_HOME` is `/dashboard/schools`. The sidebar correctly shows super-admin-only items, but there is no automatic redirect to `/schools`.
- **Fix:** Ensure middleware redirects super_admin to `/dashboard/schools` immediately after login.

---

## 6. Recommendations (Priority Order)

| Priority | Action | Files to Change |
|----------|--------|-----------------|
| **P0** | Block `/dashboard/attendance/bulk` for unauthorized roles | `middleware.ts`, `attendance/bulk/page.tsx` |
| **P0** | Block `/dashboard/settings` for unauthorized roles | `middleware.ts`, `settings/page.tsx` |
| **P1** | Add `class_teacher` to Discipline sidebar | `sidebar.tsx` |
| **P1** | Add `teacher`, `class_teacher` to Reports sidebar | `sidebar.tsx` |
| **P1** | Add `librarian` to Comms sidebar | `sidebar.tsx` |
| **P1** | Add `/dashboard/payments` for `parent` in `ROLE_ROUTE_MAP` | `role-guard.tsx` |
| **P2** | Align `branch_admin` across all 3 RBAC layers | `middleware.ts`, `sidebar.tsx`, `role-guard.tsx` |
| **P2** | Restrict `/dashboard/onboarding` to appropriate roles | `middleware.ts`, `role-guard.tsx`, `onboarding/page.tsx` |
| **P2** | Ensure super_admin redirect to `/dashboard/schools` | `middleware.ts` |

---

## 7. Appendix: Screenshots

All screenshots were saved to `/tmp/xedu-audit/` during the automated audit:
- `super_admin_dashboard.png`
- `school_admin_dashboard.png`
- `director_dashboard.png`
- `vice_principal_dashboard.png`
- `teacher_dashboard.png`
- `class_teacher_dashboard.png`
- `accountant_dashboard.png`
- `librarian_dashboard.png`
- `student_dashboard.png`
- `parent_dashboard.png`
