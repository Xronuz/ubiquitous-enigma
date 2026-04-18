# EduPlatform — To'liq Bug Audit va Improvement Rejasi

> **Sana:** 2026-04-18  
> **Test usuli:** 163 ta API test (8 rol × barcha endpoint), frontend kodi analizi, security scan  
> **Umumiy natija:** ✅ 136 PASS | ❌ 14 FAIL | ⚠️ 13 WARN | 🎯 83% muvaffaqiyat

---

## Mundarija

1. [Xavfsizlik Buglari — ROL BYPASS](#1-xavfsizlik-buglari--rol-bypass)
2. [Funksional Buglar — Ruxsat xatolari](#2-funksional-buglar--ruxsat-xatolari)
3. [Stub / Tugallanmagan Endpointlar](#3-stub--tugallanmagan-endpointlar)
4. [API Kontrakt Xatolari](#4-api-kontrakt-xatolari)
5. [Ma'lumot Strukturasi Xatolari](#5-malumot-strukturasi-xatolari)
6. [UI/UX Muammolari (Frontend)](#6-uiux-muammolari-frontend)
7. [Arxitektura va Kod Sifati Muammolari](#7-arxitektura-va-kod-sifati-muammolari)
8. [Yaxshilash Rejasi (Approve uchun)](#8-yaxshilash-rejasi-approve-uchun)

---

## 1. Xavfsizlik Buglari — ROL BYPASS

> 🚨 **Kritik** — Bu buglar ota-onalarga mos bo'lmagan ma'lumotlarga kirish imkonini beradi

### BUG-SEC-01: Parent roli /subjects, /schedule, /homework, /exams, /clubs ga kira oladi

**Holati:** `parent` roli quyidagi endpointlarga to'g'ridan-to'g'ri kirish huquqiga ega:

| Endpoint | Muammo |
|----------|--------|
| `GET /api/v1/subjects` | Barcha maktab fanlarini ko'radi |
| `GET /api/v1/schedule/today` | Barcha sinflar jadvalini ko'radi |
| `GET /api/v1/homework` | Barcha uy vazifalarini ko'radi |
| `GET /api/v1/exams` | Barcha imtihonlarni ko'radi |
| `GET /api/v1/clubs` | Barcha to'garaklarni ko'radi |

**Sababi:** Bu controllerlar `@Roles(...)` dekoratorida `UserRole.PARENT` ni qo'shib ketgan, lekin ota-ona faqat `/parent/child/{id}/...` orqali o'z farzandining ma'lumotlarini ko'rishi kerak.

**Fayl:** `subjects.controller.ts:26`, `schedule` (emas, schedule da parent yo'q), `homework.controller.ts:19`, `exams.controller.ts:32`, `clubs.controller.ts`

**To'g'rilash:**
```typescript
// homework.controller.ts — PARENT olib tashlansin
@Roles(
  UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
  UserRole.STUDENT, 
  // UserRole.PARENT — O'CHIRILSIN! Parent portal orqali ko'rsin
)
```

---

### BUG-SEC-02: Teacher va Parent transport marshrut ma'lumotlarini ko'ra oladi

**Holati:** `GET /api/v1/transport/routes` — `teacher` va `parent` roli ham kirishi mumkin

```typescript
// transport.controller.ts:45 — XATO
@Roles(
  UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
  UserRole.STUDENT, UserRole.PARENT,  // ← bu ikkalasi noto'g'ri
)
```

O'quvchilar va ota-onalar faqat `GET /transport/my-route` (o'z marshrutlari) ko'rishi kerak, barcha marshrutlar emas.

**To'g'rilash:**
```typescript
// GET /transport/routes
@Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER)
```

---

### BUG-SEC-03: Super Admin /classes ga so'rov yuborganda 500 xato

**Holati:** Super admin `schoolId` si yo'q. `/classes` endpointi `schoolId: undefined` bilan Prisma so'rov yuboradi → server crash.

**Kerakli holat:** 403 yoki bo'sh array qaytishi kerak

**Sababi:** `classes.service.ts` da `schoolId` null-check yo'q:
```typescript
// Hozirgi (xato)
where: { schoolId: user.schoolId }  // undefined bo'lsa Prisma xato beradi
// To'g'ri
where: { schoolId: user.schoolId ?? 'INVALID' }
// Yoki super-admin uchun alohida yo'l
if (user.role === UserRole.SUPER_ADMIN) return this.prisma.class.findMany();
```

---

## 2. Funksional Buglar — Ruxsat xatolari

> 🔴 Foydalanuvchilar ishlatishi kerak bo'lgan funksiyalar bloklanib qolgan

### BUG-FUNC-01: Teacher /classes/my-class ga kira olmaydi

**Holati:** `GET /api/v1/classes/my-class` → `teacher` rolida **403 Forbidden**

**Sababi:** Endpoint faqat `UserRole.CLASS_TEACHER` rolini qabul qiladi:
```typescript
// classes.controller.ts:38
@Roles(UserRole.CLASS_TEACHER)  // ← faqat sinf rahbari
```

Lekin seed da yaratilgan o'qituvchilar `teacher` rolida (`teacher@demo-school.uz`). Sinf rahbari ham `teacher` rolini ko'rishi kerak.

**To'g'rilash:**
```typescript
@Roles(UserRole.TEACHER, UserRole.CLASS_TEACHER)
```

**Ta'siri:** Barcha oddiy o'qituvchilar o'z sinflarini ko'ra olmayapti

---

### BUG-FUNC-02: Teacher /attendance/report ga kira olmaydi

**Holati:** `GET /api/v1/attendance/report` → `teacher` rolida **403 Forbidden**

**Sababi:**
```typescript
// attendance.controller.ts:26
@Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER)
// ← UserRole.TEACHER yo'q!
```

O'qituvchi ham o'z sinfining davomat hisobotini ko'rishi mantiqiy.

**To'g'rilash:**
```typescript
@Roles(UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER, UserRole.TEACHER)
```

---

### BUG-FUNC-03: Student va Parent leave-requests ga kira olmaydi

**Holati:**
- `GET /api/v1/leave-requests` → `student` rolida **403**
- `POST /api/v1/leave-requests` → `student` rolida **403**
- `GET /api/v1/leave-requests` → `parent` rolida **403**

**Sababi:** Leave requests rollar ro'yxatida faqat xodimlar:
```typescript
@Roles(
  UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
  UserRole.LIBRARIAN, UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL,
  // ← UserRole.STUDENT va UserRole.PARENT yo'q!
)
```

**To'g'rilash:**
```typescript
// POST (so'rov yuborish) — student ham yuborishi kerak
@Roles(...barcha_xodimlar..., UserRole.STUDENT)

// GET (o'z so'rovlarini ko'rish) — service darajasida filter qilish
@Roles(...barcha_xodimlar..., UserRole.STUDENT, UserRole.PARENT)
// Service: student faqat o'zinikini, parent faqat farzandinikinini ko'radi
```

---

### BUG-FUNC-04: School Admin notifications/queue-stats ga kira olmaydi

**Holati:** `GET /api/v1/notifications/queue-stats` → `school_admin` rolida **403**

**Sababi:**
```typescript
// notifications.controller.ts:66
@Roles(UserRole.SUPER_ADMIN)  // faqat super admin!
```

Maktab admin ham o'z maktabidagi queue holatini kuzatishi kerak.

**To'g'rilash:**
```typescript
@Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
```

---

### BUG-FUNC-05: Parent Portal child detail endpointlari hammasi 404

**Holati:** `GET /parent/children` ishlaydi (farzand ID qaytaradi), lekin:
- `GET /parent/child/{id}` → **404**
- `GET /parent/child/{id}/attendance` → **404**
- `GET /parent/child/{id}/grades` → **404**
- `GET /parent/child/{id}/schedule` → **404**
- `GET /parent/child/{id}/payments` → **404**

**Sababi (data bug):** `getChildren` `ParentStudent` yozuvlarini qaytaradi, yozuvning `id` = `ParentStudent.id` (relation ID). Lekin `getChild(studentId)` funksiyasi `studentId` (farzandning user.id) kutadi.

```typescript
// XATO: Frontend/test child.id ishlatadi — bu ParentStudent.id
const childId = children[0].id;  // "52ffd198..." — ParentStudent.id, emas student.id!

// TO'G'RI: student.id ishlatish kerak
const studentId = children[0].student.id;  // "5a2d325b..." — haqiqiy student user ID
```

**To'g'rilash:** `getChildren` da qaytariladigan object dan `student.id` ni alohida chiqarish yoki controller `{id}` parametri sifatida `ParentStudent.studentId` ni qabul qilishi:

```typescript
// parent.service.ts — getChildren response to'g'rilash
return relations.map(r => ({
  id: r.student.id,  // ← ParentStudent.id emas, student.id
  ...r.student,
}));
```

**Ta'siri:** Parent portal hech ishlash imkoni yo'q! Asosiy funksional to'liq broken.

---

## 3. Stub / Tugallanmagan Endpointlar

> ⚠️ Endpoint mavjud, controller ham bor, lekin service implementatsiya yo'q yoki 404 qaytaradi

| Endpoint | Status | Eslatma |
|----------|--------|---------|
| `GET /api/v1/grades` | 404 | Base list endpoint yo'q — faqat `/grades/student/:id`, `/grades/class/:id` ishlaydi |
| `GET /api/v1/canteen` | 404 | Faqat `/canteen/week`, `/canteen/today`, `/canteen/:id` ishlaydi |
| `POST /api/v1/notifications/send` | 403 (admin uchun) | Admin bildirishnoma yuborishi kerak |
| `GET /api/v1/grades/student/:id` (student) | 403 | Student o'z baholarini `grades/student/{own-id}` dan ko'ra olmaydi (student ID access-control xato) |
| Audit log export PDF | Yo'q | `/audit-logs/export` ishlaydi lekin PDF format yo'q |

---

## 4. API Kontrakt Xatolari

> 🔧 Frontend va Backend API shartnomasi mos emas

### BUG-CONTRACT-01: Attendance mark DTO — field nomi noto'g'ri

**Frontend/Swagger da:** `records` field ishlatilgan
**Backend DTO da:** `entries` field kutiladi

```typescript
// NOTO'G'RI (Swagger docs ko'rsatishi mumkin):
POST /attendance/mark
{ "classId": "...", "records": [...] }

// TO'G'RI (DTO da):
POST /attendance/mark  
{ "classId": "...", "entries": [{ "studentId": "...", "status": "present" }] }
```

**Natija:** Swagger docs dan foydalanuvchi test qilsa 400 xato oladi

---

### BUG-CONTRACT-02: Leave Request DTO — `type` field yo'q

```typescript
// Student POST /leave-requests yuborsa
{ "reason": "Kasal", "startDate": "2026-04-25", "endDate": "2026-04-26", "type": "sick" }
// → 400: "property type should not exist"
```

`type` field DTO da yo'q, lekin mantiqiy kerak (sick/personal/vacation). DTO ga qo'shilishi kerak.

---

### BUG-CONTRACT-03: /grades base endpoint yo'q

Frontend `GET /grades` chaqirishi kutiladi (barcha grades listi), lekin bu endpoint mavjud emas. Frontend `/grades` page blank ko'rsatadi.

---

### BUG-CONTRACT-04: Messaging send endpoint URL noto'g'ri

```typescript
// Swagger'da:
POST /messaging/{userId}

// Lekin messaging conversations:
GET /messaging/{userId}/conversation   ← ikki xil pattern
```

Tutarsiz URL naming — ba'zi joylarda `/{userId}`, ba'zida `/{userId}/conversation`.

---

## 5. Ma'lumot Strukturasi Xatolari

### BUG-DATA-01: O'qituvchi 2 ta sinf bilan bog'liq (duplicate seed)

Student `5a2d325b` (Bobur Mirzayev) **2 ta** `ClassStudent` yozuviga ega:
- `demo-class-5a` (seed dan)
- `72442ab7` (boshqa 5-A, takroriy seed dan)

Bu attendance, grades, schedule hisob-kitoblarida ikkilanishga olib keladi.

**Sababi:** Seed ikki marta ishga tushirilgan yoki seed da upsert faqat user uchun, ClassStudent uchun emas.

---

### BUG-DATA-02: Parent seed farzandinikini ko'rish uchun schoolId talab

Parent token da `schoolId` bor. `verifyParentAccess` da:
```typescript
student: { schoolId: currentUser.schoolId! }
```

Lekin agar parent boshqa maktabdan bo'lsa (super-admin qo'shgan) bu tekshiruv o'ta qattiq. Hozircha bu muammo emas, lekin multi-school kengaytmada bug bo'ladi.

---

## 6. UI/UX Muammolari (Frontend)

> Frontend kodini (`apps/frontend/`) tahlil qilish asosida

### UX-01: Parent Portal — Asosiy sahifa bo'sh

**Muammo:** Parent login qilsa va `/parent` sahifasiga o'tsa — farzand ma'lumotlari yuklana olmaydi, chunki `getChildren` response dan noto'g'ri ID olinadi (yuqorida BUG-FUNC-05).

**Ta'siri:** Ota-onalar platformadan foydalana olmaydi

---

### UX-02: Role asosida sidebar menyu filter qilinmagan

**Muammo:** `student` login qilganda sidebar da `teacher`, `admin` uchun mo'ljallangan elementlar ko'rinsa yoki keraksiz 403 xatolar kelsa, confusion yaratadi.

**Tekshiruv kerak:** Frontend rolga qarab menyu elementlarini to'g'ri yashirayaptimi?

---

### UX-03: Grades sahifasi — `GET /grades` → 404

**Muammo:** Baholar sahifasi yuklanganda `GET /grades` 404 qaytaradi. Frontend blank screen yoki error ko'rsatadi.

**Kerak:** Frontend to'g'ri endpoint chaqirishi kerak: `/grades/student/{currentUser.id}` (student uchun) yoki `/grades/class/{classId}/report` (teacher uchun).

---

### UX-04: Leave Request yaratish formi — student uchun ishlamaydi

**Muammo:** Student "Ta'til so'rovi" tugmasini bossа → 403. Form yuborilmaydi.

**Sabablar:** 2 ta:
1. Backend `@Roles` da `STUDENT` yo'q
2. DTO da `type` field yo'q

---

### UX-05: Notifications send — school_admin uchun blocked

**Muammo:** Admin `POST /notifications/send` yuborganda 403 keladi. Bildirishnoma yuborish UI da tugma bor, lekin ishlaydi.

---

### UX-06: Attendance mark — wrong field name

**Muammo:** Frontend `records` field yuborsa, backend `entries` kutgani uchun 400 xato. Davomat belgilash ishlamaydi.

**Natija:** O'qituvchi davomat belgilash tugmasini bossа → validation error, lekin sababi noaniq error xabar.

---

### UX-07: Teacher "Mening sinfim" sahifasi bo'sh / xato

**Muammo:** `/classes/my-class` endpoint `teacher` rolida 403. Shuning uchun teacher dashboard da "Mening sinfim" widget ishlamaydi.

---

### UX-08: Canteen base route

**Muammo:** `GET /canteen` → 404. Agar admin panel da oshxona CRUD sahifasi bo'lsa, u ishlamaydi. Faqat `week` va `today` ko'rinishlari ishlaydi.

---

### UX-09: Holat xabarlari yo'q (Empty states)

Ko'p sahifalarda ma'lumot bo'lmaganda bo'sh oq sahifa ko'rinadi. Yaxshi UX uchun:
- Tasvirli "Ma'lumot yo'q" holati
- "Qo'shing" havolasi bilan birga

---

### UX-10: Token 15 daqiqada tugaydi, refresh avtomatik emas

**Muammo:** `expiresIn: 900` (15 daqiqa). Agar frontend avtomatik refresh qilmasa, foydalanuvchi 15 daqiqadan keyin 401 xato oladi va logout bo'ladi.

**Tekshiruv kerak:** Frontend interceptor refresh token bilan token yangilayaptimi?

---

## 7. Arxitektura va Kod Sifati Muammolari

### ARCH-01: CLASS_TEACHER vs TEACHER roli chalkashligi

**Muammo:** Sistemada 2 ta o'qituvchi roli bor: `teacher` va `class_teacher`. Ko'p endpointlar faqat `class_teacher` ni ko'rib, `teacher` ni o'tkazib yuborgan.

**Natija:** Oddiy o'qituvchilar ko'p funksiyadan foydalana olmaydi.

**Tavsiya:** `teacher` roli `class_teacher` ning subset huquqlarini olishi kerak, yoki bitta `teacher` roli bo'lib, `classTeacherId` field sinf darajasida saqlanishi kerak (ma'lumotlar bazasida allaqachon shunday).

---

### ARCH-02: Parent faqat Portal orqali — lekin Portal ishlamaydi

**Muammo:** Arxitektura to'g'ri (parent faqat `/parent/child/...` orqali), lekin implementatsiya noto'g'ri (ID mismatch, BUG-FUNC-05). Bu arxitektura to'g'ri yo'nalish, faqat fix kerak.

---

### ARCH-03: Leave Request — Student va Parent qanday foydalanishi aniq emas

**Muammo:** 
- Student `POST /leave-requests` yuborishi kerakmi yoki `POST /parent/child/{id}/leave-request` orqali ota-ona yuboradimi?
- Ikkalasi ham stub holatida — mantiqiy qarama-qarshilik.

**Tavsiya:** 
- Student o'zi yuborishi kerak: `POST /leave-requests`
- Ota-ona farzand nomidan: `POST /parent/child/{id}/leave-request`
- Ikkala yo'l ham ishlashi kerak

---

### ARCH-04: Grades - base list endpoint strategiyasi noaniq

`GET /grades` yo'q. Har xil rollar uchun:
- Admin → `/grades/class/{id}/report`
- Teacher → `/grades/class/{id}/gpa` 
- Student → `/grades/student/{id}`
- Parent → `/parent/child/{id}/grades`

Bu mantiqan to'g'ri (role-scoped), lekin frontend bu qoidani bilmasa 404 xato qiladi.

---

### ARCH-05: Super Admin schoolId yo'q, server crash qiladi

`super_admin` tokenda `schoolId: null`. Har qanday `schoolId` filtrlaydigan endpoint super admin uchun server error beradi. Global middleware da super admin uchun alohida handling kerak.

---

## 8. Yaxshilash Rejasi (Approve uchun)

### Sprint 1 — Kritik buglar (1 hafta) 🔴

> Approve kerak bo'lsa, shu blok bajariladi

**S1-T1: Role Bypass Buglarini to'g'rilash (2 soat)**

Fayllar: `homework.controller.ts`, `exams.controller.ts`, `subjects.controller.ts`, `clubs.controller.ts`, `transport.controller.ts`

```
Vazifa: @Roles dan PARENT ni o'chirish (subjects, homework, exams, clubs)
Vazifa: Transport GET /routes dan TEACHER va PARENT ni o'chirish
```

---

**S1-T2: Leave Requests — Student va Parent qo'shish (1 soat)**

Fayllar: `leave-requests.controller.ts`, `leave-requests.service.ts`

```
Vazifa: POST va GET @Roles ga STUDENT qo'shish
Vazifa: GET @Roles ga PARENT qo'shish  
Vazifa: Service: student faqat o'zinikini, parent farzandinikinini ko'radi
Vazifa: CreateLeaveRequestDto ga "type" field qo'shish
```

---

**S1-T3: Teacher role fixes (1 soat)**

Fayllar: `classes.controller.ts`, `attendance.controller.ts`

```
Vazifa: /classes/my-class — TEACHER ham kirishi uchun role qo'shish
Vazifa: /attendance/report — TEACHER role qo'shish
```

---

**S1-T4: Parent Portal ID bug (2 soat)**

Fayl: `parent.service.ts`

```
Vazifa: getChildren response da student.id ni to'g'ridan qaytarish
Ya'ni: items[0].id = student.id, emas ParentStudent.id
```

---

**S1-T5: Admin notifications access (30 daqiqa)**

Fayl: `notifications.controller.ts`

```
Vazifa: queue-stats va send ga SCHOOL_ADMIN qo'shish
```

---

**S1-T6: Super Admin 500 crash fix (1 soat)**

Fayllar: Barcha schoolId ishlatadigan servicelar

```
Vazifa: super_admin uchun schoolId null check qo'shish
Vazifa: Yoki global guard super_admin ni school-specific endpointlardan to'sish
```

---

### Sprint 2 — Muhim to'ldirish (3-5 kun) 🟠

**S2-T1: Attendance mark DTO — field nomi birlashtirish**

`records` → `entries` yoki aksincha, lekin izchil bo'lishi kerak. Swagger ham yangilansin.

**S2-T2: Grades base endpoint**

`GET /grades` qo'shish — rolga qarab filtr:
- admin/vice → barcha
- teacher → o'z sinflarining
- student → o'zining
- parent → 403 (parent portal orqali)

**S2-T3: Duplicate ClassStudent yozuvlarini tozalash**

Seed da upsert qo'shish ClassStudent uchun ham.

**S2-T4: Leave Request DTO `type` field**

```typescript
export enum LeaveType { SICK = 'sick', PERSONAL = 'personal', VACATION = 'vacation' }
@IsEnum(LeaveType) type: LeaveType;
```

**S2-T5: Canteen base endpoint**

`GET /canteen` → admin uchun barcha yozuvlar ro'yxati (CRUD sahifasi uchun)

**S2-T6: Token refresh interceptor (Frontend)**

Frontend da axios/fetch interceptor: 401 kelsa refresh token bilan yangilash.

---

### Sprint 3 — UX va Sifat (1-2 hafta) 🟡

**S3-T1: Empty state komponentlari**

Barcha list sahifalarda `EmptyState` komponenti:
- Tasvirli (ikonka)
- "Ma'lumot yo'q" matni
- Tegishli joyda "Qo'shish" tugmasi

**S3-T2: Role-based sidebar filtrlash**

Frontend da har bir menyu elementi qaysi rollar uchun ko'rinishini `config/navigation.ts` da aniq belgilash.

**S3-T3: Error handling yaxshilash**

- 403 → "Ruxsat yo'q" toast (hozir blank screen)
- 404 → "Topilmadi" sahifasi
- 500 → "Server xatosi, qayta urinib ko'ring" toast

**S3-T4: Swagger docs — API kontrakt audit**

Barcha endpointlar DTO da ko'rsatilgan fieldlar Swagger da to'g'ri ko'rsatilsin. Ayniqsa `attendance/mark` va `leave-requests`.

**S3-T5: Parent portal to'liq test**

BUG-FUNC-05 to'g'rilanganidan keyin barcha parent portal yo'llarini end-to-end test.

---

## Xulosa — Bug Prioritet Jadvali

| # | Bug ID | Tavsif | Jiddiylik | Sprint |
|---|--------|--------|-----------|--------|
| 1 | BUG-FUNC-05 | Parent portal ID mismatch — portal ishlamaydi | 🔴 Kritik | S1-T4 |
| 2 | BUG-FUNC-03 | Student leave-request yubora olmaydi | 🔴 Kritik | S1-T2 |
| 3 | BUG-SEC-01 | Parent barcha homework/exam ko'radi | 🔴 Security | S1-T1 |
| 4 | BUG-SEC-02 | Teacher transport marshrutlarini ko'radi | 🔴 Security | S1-T1 |
| 5 | BUG-SEC-03 | Super admin /classes → 500 crash | 🔴 Kritik | S1-T6 |
| 6 | BUG-FUNC-01 | Teacher o'z sinfini ko'ra olmaydi | 🟠 Muhim | S1-T3 |
| 7 | BUG-FUNC-02 | Teacher davomat hisobotini ko'ra olmaydi | 🟠 Muhim | S1-T3 |
| 8 | BUG-FUNC-04 | Admin notification queue ko'ra olmaydi | 🟠 Muhim | S1-T5 |
| 9 | BUG-CONTRACT-01 | Attendance mark field nomi noto'g'ri | 🟠 Muhim | S2-T1 |
| 10 | BUG-CONTRACT-02 | Leave DTO `type` field yo'q | 🟠 Muhim | S2-T4 |
| 11 | BUG-DATA-01 | Student ikki sinf bilan bog'liq | 🟡 O'rta | S2-T3 |
| 12 | ARCH-01 | teacher vs class_teacher chalkashligi | 🟡 O'rta | S2 |
| 13 | UX-09 | Empty state komponentlari yo'q | 🟡 UX | S3-T1 |
| 14 | UX-10 | Token 15 daqiqada tugaydi, auto-refresh yo'q | 🟡 UX | S3-T6 |

---

> **Test muhiti:** localhost, seed ma'lumotlari bilan  
> **Jami testlar:** 163 (8 rol, 60+ endpoint)  
> **Natija:** 83% muvaffaqiyat (136✅ 14❌ 13⚠️)
