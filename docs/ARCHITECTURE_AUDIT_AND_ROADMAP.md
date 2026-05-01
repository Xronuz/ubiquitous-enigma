# Education Platform — Full Architecture Audit & Improvement Roadmap

> **Platform Vision:** LMS + ERP + CRM + Online Testing — All-in-One Education Automation Platform  
> **Audit Date:** 2026-04-29  
> **Risk Level:** MEDIUM-HIGH

---

## 1. Executive Summary

Ushbu loyiha NestJS (backend) + Next.js 14 (frontend) + Prisma + PostgreSQL stackida qurilgan. Kod bazasi tez feature velocity (tez yangi funksiyalar qo'shish) sababli arxitekturaviy qoidalar buzilgan, data integrity xavfi yuzaga kelgan, va security kamchiliklari paydo bo'lgan.

**Asosiy xulosa:** Loyiha hozir "modular monolith" sifatida ishlamoqda, lekin uning ichki tuzilishi "big ball of mud" ga yaqinlashib qolgan. **35+ feature module** bir-biriga chambarchas bog'langan, repository layer yo'q, va business logic to'g'ridan-to'g'ri PrismaService bilan aralashgan.

| Domain | Severity | Core Problem |
|--------|----------|--------------|
| Database Schema | 🔴 Critical | Global email uniqueness breaks multi-tenancy; no soft deletes; missing FKs; excessive cascade deletes |
| Backend Architecture | 🔴 Critical | God Services (900+ line services), no repository layer, `as any` anti-pattern everywhere |
| Security | 🔴 Critical | WebSocket CORS=*, refresh token fallback bypasses rotation, hardcoded secrets |
| Frontend Architecture | 🟡 High | 1700-line page monoliths, zero server components, no middleware auth guards |
| **RBAC & Role Rendering** | **🔴 Critical** | **Director role excluded from sidebar; no page guards; students can open teacher routes; magic strings in 15+ files** |
| **Entity Validation** | **🟡 High** | **User creation lacks role validation; class enrollment doesn't check role; mass assignment via UpdateUserDto** |
| DevOps/Infrastructure | 🟡 High | Missing security headers in selfhost nginx, exposed ports in docker-compose, no resource limits |

---

## 2. Critical Architecture Issues

### 2.1 Missing Domain Boundaries (Modular Monolith Failure)

**Problem:** 35+ feature module mavjud bo'lsa-da, ular orasida aniq domain chegaralari yo'q.

- `PaymentsService` (625 lines) to'lov CRUD, Payme webhook, Click webhook, treasury balance, financial shifts, audit logging, va real-time eventlarni o'z ichiga oladi.
- `PayrollService` (948 lines) salary config, advances, payroll generation, PDF export, tariff calculation — bularning barchasi bitta class'da.
- `ReportsService` (706 lines) attendance, grades, finance, PDF generation for all report types.

**Impact:**
- Unit testing deyarlik imkonsiz (har bir service 10+ dependency bilan).
- Yangi dasturchi kodga kirganda o'rganish vaqti oshadi.
- Bir domain'dagi o'zgarish boshqa domain'ga tasir qiladi.

**Evidence:**
```
apps/backend/src/modules/payments/payments.service.ts    — 625 lines
apps/backend/src/modules/payroll/payroll.service.ts      — 948 lines
apps/backend/src/modules/reports/reports.service.ts      — 706 lines
apps/backend/src/modules/reports/analytics.service.ts    — 866 lines
```

### 2.2 No Repository / DAO Layer

**Problem:** Har bir service to'g'ridan-to'g'ri `PrismaService` dan foydalanadi. Data access layer va business logic layer ajratilmagan.

**Impact:**
- Prisma'ni almashtirish (masalan, mikroservislar uchun) deyarlik imkonsiz.
- Testing'da Prisma client'ni mock qilish kerak bo'ladi.
- Multi-tenancy filter'lari (`schoolId`, `branchId`) har bir query'da qo'lda qo'shiladi.

**Example (branch filter duplication):**
```typescript
// This pattern repeats in ~20 services
const where = {
  schoolId: user.schoolId,
  ...(user.role !== 'super_admin' && user.role !== 'director' ? { branchId: user.branchId } : {}),
};
```

### 2.3 Missing Abstractions for Cross-Cutting Concerns

**Problem:**
- **Payment Provider Abstraction yo'q.** Payme va Click logic `PaymentsService` ichiga yopishib qolgan. Yangi provider (Uzum, Stripe) qo'shish uchun 625-line faylni o'zgartirish kerak.
- **Event Bus Abstraction yo'q.** Services to'g'ridan-to'g'ri `EventsGateway` (WebSocket) inject qiladi. Agar SSE yoki queue-based events kerak bo'lsa, har bir service o'zgaradi.
- **Document Generation Abstraction yo'q.** `ReportsService` pdfkit'dan, `AuditService` exceljs'dan to'g'ridan-to'g'ri foydalanadi.

### 2.4 God-Object Schema Anti-Patterns

**Problem:** Database'da "God-Object" pattern:
- `School` model — 40+ direct relations bilan. Biron bir `include` butun ma'lumotlar bazasini yuklab olishi mumkin.
- `User` model — o'qituvchi, o'quvchi, ota-ona, xodim, haydovchi, CRM assignee barchasi bitta jadvalda. 30+ relations, ko'p column'lar har bir rol uchun irrelevant.

**Impact:**
- Prisma `findUnique` bilan `include` ishlatilsa, avtomatik ravishda 10+ query bajariladi (N+1).
- Row locking contention yuqori write table'lar (attendance, grades) orasida.

---

## 3. Database Schema Issues

### 3.1 Multi-Tenancy Design Flaws

| Issue | Severity | Details |
|-------|----------|---------|
| **Global email uniqueness** | 🔴 Critical | `User.email @unique` — bir foydalanuvchi faqat bitta school'ga tegishli bo'lishi mumkin. Real-world'da ota-ona yoki o'qituvchi bir nechta school'da bo'lishi mumkin. |
| **Denormalized `branchId`** | 🟡 High | `branchId` Attendance, Grade, Payment, va boshqa 15+ jadvalga nusxalangan. Agar Class boshqa branch'ga ko'chirilsa, tarixiy ma'lumotlar eski `branchId` ni saqlab qoladi. |
| **No soft deletes** | 🔴 Critical | `deletedAt` maydoni yo'q. `onDelete: Cascade` deyarli hamma relation'da. Biron School yoki User o'chirilsa, butun ma'lumotlar doimiy yo'qoladi. |

### 3.2 Missing Constraints & Indexes

| Table | Missing | Impact |
|-------|---------|--------|
| `messages` | Index on `(receiverId, isRead)` | Inbox unread count sekin |
| `notifications` | Index on `(recipientId, isRead)` | Notification feed sekin |
| `group_messages` | Index on `(conversationId, createdAt)` | Chat history pagination sekin |
| `library_loans` | FK on `studentId` | Orphan loans risk |
| `leads` | FK on `convertedStudentId`, `expectedClassId` | Invalid references |
| `staffSalary` | `userId @unique` olib tashlanishi kerak | Bir xodim faqat bitta salary recordga ega bo'lishi mumkin (tarixiy o'zgarishlar imkonsiz) |

### 3.3 Data Integrity Issues

- **No CHECK constraints:** `Grade.score <= maxScore`, `ExamSession.percentage` 0-100 orasida, `SalaryAdvance.month` 1-12 orasida — hech qaysi database darajasida tekshirilmaydi.
- **String enums:** `CourseEnrollment.status`, `CourseMaterial.type`, `FeeStructure.frequency` — `String` sifatida saqlanadi, enum emas.
- **Redundant fields:** `Schedule.roomNumber` (string) va `roomId` (FK) bir vaqtda mavjud. `Club.schedule` (string) va `scheduleDays`/`scheduleStartTime`/`scheduleEndTime` bir vaqtda mavjud.

### 3.4 Migration Red Flags

- `20260409120000_sync_schema_drift` — bo'sh migration (Prisma driftni aniqlagan lekin to'g'rilay olmagan).
- `20260425000001_fix_schema_drift` — 7 ta alohida jadval/qo'shimcha qo'shilgan migration orqali.
- Migration'larda `IF NOT EXISTS` va `EXCEPTION WHEN duplicate_object` tez-tez ishlatilgan — bu production'da qo'lda apply qilinganligidan dalolat.

---

## 4. Backend Code Quality Issues

### 4.1 Type Safety Erosion

**`as any` Anti-Pattern:**
- `payments.service.ts` — 14 ta `as any`
- `users.service.ts` — `data: dto as any`
- Bu Prisma enum validation'ni butunlay bekor qiladi.

**DTOs Inside Service Files:**
- `payments.service.ts` ichida `CreatePaymentDto` (line 23)
- `payroll.service.ts` ichida 7 ta DTO (lines 19-95)
- Bu Swagger documentation generation'ni buzadi va separation of concerns'ni buzadi.

### 4.2 Inconsistent Error Handling

| Pattern | Location | Risk |
|---------|----------|------|
| Silent catch + logger | `auth.service.ts` Redis ops | Redis down bo'lsa, rate limiting o'chadi |
| `as any` suppresses errors | Har yerda | Type safety yo'qoladi |
| Try/catch in audit | `audit.service.ts` | Audit failure business logic'ni to'xtatmaydi (yaxshi) |

### 4.3 Code Duplication

- **`SCHOOL_WIDE_ROLES`** — 4 ta joyda qayta e'lon qilingan:
  - `branch-filter.util.ts`
  - `roles.guard.ts`
  - `tenant.middleware.ts`
  - `auth.service.ts`
- **Pagination metadata** — ~15 service'da bir xil:
  ```typescript
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  ```
- **Branch filter logic** — har bir service method'da qo'lda qo'shiladi.

### 4.4 Performance Anti-Patterns

| Issue | Location | Impact |
|-------|----------|--------|
| `redis.keys()` for cache invalidation | `schedule.service.ts:48` | Redis event loop'ni block qiladi (O(N)) |
| 12 separate aggregate queries in loop | `finance.service.ts:118-146` | N+1 query pattern |
| No pagination on `getWeek()`, `findByClass()` | `schedule.service.ts` | OOM risk |
| Subscription check hits DB every request | `subscription.guard.ts` | Har bir request'da DB query |
| `getDebtors` in-memory grouping | `finance.service.ts:150-204` | CPU + memory bloat |

---

## 5. Frontend Architecture Issues

### 5.1 Massive Monolithic Page Files

| File | Lines | Problem |
|------|-------|---------|
| `dashboard/page.tsx` | 1,761 | 15+ inline component, chart, widget |
| `dashboard/payroll/page.tsx` | 1,555 | Tariff calculators, tables, forms inline |
| `dashboard/exams/[id]/page.tsx` | 1,378 | Exam detail + take exam logic aralashgan |
| `dashboard/student/page.tsx` | 1,289 | Student dashboard monolith |
| `dashboard/grades/page.tsx` | 1,155 | ScoreBadge, InlineScoreEdit, GpaBar inline |

**Impact:**
- Unit testing imkonsiz.
- Bundle size katta (har bir chart, dialog, table initial load bilan keladi).
- Jamoaviy ishlashda merge conflict ko'p.

### 5.2 Client/Server Component Misuse

- **58 ta fayl** `'use client'` bilan belgilangan.
- **`(dashboard)/layout.tsx`** — faqat auth guard va sidebar state uchun client component. Shell (background, sidebar, header) server component bo'lishi mumkin edi.
- **Zero server components** fetch data. Barcha data fetching client-side'da TanStack Query orqali. Next.js streaming va PPR'dan foydalanilmayapti.

### 5.3 Hidden Cross-Page Imports

Tab container page'lar to'g'ridan-to'g'ri boshqa page'larni import qiladi:
```typescript
import AttendancePage from '../attendance/page';
import GradesPage from '../grades/page';
```
Bu code splitting'ni buzadi va circular import riskini yaratadi.

### 5.4 Auth & State Management Issues

- **`middleware.ts` yo'q.** Auth guard `useEffect` orqali layout'da amalga oshiriladi. Unauthenticated user dashboard UI'ni bir zum ko'radi (flash of unauthenticated content).
- **localStorage'da JWT tokens.** XSS attack'ga ochiq.
- **Zustand `persist` + qo'lda localStorage.** Ikki nusxa yozish.
- **No reusable `<RoleGuard>` component.** Role string'lar (`'school_admin'`, `'vice_principal'`) magic string sifatida sidebar, header, va page'larda takrorlanadi.

### 5.5 i18n Dead Code

- `next-intl` o'rnatilgan va provider bilan o'ralgan.
- `uz.json` da ~30 ta key.
- **Butun UI o'zbek tilida hardcoded.** i18n aslida ishlatilmayapti.

### 5.6 Performance Issues

- **`next/dynamic` ishlatilmagan.** Recharts (~70KB gzipped) har bir report page bilan static import qilinadi.
- **`next/image` ishlatilmagan.** `Avatar` component Radix `<img>` primitive'dan foydalanadi.
- **Socket.io-client har sahifa uchun yuklanadi.** `RealtimeProvider` layout'da, lekin har bir user/page buni talab qilmaydi.

---

## 6. Security Vulnerabilities

### 6.1 Critical Issues

| # | Issue | File | CVSS Approx |
|---|-------|------|-------------|
| 1 | **WebSocket CORS = `*`** | `events.gateway.ts:17-18` | 9.1 — Any website can connect |
| 2 | **Refresh token rotation bypassed when Redis down** | `auth.service.ts:114-123` | 8.2 — Token replay indefinitely |
| 3 | **WebSocket room join without authorization** | `events.gateway.ts:81-106` | 8.5 — Cross-tenant data leakage |
| 4 | **Uploads served without auth** | `main.ts:20` | 7.5 — Anyone with URL accesses files |
| 5 | **Hardcoded MinIO credentials** | `env.validation.ts:36-37` | 7.0 — Default creds in validation |
| 6 | **Hardcoded demo passwords in seed** | `prisma/seed.ts` | 7.0 — Predictable accounts |

### 6.2 High Severity Issues

| # | Issue | File |
|---|-------|------|
| 7 | Login rate limiting bypassed when Redis down | `auth.service.ts:47-57` |
| 8 | Self-hosted nginx missing ALL security headers | `nginx.selfhost.conf` |
| 9 | Redis password optional (empty = no auth) | `docker-compose.selfhost.yml:91` |
| 10 | Document upload lacks file type validation | `upload.controller.ts:61-93` |
| 11 | Webhook auth skipped when keys missing | `payments.service.ts:361-366` |
| 12 | `$executeRawUnsafe` with string concat | `prisma.service.ts:47` |
| 13 | Refresh/reset-password endpoints unthrottled | `auth.controller.ts` |
| 14 | Access tokens not blacklisted on logout | `auth.service.ts:136-139` |
| 15 | File upload path traversal risk | `upload.service.ts:84-85` |

### 6.3 Medium Severity Issues

- Mass assignment risk in user update (`users.service.ts:113-115`)
- Swagger public in all environments (`main.ts:82-84`)
- Password reset doesn't invalidate previous tokens (`auth.service.ts:142-165`)
- `enableImplicitConversion: true` risk (`main.ts:37`)
- Throttler in-memory storage (distributed deploy'da bypass)

---

## 7. Infrastructure & DevOps Issues

### 7.1 Docker Compose

- **Hardcoded passwords:** PostgreSQL, MinIO, pgAdmin — barchasi source code'da.
- **Exposed ports:** Dev compose'da `0.0.0.0` ga 5432, 6379, 9000/9001, 5050 portlari ochiq.
- **No resource limits:** `mem_limit`, `cpus`, `ulimits` yo'q.
- **Real IP in `.env.example`:** `SERVER_HOST=185.197.249.26`

### 7.2 Nginx

- **Production nginx:** HSTS, CSP, X-Frame-Options va boshqa security header'lar mavjud. ✅
- **Selfhost nginx:** Hech qanday security header yo'q, HTTPS yo'q, `client_max_body_size 50M`. 🔴
- **WebSocket location:** Rate limiting yo'q.

### 7.3 Monitoring & Observability

- **No request ID tracing.** Global exception filter'da request ID yo'q.
- **Prisma query logging to stdout.** Production'da sensitive data (email, payment amounts) log'larga tushishi mumkin.
- **No health checks in frontend Dockerfile.**
- **No graceful shutdown handler.** `SIGTERM`/`SIGINT` handling yo'q.

---

## 8. Improvement Recommendations

### 8.1 Arxitektura Qayta Qurish (Phase 1 — Foundation)

#### A. Repository Layer qo'shish
Har bir domain uchun repository abstraction yaratish:
```
modules/
  payments/
    repositories/
      payment.repository.ts        — Prisma-specific queries
      transaction.repository.ts
    services/
      payment.service.ts           — Business logic ONLY
    providers/
      payme.provider.ts            — Payme-specific integration
      click.provider.ts            — Click-specific integration
      payment-provider.interface.ts
```

#### B. Domain-Driven Module Boundaries
Service'larni kichikroq, yagona javobgarlikli qismlarga bo'lish:
- `PaymentsService` (625 lines) →
  - `PaymentProcessingService`
  - `PaymeWebhookService`
  - `ClickWebhookService`
  - `TreasuryReconciliationService`

#### C. Cross-Cutting Concerns Abstraction
- **Event Bus:** `IEventBus` interface + `WebSocketEventBus`, `QueueEventBus` implementatsiyalari.
- **Document Generator:** `IDocumentGenerator` + `PdfDocumentGenerator`, `ExcelDocumentGenerator`.
- **Payment Provider:** `IPaymentProvider` interface.

### 8.2 Database Schema Refactor (Phase 2 — Data Integrity)

#### A. Soft Deletes
```prisma
model User {
  // ... existing fields
  deletedAt DateTime?
  @@index([deletedAt])
}
```
Barcha `onDelete: Cascade` → `onDelete: Restrict` + application-layer soft delete.

#### B. Multi-Tenancy Fix
```prisma
model User {
  // Remove: email String @unique
  email String
  @@unique([schoolId, email])  // Per-school uniqueness
}
```

#### C. Missing Indexes & FKs
- `messages(receiverId, isRead)`
- `notifications(recipientId, isRead)`
- `library_loans.studentId` FK
- `leads.convertedStudentId`, `leads.expectedClassId` FK

#### D. Remove Redundancy
- `Schedule.roomNumber` olib tashlash (faqat `roomId` ishlatish)
- `Club.schedule` olib tashlash (faqat structured maydonlarni ishlatish)
- `StaffSalary.userId @unique` olib tashlash (salary history uchun)

### 8.3 Backend Code Quality (Phase 3 — Consistency)

- **Remove all `as any`** — Prisma generated enum'lardan to'g'ri foydalanish.
- **Extract DTOs** from service files into `dto/` directories.
- **Centralize constants:** `SCHOOL_WIDE_ROLES`, pagination metadata constructor.
- **AuditInterceptor:** Manual audit logging o'rniga `@AuditAction()` decorator + interceptor.
- **Redis `KEYS` → `SCAN`** yoki Redis Hash structures.
- **Group queries:** `getMonthlyRevenue` va `getDebtors` uchun Prisma `groupBy`.

### 8.4 Frontend Refactor (Phase 4 — Modern Next.js)

- **Create `middleware.ts`:** Auth redirect va role-based route guardlar.
- **Extract components:** 1700-line page'lardan component'larni `_components/` ga ajratish.
- **Adopt Server Components:** Data fetching server-side'ga ko'chirish, TanStack Query faqat mutation/real-time uchun.
- **`next/dynamic` for charts:** Recharts va og'ir dialoglar dynamic import.
- **Use `next/image`:** Barcha rasmlar uchun.
- **Reusable `<RoleGuard>`:** Magic string'lar o'rninda.
- **Fix auth storage:** httpOnly cookies yoki kamida encrypted localStorage.
- **Decide on i18n:** To'liq implementatsiya yoki next-intl'ni olib tashlash.

### 8.5 Security Hardening (Phase 5 — Lockdown)

| Priority | Action |
|----------|--------|
| P0 | WebSocket CORS'ni `ALLOWED_ORIGINS` bilan cheklash |
| P0 | Redis down bo'lganda auth fallback'ni olib tashlash (fail closed) |
| P0 | WebSocket room join'da user membership tekshirish |
| P0 | Upload'larni auth bilan serve qilish (signed URL yoki auth controller) |
| P1 | `$executeRawUnsafe` → `$executeRaw` template literals |
| P1 | Document upload'ga file type validation + magic bytes checking |
| P1 | Rate limiting'ni Redis-backed qilish (distributed) |
| P1 | Password reset token'larini invalidatsiya qilish |
| P2 | Swagger'ni production'da o'chirish |
| P2 | Nginx selfhost config'ga security header'lar qo'shish |

---

## 5.5. EduCoin Integration Gaps

**Backend:** To'liq ishlaydi (`coins.service.ts`, `CoinTransaction`, `CoinShopItem`).
**Frontend gaps:**
- Student landing page (`dashboard/student/page.tsx`) **does NOT show coin balance** — coins are hidden behind `/dashboard/coins` under Resources.
- No quick link to shop or transaction history on student dashboard.
- Admin can award coins to **any role** (teachers, parents, admins) because `User.coins` exists for all users without validation.

---

## 5.6. Role-Based UI/UX Mismatches (AI Redesign Regression)

**Root cause:** AI agent redesign'da role-based rendering to'g'ri amalga oshirilmagan.

### Sidebar & Navigation Breakdown

| Role | Problem |
|------|---------|
| `director` | **Completely excluded** from sidebar, mobile-nav, and command-palette. Cannot access Ta'lim, O'quvchilar, Moliya, Xodimlar. Only sees empty shell or falls through to generic dashboard. |
| `branch_admin` | Falls through to `SchoolDashboard` but all widgets have `enabled={false}` for this role — sees empty page. Not in `getRoleLabel()`. |
| `student` | Sidebar has no direct link to `/dashboard/student`. Must navigate through generic dashboard redirect. "Resurslar" nav shown but tabs inside exclude student — broken empty UI. |
| `parent` | Sidebar "Kommunikatsiya" shown with no role filter, but inside only Messages/Notifications are relevant. |
| `super_admin` | Command palette and mobile-nav only show "Maktablar" and "Sozlamalar" — missing Users, Audit Log, and everything else. |

### Page-Level Guard Absence

**Only 4 pages have guards:** `/dashboard/student`, `/dashboard/parent`, `/dashboard/system-health`, `/dashboard/attendance/bulk`

**20+ pages have NO guards:** Any authenticated user can open:
- `/dashboard/users` → Users management UI renders (backend may 403, but frontend leaks UI)
- `/dashboard/staff` → Default tab shows Users page
- `/dashboard/finance` → Finance page renders
- `/dashboard/reports` → Attendance/Grades tabs visible to all
- `/dashboard/schools` → Schools list renders
- `/dashboard/discipline`, `/dashboard/meetings`, `/dashboard/crm`, `/dashboard/branches`

### Magic String Duplication

Role strings (`'school_admin'`, `'teacher'`, `'student'`, etc.) are hardcoded in **15+ files** with **inconsistent permission matrices** across sidebar, header, mobile-nav, command-palette, dashboard pages, and individual page guards. No single source of truth.

---

## 5.7. Multi-Branch Data Isolation Issues (Backend)

### Problem Overview
Platform'da **20+ service `branchFilter()` ishlatmaydi**. `school_admin` yoki `director` filial almashtirganda (`x-branch-id` header orqali), backend'da ko'plab endpointlar bunihisobga olmaydi va **butun maktab ma'lumotlarini** qaytaradi.

### Services Without Branch Filtering

| Service | Impact |
|---------|--------|
| `reports.service.ts` | Attendance, Grades, Finance summary PDF/JSON — doim school-wide |
| `analytics.service.ts` | School Pulse, Smart Alerts — filial tanlash ta'sir qilmaydi |
| `exams.service.ts` | Upcoming Exams widget — barcha filiallar imtihonlari ko'rinadi |
| `homework.service.ts` | Homework count — barcha filiallar uy vazifalari |
| `discipline.service.ts` | Discipline incidents — barcha filiallar hodisalari |
| `schedule.service.ts` | `getToday()` — faqat JWT `branchId` dan foydalanadi, `x-branch-id` header'ni e'tiborsiz qoldiradi |
| `library.service.ts` | Library stats — school-wide |
| `coins.service.ts` | Coin balances — school-wide |
| `meetings.service.ts` | Meetings — school-wide |
| `fee-structures.service.ts` | Fee structures — school-wide |
| `notifications.service.ts` | Broadcast notifications — barcha filiallarga yuboriladi |

### Schema Missing `branchId`

Quyidagi modellarda **`branchId` maydoni yo'q** — filial bo'yicha filter qilish imkonsiz:

| Model | Affected Features |
|-------|-------------------|
| `Exam` | Upcoming exams, exam calendar |
| `Homework` | Homework list, teacher KPI |
| `Subject` | Subjects count, onboarding checklist |
| `DisciplineIncident` | Discipline dashboard, reports |
| `FeeStructure` | Fee summary, finance dashboard |

### Missing Indexes

| Model | Missing Index | Query Pattern |
|-------|---------------|---------------|
| `User` | `@@index([schoolId, branchId])` | User count, list filtering |
| `Class` | `@@index([schoolId, branchId])` | Class list, schedule lookup |
| `User` | `@@index([branchId])` | Analytics student/teacher counts |
| `Class` | `@@index([branchId])` | Payment reports per class |

### Specific Bugs

1. **`clubs.service.ts`** — `update()`, `remove()`, `getMembers()` `branchCtx` parameter'ini qabul qilmaydi. `branchFilter()` chaqirilganda override o'tmaydi.
2. **`users.service.ts` `findOne()`** — faqat `schoolId` tekshiradi, `branchFilter()` ishlatilmaydi.
3. **`schedule.service.ts` `getToday()`** — `x-branch-id` header'ni o'qimaydi, faqat JWT `user.branchId` ga tayanadi.

---

## 5.8. Branch Assignment UX Issues

### Entity Creation Forms Lack Branch Selector

| Entity | Form File | Has Branch Selector? | Problem |
|--------|-----------|----------------------|---------|
| **User** | `users/page.tsx` | ❌ NO | `school_admin` "all branches" view'da student yaratmoqchi bo'lsa → **400 BadRequest** |
| **Class** | `classes/page.tsx` | ❌ NO | Class `branchCtx` (header) orqali yaratiladi. Admin "all branches" da school-wide class yaratadi — bu ko'rinmas |
| **Lead** | `crm/page.tsx` | ❌ NO | `school_admin` yaratgan lead `branchId = null` bo'ladi. `branch_admin` uni ko'rolmaydi |
| **CSV Import** | `users.service.ts` | ❌ NO | Import qilingan barcha student'lar `branchId = null` — filial scoped user'lar ko'rolmaydi |

### Root Cause

- Frontend form'larida `branchId` select/input yo'q.
- API client `x-branch-id` header'ni avtomatik jo'natadi, lekin bu **global state** (sidebar switch) ga bog'liq. Form ichida alohida branch tanlash imkonsiz.
- Backend `CreateUserDto` da `branchId` maydoni bor, lekin frontend uni hech qachon jo'natmaydi.

### Data Mismatch Risks

1. **CSV import** → Student `branchId = null` → `branch_admin` va `teacher` ularni ko'rolmaydi (chunki `branchFilter()` faqat o'z filialini ko'rsatadi).
2. **Lead → Student conversion** → Lead `branchId = null`, lekin class `branchId = B` → Student `branchId = B` oladi. Lead va Student branch'lari bir-biriga to'g'ri kelmaydi.
3. **School-wide class** → `branchId = null` class'ga branch-scoped student qo'shiladi. `ClassStudent` junction table'da `branchId` yo'q, shuning uchun bu inkonsistent holat database'ga yuklanadi.

---

## 9. Implementation Roadmap

### Phase 0: RBAC & Portal Emergency Fix (Hafta 1 — Immediate)
**Maqsad:** AI redesign'dan qolgan chalkashliklarni tezda to'g'rilash.

| Day | Tasks |
|-----|-------|
| 1-2 | • **Backend:** Fix `UsersService.create()` — add role authorization matrix (who can create what role)<br>• **Backend:** Fix `UsersService.update()` — strip `role`, `schoolId`, `branchId` from mass assignment; create separate admin endpoint for role changes<br>• **Backend:** Fix `UsersService.create()` to actually use `branchId` and validate it |
| 3-4 | • **Backend:** Fix `ImportService.commitUsers()` — re-validate roles against caller's permissions<br>• **Backend:** Fix `ClassesService.addStudent()` — verify `role === 'student'`<br>• **Backend:** Fix `CoinsService.awardManual()` — verify target user is `student` |
| 5-6 | • **Frontend:** Create reusable `<RoleGuard />` component + `useRoleGuard()` hook<br>• **Frontend:** Create single `ROLE_PERMISSIONS` config object (source of truth)<br>• **Frontend:** Add `director` and `branch_admin` to `getRoleLabel()` and `ROLE_COLORS` |
| 7 | • **Frontend:** Add page-level guards to `/dashboard/users`, `/dashboard/staff`, `/dashboard/finance`, `/dashboard/reports`, `/dashboard/schools`, `/dashboard/discipline`, `/dashboard/meetings`, `/dashboard/crm`, `/dashboard/branches` |

### Phase 1: Foundation & Security (Hafta 2-5)
**Maqsad:** Loyihani barqaror, xavfsiz va filial-bo'yicha to'g'ri ishlaydigan qilish.

| Week | Tasks |
|------|-------|
| 2 | • Fix WebSocket CORS & room auth<br>• Fix auth Redis fallback (fail closed)<br>• Add `$executeRaw` parameterization<br>• Add `middleware.ts` for frontend auth |
| 3 | • **Schema:** Add `branchId` to `Exam`, `Homework`, `Subject`, `DisciplineIncident`, `FeeStructure`<br>• **Schema:** Add `@@index([schoolId, branchId])` to `User` and `Class`<br>• Implement soft deletes for `User`, `Class`, `Payment`<br>• Fix `User.email` uniqueness → `@@unique([schoolId, email])`<br>• Add missing FKs (`library_loans`, `leads`) |
| 4 | • **Backend:** Fix `exams.service.ts`, `homework.service.ts`, `schedule.service.ts`, `discipline.service.ts` — add `@BranchContext()` + `branchFilter()`<br>• **Backend:** Fix `clubs.service.ts` — pass `branchCtx` to `update`, `remove`, `getMembers`<br>• **Backend:** Fix `reports.service.ts` / `analytics.service.ts` — add `branchId` param to summary methods<br>• Secure upload serving (signed URLs)<br>• Add file type validation + magic bytes |
| 5 | • **Frontend:** Add `BranchSelector` to user creation form (`users/page.tsx`)<br>• **Frontend:** Add `BranchSelector` to class creation form (`classes/page.tsx`)<br>• **Frontend:** Add `BranchSelector` to lead creation form (`crm/page.tsx`)<br>• **Backend:** Fix `users.service.ts` `importFromCsv()` — add `branchId` column support or default branch<br>• Remove hardcoded secrets from seed/validation<br>• Add distributed rate limiting (Redis) |

### Phase 2: Backend Architecture (Hafta 4-7)
**Maqsad:** God Service'larni parchalash va abstraction qo'shish.

| Week | Tasks |
|------|-------|
| 4 | • Implement `BaseRepository<T>` abstraction<br>• Migrate `UsersService` to `UserRepository`<br>• Centralize `SCHOOL_WIDE_ROLES` and branch filter logic |
| 5 | • Refactor `PaymentsService` → Provider pattern (Payme/Click)<br>• Extract DTOs from service files<br>• Remove all `as any` casts |
| 6 | • Refactor `PayrollService` into smaller services<br>• Create `AuditInterceptor` + `@AuditAction()` decorator<br>• Add `IEventBus` abstraction |
| 7 | • Refactor `ReportsService` / `AnalyticsService`<br>• Fix N+1 queries (`getMonthlyRevenue`, `getDebtors`)<br>• Add pagination to `getWeek()`, `findByClass()` |

### Phase 3: Frontend Modernization (Hafta 8-11)
**Maqsad:** Next.js 14 imkoniyatlaridan to'liq foydalanish + portal to'g'ri ishlaydi.

| Week | Tasks |
|------|-------|
| 8 | • Extract components from `dashboard/page.tsx`<br>• Create `_components/` structure for all pages<br>• Add `next/dynamic` for Recharts and dialogs |
| 9 | • Convert data-fetching pages to Server Components<br>• Move TanStack Query to mutations/client state only<br>• Add `next/image` everywhere |
| 10 | • Fix sidebar navigation matrices — `director`, `branch_admin`, `super_admin` to'g'ri ko'rinishi kerak<br>• Fix mobile-nav va command-palette'da hamma rollar uchun to'g'ri navigatsiya<br>• Fix `/dashboard/resources` — student uchun student-visible tabs qo'shish yoki nav'dan olib tashlash |
| 11 | • Student dashboard'ga EduCoin balance + quick link qo'shish<br>• Parent portal'da EduCoin tab'ini to'g'ri integratsiya qilish<br>• Fix auth storage (httpOnly cookies) |

### Phase 4: Data Integrity & Schema Cleanup (Hafta 11-12)
**Maqsad:** Database'ni toza va ishonchli qilish.

| Week | Tasks |
|------|-------|
| 11 | • Remove redundant fields (`roomNumber`, `Club.schedule`)<br>• Migrate string enums to Prisma enums<br>• Add CHECK constraints where possible |
| 12 | • Refactor `StaffSalary.userId @unique`<br>• Add BRIN indexes for time-series data<br>• Final migration cleanup (drift fix) |

### Phase 5: DevOps & Observability (Hafta 13-14)
**Maqsad:** Production-ready infrastructure.

| Week | Tasks |
|------|-------|
| 13 | • Add security headers to selfhost nginx<br>• Fix Docker Compose hardcoded secrets<br>• Add resource limits to containers<br>• Add graceful shutdown handler |
| 14 | • Implement request ID tracing<br>• Add structured logging (remove Prisma query logs from prod)<br>• Add health checks to all Dockerfiles<br>• Document security runbook |

---

## 10. Success Metrics

| Metric | Before | Target (After Phase 5) |
|--------|--------|------------------------|
| Average service file size | ~500 lines | <200 lines |
| `as any` count | 20+ | 0 |
| Critical security issues | 6 | 0 |
| High severity issues | 13 | <3 |
| Frontend page file size (max) | 1,761 lines | <300 lines |
| Server Components percentage | 0% | >60% |
| Database soft delete coverage | 0% | 100% (critical tables) |
| Test coverage | Unknown | >60% |

---

## 11. Long-Term Strategic Recommendations

### 11.1 Microservices Readiness
Hozirgi "modular monolith"dan kelajakda mikroservislar'ga o'tish uchun:
- Har bir domain module'ini **independent package** sifatida ajratish (Nx monorepo pattern).
- Shared kernel (`@eduplatform/shared`) yaratish — faqat generic utilities.
- Event-driven architecture'ga o'tish (RabbitMQ / AWS SNS / NATS).

### 11.2 API Versioning Strategy
Hozir `/api/v1/` prefix bor, lekin versioning strategy aniq emas:
- URL versioning'ni saqlab qolish.
- Breaking change'larni `v2` orqali chiqish.
- Deprecation policy yaratish (6 oylik eski version support).

### 11.3 Testing Strategy
Hozir testlar deyarlik yo'q (faqat `.spec.ts` fayllar bor, lekin kam):
- **Unit tests:** Jest + mocking for repositories.
- **Integration tests:** Supertest + testcontainers (PostgreSQL + Redis).
- **E2E tests:** Playwright for critical flows (login, payment, exam).

### 11.4 Documentation
- **ADR (Architecture Decision Records)** yuritish — nima uchun bu arxitektura tanlangan.
- **API documentation:** Swagger'dan tashqari, developer onboarding guide.
- **Database documentation:** ER diagram, indexing rationale.

---

> **Next Step:** Ushbu roadmap'ni tasdiqlang va birinchi phase'dan boshlaymiz. Agar biror muammo yoki phase bo'yicha chuqurroq tahlil kerak bo'lsa, ayting.
