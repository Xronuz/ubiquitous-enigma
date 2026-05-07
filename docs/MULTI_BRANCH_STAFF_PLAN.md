# EPIC: Ko'p filialli xodim qo'llab-quvvatlash (Multi-Branch Staff Support)

**Status:** Planning
**Estimated effort:** ~10–12 soat (Bosqich 1–3 birga). Bosqich 4 alohida — qo'shimcha 4–5 soat + DB migration.
**Owner:** TBD
**Driver / Why:** Bitta o'qituvchi/xodim bir nechta filialda bir vaqtda ishlay olmaydi. Hozir ikkita alohida account workaround'i ishlatilmoqda — bu duplikatsiya, statistik xato va maosh hisoblashini buzadi.

---

## User Stories

**US-1 (Branch admin):** Filial B'ning admini yangi xodim qo'shganda email mavjud bo'lsa, "bu xodim Filial A da bor — Filial B ga ham qo'shasizmi?" prompt'ini ko'rib, bir tugma bilan biriktirishi mumkin.

**US-2 (Teacher):** Bir o'qituvchi bitta login bilan A va B filiallaridagi sinflarini, jadvalini, davomatini ko'ra oladi va boshqaradi.

**US-3 (Director):** Direktor xodim profilida "Biriktirilgan filiallar" ro'yxatini ko'radi va kerak bo'lsa qo'shadi/olib tashlaydi.

---

## Acceptance Criteria (umumiy)

- [ ] Branch admin email mavjud xodim email'ini kiritsa, "qo'shish" dialog ko'rinadi (faqat o'sha maktab ichida)
- [ ] Boshqa maktab email'i tekshirilganda "mavjud" javob qaytmaydi (privacy)
- [ ] Branch admin o'zidan **yuqori** rolli xodimni biriktira olmaydi
- [ ] O'qituvchi 2 ta filialga biriktirilgan bo'lsa, login qilganda **ikkalasining** sinflarini ko'radi
- [ ] Davomat/jadval/baho yaratganda branchId **sinfdan** olinadi, JWT'dan emas (Bosqich 4)
- [ ] Branch switcher o'qituvchiga ham ko'rinadi, lekin faqat biriktirilgan filiallar
- [ ] Audit log: kim kimni qaysi filialga qo'shgan/olib tashlagan
- [ ] Mavjud (single-branch) foydalanuvchilar hech qanday regresiyasiz ishlashi
- [ ] Maktab boshqa maktab email'ini "mavjudligini" tekshirib email enumeration qila olmasin

---

## Non-Goals (bu sprintda KIRMAYDI)

- Bosqich 4 — payroll branchId-aware logic (alohida sprint)
- Cross-school multi-tenancy (foydalanuvchi 2 ta maktabda) — bu boshqa muammo
- Notification (email/push) yangi biriktirish haqida — keyingi sprint
- Bulk assignment (CSV orqali ko'p filialga biriktirish)

---

# BOSQICH 1 — UX Flow (email-detect + assign-to-branch)

**Goal:** Branch admin form'da email kiritganda, mavjud xodim aniqlansa, "filialga qo'shish" dialog'i.

**Estimate:** 3–4 soat

---

### T1.1 — Backend: email mavjudligini tekshirish endpoint

**File:** `apps/backend/src/modules/users/users.controller.ts`
**File:** `apps/backend/src/modules/users/users.service.ts`

**Endpoint:** `GET /v1/users/check-email?email=...`

**Roles:** `DIRECTOR`, `VICE_PRINCIPAL`, `BRANCH_ADMIN`

**Logic:**
```ts
async checkEmail(email: string, currentUser: JwtPayload): Promise<{
  exists: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    primaryBranchId: string | null;
    primaryBranchName: string | null;
    assignedBranches: { id: string; name: string }[];
  };
}> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      branch: { select: { id: true, name: true } },
      branchAssignments: {
        where: { isActive: true },
        include: { branch: { select: { id: true, name: true } } }
      }
    }
  });
  // CRITICAL: faqat o'sha maktab — boshqa maktabning email'ini ochib bermaslik
  if (!user || user.schoolId !== currentUser.schoolId) {
    return { exists: false };
  }
  return { exists: true, user: {...} };
}
```

**Acceptance:**
- [ ] Boshqa maktab email'i → `{ exists: false }` (privacy)
- [ ] O'sha maktab email'i → to'liq ma'lumot (primary + assigned filiallar)
- [ ] Email format invalid → 400
- [ ] Rate limiting (existing global throttler yetarli)

---

### T1.2 — Backend: filialga biriktirish endpoint

**File:** `apps/backend/src/modules/users/users.controller.ts`
**File:** `apps/backend/src/modules/users/users.service.ts`

**Endpoint:** `POST /v1/users/:id/assign-branch`

**Body:**
```ts
{
  branchId: string;
  role: UserRole; // bu filial uchun rol (asosiy roldan farq qilishi mumkin)
}
```

**Roles:** `DIRECTOR`, `VICE_PRINCIPAL`, `BRANCH_ADMIN`

**Logic + tekshiruvlar:**
1. Target user mavjud va o'sha maktabda
2. Target branch mavjud va o'sha maktabda + isActive
3. `assertCanManage(currentUser, dto.role)` — actor bu rolni boshqara olishi shart (yangi role-hierarchy util'dan)
4. Branch admin → faqat **o'z filialiga** biriktira oladi (currentUser.branchId === dto.branchId)
5. Director/vice_principal → maktab ichidagi har qanday filialga
6. `UserBranchAssignment.upsert({ userId_branchId })` — agar mavjud bo'lsa isActive=true qilish
7. Audit log

**Acceptance:**
- [ ] Branch admin boshqa filialga biriktira olmaydi → 403
- [ ] Target schoolId currentUser.schoolId'dan farq → 404 (privacy)
- [ ] Target rol actor'dan yuqori → 403
- [ ] Idempotent (qayta-qayta chaqirish xato bermaydi)
- [ ] Audit log entry yaratiladi

---

### T1.3 — Backend: filialdan olib tashlash endpoint

**Endpoint:** `DELETE /v1/users/:id/assign-branch/:branchId`

**Roles:** `DIRECTOR`, `VICE_PRINCIPAL`, `BRANCH_ADMIN`

**Logic:**
- Branch admin faqat o'z filialiga tegishli biriktirmani olib tashlay oladi
- Primary branchId'ni olib tashlay olmaydi (faqat additional assignment'larni)
- Soft delete: `isActive=false` (audit uchun)
- Cache invalidation kerak (Bosqich 2'dagi JWT update logic'i bilan)

**Acceptance:**
- [ ] Primary branch'ni olib tashlash urinishi → 400 "Asosiy filialni o'zgartirish uchun foydalanuvchini tahrir qiling"
- [ ] Audit log

---

### T1.4 — Backend: create-user logic'ini moslashtirish

**File:** `apps/backend/src/modules/users/users.service.ts:120` (`create` method)

**Current:**
```ts
const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
if (existing) throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");
```

**New:**
```ts
const existing = await this.prisma.user.findUnique({
  where: { email: dto.email },
  select: { id: true, schoolId: true, role: true, firstName: true, lastName: true }
});
if (existing) {
  if (existing.schoolId === currentUser.schoolId) {
    // Frontend bu xatoni "assign-branch dialog" tarzida ko'rsatadi
    throw new ConflictException({
      code: 'USER_EXISTS_IN_SCHOOL',
      message: 'Bu email allaqachon mavjud',
      existingUserId: existing.id,
      existingRole: existing.role,
      existingName: `${existing.firstName} ${existing.lastName}`,
    });
  }
  // Boshqa maktab → bir xil neutral xato
  throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");
}
```

**Acceptance:**
- [ ] Frontend `code: USER_EXISTS_IN_SCHOOL` ni qabul qila oladi va dialog ko'rsatadi
- [ ] Boshqa maktab uchun ma'lumot oqib chiqmaydi

---

### T1.5 — Frontend: Email blur'da check va dialog

**File:** `apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx`
**File:** `apps/frontend/src/lib/api/users.ts`

**API client (`lib/api/users.ts`):**
```ts
checkEmail(email: string): Promise<CheckEmailResponse>
assignBranch(userId: string, branchId: string, role: UserRole): Promise<void>
removeBranchAssignment(userId: string, branchId: string): Promise<void>
```

**Form'da:**
- `<Input>` email field'iga `onBlur` handler qo'shish (debounce 400ms)
- Email format valid bo'lsa, `usersApi.checkEmail(email)` chaqirish
- `exists: true` → form'ni yashirib, `<AssignBranchDialog>` ochish
- `exists: false` → odatdagi flow

**Acceptance:**
- [ ] Email yozish paytida debounce ishlaydi (faqat blur'da yoki 400ms kutgandan keyin)
- [ ] Form submit'da ham backend `USER_EXISTS_IN_SCHOOL` xatosini tutib, dialog'ni ochish (race kondisiyaga qarshi)

---

### T1.6 — Frontend: AssignBranchDialog komponent

**File:** `apps/frontend/src/components/users/assign-branch-dialog.tsx` (yangi)

**Props:**
```ts
{
  existingUser: { id, firstName, lastName, role, primaryBranchName, assignedBranches };
  targetBranchId: string; // current actor's branch (yoki tanlanadigan)
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**UI:**
- Dialog title: "Bu xodim allaqachon mavjud"
- Body:
  - "**Aziz Karimov** (O'qituvchi) — hozir Filial A va Filial C ga biriktirilgan"
  - Rol tanlash dropdown (default: actor tanlagan rol)
  - Ogohlantirish: "Xodimga ushbu filial uchun ham huquq beriladi"
- Actions: `[Bekor]`, `[Filialga qo'shish]`

**Acceptance:**
- [ ] Loading va error holatlari
- [ ] Muvaffaqiyatli bo'lsa toast + dialog yopiladi + `users` query refetch
- [ ] Branch admin uchun dropdown faqat ruxsat berilgan rollarni ko'rsatadi (frontend role-hierarchy util)

---

### T1.7 — Frontend: User profilida "Biriktirilgan filiallar" sektsiyasi

**File:** `apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx` (yoki alohida user-detail page'da)

- Foydalanuvchi qatoriga "Filiallar" ustun yoki tafsilot dialog
- Director/vice_principal uchun: filial qatorlari yonida "olib tashlash" tugmasi
- Branch admin uchun: faqat o'z filiali bilan bog'liq biriktirmani ko'rsatish

---

### T1.8 — Audit logs

`AuditService.log` chaqiruvlari:
- `action: 'assign_branch'` — entityId: userId, newData: `{ branchId, role }`
- `action: 'unassign_branch'` — entityId: userId, oldData: `{ branchId, role }`

---

# BOSQICH 2 — Multi-Branch Query Support (JWT + buildTenantWhere)

**Goal:** O'qituvchi login qilganda 2 ta filialdagi ma'lumotlarni ko'rsin.

**Estimate:** 3–4 soat

---

### T2.1 — JWT payload'ga `assignedBranchIds` qo'shish

**File:** `packages/types/src/auth.ts` (yoki shu turdagi)

```ts
interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  branchId: string | null;        // primary
  assignedBranchIds: string[];    // YANGI — additional active assignments
  isSuperAdmin?: boolean;
}
```

`packages/types` build qilinishi shart.

---

### T2.2 — Auth service login/refresh/switchBranch

**File:** `apps/backend/src/modules/auth/auth.service.ts`

`generateTokens` ichida (yoki uning oldida):
```ts
const assignments = await this.prisma.userBranchAssignment.findMany({
  where: { userId: user.id, isActive: true, branchId: { not: user.branchId ?? undefined } },
  select: { branchId: true },
});
const assignedBranchIds = assignments.map(a => a.branchId);
```

Buni quyidagilarda ishlatish:
- `login`
- `refreshTokens`
- `switchBranch` (Bosqich 3'da kengaytiriladi)

**Acceptance:**
- [ ] JWT decode qilinganda `assignedBranchIds` mavjud (bo'sh array bo'lsa ham)
- [ ] Backward compat: eski JWT'da bu field yo'q bo'lsa, default bo'sh array

---

### T2.3 — `buildTenantWhere`'ni kengaytirish

**File:** `apps/backend/src/common/utils/tenant-scope.util.ts`

**New:**
```ts
export function buildTenantWhere(user: JwtPayload): {
  schoolId?: string;
  branchId?: string | { in: string[] };
} {
  if (user.isSuperAdmin || user.role === UserRole.SUPER_ADMIN) return {};

  const where: any = { schoolId: user.schoolId! };

  // School-wide rollar (director, vice_principal) branchId=null bo'lganda — barcha filiallar
  if (!user.branchId) return where;

  const allBranches = [user.branchId, ...(user.assignedBranchIds ?? [])];
  if (allBranches.length === 1) {
    where.branchId = allBranches[0];
  } else {
    where.branchId = { in: allBranches };
  }
  return where;
}
```

**Acceptance:**
- [ ] Single-branch user: `where.branchId = "uuid"` (eski xatti-harakat saqlanadi)
- [ ] Multi-branch user: `where.branchId = { in: [...] }`
- [ ] Super admin va director (school-wide): `branchId` filtri yo'q

---

### T2.4 — Edge case: branch_admin switching

`auth.service.ts:208`'dagi assignment check'i `BRANCH_ADMIN` uchun allaqachon to'g'ri ishlaydi — uni multi-branch teacher uchun ham kengaytirish (Bosqich 3'da).

---

### T2.5 — Regresiya testi

- Single-branch user (eski hisoblar) — hech qanday o'zgarish bo'lmasin
- Director (branchId=null) — barcha filiallarni ko'rsin
- Multi-branch teacher — A+B sinflarini ko'rsin

---

# BOSQICH 3 — Branch Switcher kengaytmasi (Teacher/Staff)

**Goal:** O'qituvchi UI'da "hozir qaysi filialda ishlayapman" ni tanlay olsin (yoki barchasini birga ko'rsin).

**Estimate:** 2 soat

---

### T3.1 — `SWITCHER_ROLES` kengaytmasi

**File:** `apps/frontend/src/components/layout/branch-switcher.tsx:32`

```ts
const SWITCHER_ROLES = new Set([
  'director', 'branch_admin',
  'vice_principal',
  'teacher', 'class_teacher',
  'accountant', 'librarian',
]);
```

---

### T3.2 — "Barcha filiallar" opsiyasini cheklash

`BranchSwitcher` komponentida:
- `director` va `super_admin` uchun: "Barcha filiallar" (branchId=null) qoladi
- Boshqa rollar uchun: faqat **biriktirilgan** filiallar (`primaryBranch + assignedBranches`)
- Bitta filiali bo'lsa — switcher emas, oddiy badge

---

### T3.3 — `switchBranch` endpoint'ini multi-branch staff uchun kengaytirish

**File:** `apps/backend/src/modules/auth/auth.service.ts:177`

Hozirgi check faqat `BRANCH_ADMIN` uchun (`if (currentUser.role === UserRole.BRANCH_ADMIN)` line 207). Buni quyidagiga o'zgartirish:

```ts
const SCHOOL_WIDE_SWITCHERS = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR];
if (!SCHOOL_WIDE_SWITCHERS.includes(currentUser.role)) {
  // Director va super_admin'dan tashqari hamma — assignment talab qiladi
  const isAssigned =
    currentUser.branchId === targetBranchId ||
    currentUser.assignedBranchIds?.includes(targetBranchId);
  const hasActiveAssignment = isAssigned
    ? true
    : !!(await this.prisma.userBranchAssignment.findUnique({
        where: { userId_branchId: { userId: currentUser.sub, branchId: targetBranchId } },
        select: { isActive: true },
      }))?.isActive;
  if (!hasActiveAssignment) {
    throw new ForbiddenException("Bu filialga kirish huquqingiz yo'q");
  }
}
```

**Acceptance:**
- [ ] Teacher/staff faqat assigned filiallarga switch qila oladi
- [ ] Director/super_admin har qanday filialga (mavjud xatti-harakat)
- [ ] Branch admin — eski mantiq saqlanadi

---

### T3.4 — Branch switch'da query cache reset

**File:** `apps/frontend/src/hooks/use-switch-branch.ts`

Switching'dan keyin `queryClient.clear()` yoki spetsifik query'larni invalidate qilish — chunki yangi branchId bilan ma'lumot boshqacha ko'rinadi.

---

### T3.5 — Frontend: assignment o'zgargandan keyin JWT yangilash

**File:** `apps/frontend/src/components/users/assign-branch-dialog.tsx` (Bosqich 1)

- `assign-branch` muvaffaqiyatli bo'lsa, **agar joriy login qilgan foydalanuvchi shu user bo'lsa**, `refreshTokens` chaqirish
- Bu kam tarqalgan keys, lekin to'g'ri xatti-harakat

---

# BOSQICH 4 (ALOHIDA SPRINT — kirmaydi) — Branch-Aware Actions

**Goal:** Davomat, jadval, baho, payroll — branchId'ni kontekstdan emas, **resource'dan** olishi.

**Why alohida:** Schema migratsiyasi (`PayrollItem.branchId` qo'shish) va biznes-mantiq jiddiyroq. Bosqich 1–3 to'liq ishlatilishi mumkin bunsiz ham.

### Tasks (umumiy):
- T4.1 `attendance.markAttendance` — `class.branchId`'dan olish
- T4.2 `schedule` create/update — `class.branchId`'dan
- T4.3 `grade` create — `class.branchId`'dan
- T4.4 (Migration) `PayrollItem.branchId` qo'shish, soat-soat hisobini filial bo'yicha ajratish
- T4.5 Hisobotlar: filial bo'yicha alohida ko'rsatish

---

# Test Plan

### Unit
- `role-hierarchy.util` — multi-branch hollarda
- `buildTenantWhere` — assignedBranchIds bilan/sizsiz
- `users.service.checkEmail` — boshqa maktab email'i privacy

### Integration (e2e)
1. **Happy path:** Branch admin (B) yangi xodim formasida `teacher@a.uz` kiritadi → dialog → tasdiqlaydi → assignment yaratiladi → teacher login qilganda B sinfini ko'radi
2. **Privacy:** Branch admin (school1) `xyz@school2.uz` ni tekshiradi → `exists: false`
3. **Role escalation:** Branch admin direktorni o'z filialiga biriktirishga harakat qiladi → 403
4. **Switch:** Teacher A↔B switch qila oladi, lekin C ga emas
5. **Regression:** Mavjud single-branch o'qituvchi hech qanday o'zgarish bo'lmaydi
6. **Concurrent:** ikkita branch admin bir vaqtda bir xil userni biriktirsa — idempotent

### Manual smoke
- [ ] 1 ta yangi maktab yaratish, direktor + 2 filial
- [ ] Filial A da teacher yaratish
- [ ] Filial B branch admin sifatida login qilib, shu teacher email'ini kiritish → dialog
- [ ] Tasdiqlash → teacher login → branch switcher ikkala filialni ko'rsatadi
- [ ] B filiali sinfini ko'rsatadimi tekshirish

---

# Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| JWT size — agar 10+ filial bo'lsa, payload kattalashadi | Hozirgi maktablar 2-3 filialdan kam, OK. 10+ holatda backend tomondan chegaralash |
| Cache invalidation — assignment o'zgarganda eski JWT effektsiz | Refresh token flow + frontend'da query.clear() |
| `branchId: { in: [...] }` index — Postgres performance | Hozirgi `@@index([branchId])` yetarli, lekin yuk testi |
| Email enumeration via check-email | Faqat schoolId match'da `exists: true` |
| Race condition: user yaratish va biriktirish bir vaqtda | Frontend: `USER_EXISTS_IN_SCHOOL` xatosini tutib, dialog'ni qayta ochish |

---

# Rollout

- **Backward compatible** — single-branch foydalanuvchilar hech qanday ta'sirsiz
- **Feature flag kerak emas** — yangi UI faqat email mavjud bo'lganda ko'rinadi
- **Migration** — schema o'zgarishi yo'q (UserBranchAssignment allaqachon mavjud)
- **Deploy ketma-ketligi:**
  1. Backend (T1.1–T1.4, T2.1–T2.3, T3.3) deploy
  2. Frontend (T1.5–T1.7, T3.1–T3.4) deploy
  3. Smoke test
  4. Direktorlarni xabardor qilish (ichki release notes)

---

# Files Touched (umumiy ro'yxat)

**Backend:**
- `apps/backend/src/modules/users/users.controller.ts` (yangi endpoint'lar)
- `apps/backend/src/modules/users/users.service.ts` (`checkEmail`, `assignBranch`, `removeBranchAssignment`, `create` o'zgarishi)
- `apps/backend/src/modules/users/dto/assign-branch.dto.ts` (yangi)
- `apps/backend/src/modules/auth/auth.service.ts` (`generateTokens`, `switchBranch`)
- `apps/backend/src/common/utils/tenant-scope.util.ts` (`buildTenantWhere` kengaytma)
- `apps/backend/src/common/utils/role-hierarchy.util.ts` (allaqachon mavjud — qayta ishlatiladi)

**Types:**
- `packages/types/src/auth.ts` (`JwtPayload.assignedBranchIds`)

**Frontend:**
- `apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx` (form'da check)
- `apps/frontend/src/components/users/assign-branch-dialog.tsx` (yangi)
- `apps/frontend/src/lib/api/users.ts` (yangi metodlar)
- `apps/frontend/src/components/layout/branch-switcher.tsx` (`SWITCHER_ROLES`)
- `apps/frontend/src/hooks/use-switch-branch.ts` (cache reset)
- `apps/frontend/src/store/auth.store.ts` (assignedBranchIds saqlash, agar kerak bo'lsa)

---

# Summary task ro'yxati

```
[ ] T1.1  Backend: GET /v1/users/check-email
[ ] T1.2  Backend: POST /v1/users/:id/assign-branch
[ ] T1.3  Backend: DELETE /v1/users/:id/assign-branch/:branchId
[ ] T1.4  Backend: create() — USER_EXISTS_IN_SCHOOL structured error
[ ] T1.5  Frontend: email-blur check
[ ] T1.6  Frontend: AssignBranchDialog component
[ ] T1.7  Frontend: user profilida "Biriktirilgan filiallar"
[ ] T1.8  Audit logs
[ ] T2.1  packages/types: JwtPayload.assignedBranchIds
[ ] T2.2  auth.service: generateTokens — assignment'larni yuklash
[ ] T2.3  buildTenantWhere: { in: [...] } variant
[ ] T2.5  Regresiya test
[ ] T3.1  SWITCHER_ROLES kengaytma
[ ] T3.2  "Barcha filiallar" opsiyasini cheklash
[ ] T3.3  switchBranch — multi-branch staff support
[ ] T3.4  Branch switch'da cache reset
[ ] T3.5  Assignment o'zgargandan keyin JWT refresh
[ ] Test  Unit + e2e + manual smoke
[ ] Deploy ketma-ketlik bo'yicha
```

---

**Owner / Sprint:** TBD
**PR strategy:** Bitta yirik PR yoki 3 ta ketma-ket PR (Bosqich 1, 2, 3 alohida) — review uchun ikkinchisi qulay.
