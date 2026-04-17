# EduPlatform — Maktab Boshqaruv Tizimi

NestJS (backend) + Next.js (frontend) asosidagi fullstack monorepo. PostgreSQL, Redis, MinIO, WebSocket, BullMQ.

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

# 3. Docker + migrate + seed (bir marta)
pnpm dev:setup

# 4. Ishga tushirish
pnpm dev
```

### Ikkinchi va keyingi marta

```bash
pnpm dev:light
```

Bu bitta buyruq Docker ni (faqat Postgres + Redis) ishga tushiradi va barcha dev serverlarni yoqadi.

---

## Mavjud buyruqlar

```bash
# Dev
pnpm dev              # Turbo orqali barcha paketlar (docker alohida ishga tushirilishi kerak)
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

# Build
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
| pgAdmin | http://localhost:5050 (to'liq docker bilan) |
| MinIO Console | http://localhost:9001 (to'liq docker bilan) |

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
```

### `apps/frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

> **Eslatma:** Email (SMTP) va SMS (Infobip) sozlamalari bo'sh qoldirilsa — stub rejimda ishlaydi (logga yozadi).

---

## Arxitektura

```
apps/
├── backend/      → NestJS API (port 3001)
├── frontend/     → Next.js (port 3000)
packages/
└── types/        → Umumiy TypeScript tipler
```

**Backend modullari:** auth, users, classes, subjects, schedule, attendance, grades, payments, notifications, messaging, exams, homework, library, payroll, finance, reports, online-exam, clubs va boshqalar (jami 34 ta).

**Real-time:** Socket.io (school + user room izolyatsiyasi)

**Async:** BullMQ (email/SMS queue, concurrency: 5)

**Cron:** 8 ta avtomatik vazifa (davomat eslatma, to'lov reminder, haftalik xulosa, ...)

---

## Server deploy uchun

`docs/DEPLOYMENT_GUIDE.md` faylini ko'ring.

---

## Node.js v24 haqida

Loyiha Node.js v24 da to'g'ri ishlaydi. `pnpm install` avtomatik ravishda `packageExtensions` orqali eski paketlarni (`lazystream`, `send`, `path-scurry`) to'g'ri versiyalarga yo'naltiradi — qo'shimcha hech narsa kerak emas.
