# Production Deployment Checklist

## Pre-deployment

- [ ] `NODE_ENV=production` `.env` faylida sozlangan
- [ ] `ALLOWED_ORIGINS` frontend URL bilan to'ldirilgan (masalan: `https://app.eduplatform.uz`)
- [ ] `JWT_SECRET` va `JWT_REFRESH_SECRET` kuchli random stringlar (kamida 32 ta belgi)
- [ ] PostgreSQL connection string to'g'ri
- [ ] Redis connection string to'g'ri (ixtiyoriy, lekin tavsiya etiladi)

## Database Migration

```bash
cd apps/backend
npx prisma migrate deploy
```

- [ ] Migration `20260429120000_add_branch_id_to_models` muvaffaqiyatli bajarildi
- [ ] Barcha jadvallar `branchId` ustuniga ega (exam, homework, subject, discipline_incident, fee_structure, notification)
- [ ] Barcha yangi indexlar yaratildi (`users_schoolId_role_isActive_idx`, `grades_classId_date_idx`, etc.)

## Cookie Security Verification

- [ ] Backend `auth.controller.ts` da `secure: true` (production'da)
- [ ] `sameSite: 'none'` production'da (cross-origin cookie uchun)
- [ ] `sameSite: 'lax'` development'da
- [ ] Frontend `apiClient.ts` da `withCredentials: true`

## CORS Verification

- [ ] Backend `main.ts` da `credentials: true`
- [ ] `ALLOWED_ORIGINS` frontend domenini o'z ichiga oladi
- [ ] Preflight requests (`OPTIONS`) to'g'ri javob qaytaradi

## Health Checks

```bash
curl https://api.eduplatform.uz/api/health
curl https://api.eduplatform.uz/api/health/ready
```

- [ ] `liveness` — database, memory, redis tekshiruvlari o'tdi
- [ ] `readiness` — `status: ok` qaytaradi

## Post-deployment Smoke Tests

- [ ] Login → cookie `access_token` va `refresh_token` set bo'ladi (httpOnly)
- [ ] Dashboard → `x-branch-id` header to'g'ri yuboriladi
- [ ] Branch switch → yangi tokenlar cookie'da yangilanadi
- [ ] Logout → cookie'lar tozalanadi
- [ ] CSV import → `branchId` param frontend'dan backend'ga yetib boradi
- [ ] PDF yuklash → `branchCtx` filter ishlaydi

## Rollback Plan

1. Avvalgi Docker image'ga revert qilish
2. Prisma migration rollback (agar kerak bo'lsa): `npx prisma migrate resolve --rolled-back 20260429120000_add_branch_id_to_models`
3. Redis cache tozalash: `redis-cli FLUSHDB`

## Monitoring

- [ ] `login_attempts:*` keylari orqali brute-force hujumlarni kuzatish
- [ ] Health check endpointlari monitoringga ulangan (UptimeRobot, Pingdom)
- [ ] Error tracking (Sentry/LogRocket) sozlangan
