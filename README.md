# EduPlatform — Maktab Boshqaruv Tizimi

NestJS + Next.js asosidagi fullstack monorepo. Har bir maktab o'z izolyatsiyalangan muhitida ishlaydi (multi-tenant). Real-time WebSocket, asinxron BullMQ queue, PostgreSQL, Redis, MinIO.

---

## Tez ishga tushirish (Local)

### Talablar

| Dastur | Versiya | Tekshirish |
|--------|---------|------------|
| Node.js | ≥ 20 (v24 qo'llab-quvvatlanadi) | `node -v` |
| pnpm | ≥ 9 | `pnpm -v` |
| Docker | ≥ 24 | `docker -v` |

### Birinchi marta

```bash
# 1. Klonlash
git clone https://github.com/Xronuz/ubiquitous-enigma.git
cd ubiquitous-enigma

# 2. Paketlarni o'rnatish
pnpm install

# 3. Environment fayllarini yaratish (quyidagi bo'limga qarang)
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

# 4. Docker + migrate + seed (bir marta)
pnpm dev:setup

# 5. Ishga tushirish
pnpm dev
```

### Ikkinchi va keyingi marta

```bash
pnpm dev:light
```

Bu bitta buyruq Docker ni (Postgres + Redis) ishga tushiradi va barcha dev serverlarni yoqadi.

> **Eslatma:** `dev:setup` va `dev:light` `--wait` flagi bilan ishlaydi — PostgreSQL to'liq tayyor bo'lguncha kutadi, keyin migrate/seed yuguradi. Race condition bo'lmaydi.

---

## Mavjud buyruqlar

```bash
# Dev
pnpm dev              # Turbo orqali barcha paketlar (docker alohida kerak)
pnpm dev:light        # Docker (dev) + barcha dev serverlar — bitta buyruq
pnpm dev:setup        # Birinchi marta: docker + migrate + seed

# Docker
pnpm docker:dev       # Faqat Postgres + Redis (yengil)
pnpm docker:dev:down  # Yengil konteynerni to'xtatish
pnpm docker:up        # To'liq stack (Postgres + Redis + MinIO + pgAdmin)
pnpm docker:down      # To'liq stackni to'xtatish

# Database
pnpm db:migrate       # Prisma migratsiyalarini bajarish
pnpm db:seed          # Test ma'lumotlarini yuklash
pnpm db:studio        # Prisma Studio (http://localhost:5555)

# Build & linting
pnpm build            # Barcha paketlar build
pnpm lint             # Lint tekshiruvi
pnpm format           # Kod formatlash
```

---

## URL manzillar (local)

| Xizmat | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api/v1 |
| Swagger Docs | http://localhost:3001/api/docs |
| Health check | http://localhost:3001/api/v1/health |
| pgAdmin | http://localhost:5050 (to'liq docker bilan) |
| MinIO Console | http://localhost:9001 (to'liq docker bilan) |

---

## Test akkauntlari (seed dan keyin)

`pnpm dev:setup` yoki `pnpm db:seed` dan keyin quyidagi akkauntlar tayyor bo'ladi:

| Rol | Email | Parol | Imkoniyatlar |
|-----|-------|-------|--------------|
| **Super Admin** | `super@eduplatform.uz` | `SuperAdmin123!` | Barcha maktablar, global sozlamalar |
| **Director** | `director@demo-school.uz` | `Director123!` | Maktab boshqaruvi, statistika, e'lonlar |
| **School Admin** | `admin@demo-school.uz` | `SchoolAdmin123!` | Foydalanuvchilar, dars jadvali, sozlamalar |
| **Vice Principal** | `vice@demo-school.uz` | `Vice123!` | Ta'til so'rovlarini tasdiqlash, intizom |
| **Teacher** | `teacher@demo-school.uz` | `Teacher123!` | Baholar, davomat, uy vazifasi |
| **Class Teacher** | `classteacher@demo-school.uz` | `ClassTeacher123!` | Sinf boshqaruvi + o'qituvchi funksiyalari |
| **Accountant** | `accountant@demo-school.uz` | `Accountant123!` | To'lovlar, moliya hisobotlari |
| **Parent** | `parent@demo-school.uz` | `Parent123!` | Bola baholari, davomat, to'lovlar |
| **Student** | `student@demo-school.uz` | `Student123!` | Baholar, jadval, uy vazifalari |

---

## Environment fayllar

### `apps/backend/.env`

```env
DATABASE_URL="postgresql://eduplatform:eduplatform_password@localhost:5432/eduplatform_db"

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-token-secret-change-in-production

PORT=3001
NODE_ENV=development
LOG_LEVEL=debug

ALLOWED_ORIGINS=http://localhost:3000
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=eduplatform
MINIO_USE_SSL=false

APP_URL=http://localhost:3001

# Ixtiyoriy — bo'sh qoldirilsa stub rejim (logga yozadi)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@gmail.com
# SMTP_PASS=app-password
# SMTP_FROM=EduPlatform <noreply@your-domain.com>

# INFOBIP_API_KEY=
# INFOBIP_BASE_URL=
# SMS_FROM=EduPlatform
```

### `apps/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

> **Redis yo'q bo'lsa:** Ilova to'liq ishlashda davom etadi. Login, token refresh, va bildirishnoma queue Redis mavjud bo'lmaganda graceful fallback bilan ishlaydi.

> **Email/SMS yo'q bo'lsa:** `SMTP_HOST` va `INFOBIP_API_KEY` bo'sh qoldirilsa stub rejimda ishlaydi — hech narsa yuborilmaydi, ammo logga yoziladi.

---

## Arxitektura

```
apps/
├── backend/      → NestJS API (port 3001)
└── frontend/     → Next.js 14 (port 3000)
packages/
└── types/        → Umumiy TypeScript tipler (shared)
```

### Backend modullari (35 ta)

| Guruh | Modulllar |
|-------|-----------|
| **Auth** | auth, users |
| **O'quv jarayoni** | classes, subjects, schedule, grades, homework, exams, online-exam, academic-calendar |
| **Boshqaruv** | attendance, discipline, leave-requests, clubs, transport, learning-center |
| **Moliya** | payments, fee-structures, finance, payroll |
| **Kommunikatsiya** | messaging (shaxsiy + guruh chat), notifications, meetings |
| **Fayl & Ma'lumot** | upload, import, library, reports |
| **Infratuzilma** | health, gateway (WebSocket), system-config, super-admin |
| **Qo'shimcha** | canteen, display, parent |

### Texnologiyalar

| Texnologiya | Ishlatilishi |
|-------------|-------------|
| **NestJS** | REST API, modular arxitektura |
| **Next.js 14** | App Router, server/client komponentlar |
| **PostgreSQL** | Asosiy ma'lumotlar bazasi |
| **Prisma** | ORM + migratsiyalar |
| **Redis** | Rate limiting, token cache, BullMQ transport |
| **Socket.io** | Real-time bildirishnomalar, chat (school + user room izolyatsiyasi) |
| **BullMQ** | Email/SMS asinxron queue (concurrency: 5) |
| **MinIO** | Fayl saqlash (S3-compatible) |
| **JWT** | Access token (15 min) + Refresh token (7 kun, rotation) |
| **Swagger** | API dokumentatsiyasi |

---

## Funksionallik

### Rollar va dashboardlar

- **Super Admin** — barcha maktablar, global statistika, tarif boshqaruvi
- **Director** — maktab statistikasi, e'lonlar (toplu xabar yuborish), xodimlar ro'yxati
- **School Admin** — foydalanuvchi yaratish, dars jadvali, tizim sozlamalari
- **Vice Principal** — ta'til so'rovlarini bir tugma bilan tasdiqlash/rad etish, intizom
- **Teacher / Class Teacher** — baholar kiritish, davomat belgilash, uy vazifalari
- **Accountant** — to'lovlar, fee struktura, oylik hisobotlar
- **Parent** — bola baholari (fanga ko'ra filtr), davomat, to'lov holati
- **Student** — jadval, baholar, 6 oylik davomat grafigi (BarChart)

### Messaging

- Shaxsiy (1-to-1) chat — o'qituvchi ↔ ota-ona, xodimlar orasida
- Guruh chat — yaratish, a'zo qo'shish, guruhdan chiqish, admin badge
- Real-time WebSocket orqali (yangi xabar darhol ko'rinadi)

### Bildirishnomalar

- In-app real-time (WebSocket push)
- Toplu e'lon (director → barcha xodimlar / o'qituvchilar / ota-onalar)
- Davomat xabarnomasi (SMS + Email, ota-onaga)
- To'lov eslatmasi (SMS + Email)
- Baho bildirishnomasi (SMS + Email)

### Boshqa xususiyatlar

- **Online imtihon** platformasi (vaqt limiti, avtomatik baholash)
- **Kutubxona** — kitob inventari, abonement
- **Transport** yo'nalishlari
- **CSV import** — o'quvchilar, baholar
- **PDF/Excel hisobotlar**
- **To'liq migratsiya tarixi** (12 ta versiyalangan migration)

---

## Resilience (Ishonchlilik)

Ilova quyidagi holatlarda ham ishlashda davom etadi:

| Muammo | Xatti-harakat |
|--------|---------------|
| Redis ishlamayapti | Login/refresh JWT fallback orqali ishlaydi; queue va rate-limit skip qilinadi |
| BullMQ Worker ulanmayapti | Worker `null` qilinadi, app crash qilmaydi; SMS/email yo'q bo'ladi |
| MinIO ulanmayapti | Fayl yuklash xato qaytaradi, qolgan funksiyalar ishlaydi |
| Email/SMS sozlanmagan | Stub rejim — logga yozadi, xato bermaydi |

---

## Server deploy uchun

`docs/DEPLOYMENT_GUIDE.md` faylini ko'ring — server talablari, SSL, Nginx, backup, monitoring va xavfsizlik chek-listi.

---

## Node.js v24 haqida

Loyiha Node.js v24 da to'g'ri ishlaydi. `pnpm install` avtomatik `packageExtensions` orqali eski paketlarni (`lazystream`, `send`, `path-scurry`) to'g'ri versiyalarga yo'naltiradi — qo'shimcha hech narsa kerak emas.
