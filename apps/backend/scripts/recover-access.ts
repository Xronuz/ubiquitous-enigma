/**
 * Recovery skripti — qulflanib qolgan tizimni tiklash uchun.
 *
 * Bajarilishi:
 *   pnpm --filter @eduplatform/backend exec ts-node scripts/recover-access.ts
 *
 * Yoki:
 *   cd apps/backend && pnpm ts-node scripts/recover-access.ts
 *
 * Nima qiladi:
 *  1. Barcha DIRECTOR foydalanuvchilarini isActive=true ga keltiradi
 *  2. Agar SUPER_ADMIN umuman yo'q bo'lsa — yangidan yaratadi
 *  3. Mavjud SUPER_ADMINni isActive=true ga keltiradi va schoolId/branchId=null
 *  4. Agar `--reset-passwords` flagi berilsa, super va director parollarini default'ga qaytaradi
 *
 * Default parollar (faqat --reset-passwords bilan):
 *   super@eduplatform.uz   → SuperAdmin123!
 *   director@*             → Director123!
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const RESET = process.argv.includes('--reset-passwords');
const SALT_ROUNDS = 12;

async function hash(p: string) {
  return bcrypt.hash(p, SALT_ROUNDS);
}

async function main() {
  console.log('🔧 Tizim tiklanmoqda...');
  console.log(RESET ? '   (parollar default qiymatga qaytariladi)' : '   (parollar saqlanadi — agar tiklamoqchi bo\'lsangiz --reset-passwords bilan ishga tushiring)');
  console.log('');

  // 1. Direktorlarni faollashtirish
  const directors = await prisma.user.findMany({
    where: { role: 'director' as UserRole },
    select: { id: true, email: true, isActive: true },
  });
  for (const d of directors) {
    const updateData: any = { isActive: true };
    if (RESET) updateData.passwordHash = await hash('Director123!');
    await prisma.user.update({ where: { id: d.id }, data: updateData });
    console.log(`  ✓ Director faollashtirildi: ${d.email}${d.isActive ? '' : ' (oldin bloklangan)'}`);
  }
  if (directors.length === 0) {
    console.log('  ⚠️  Direktor topilmadi — qo\'lda yaratish kerak');
  }

  // 2. Super adminni tekshirish/yaratish/tuzatish
  const supers = await prisma.user.findMany({
    where: { role: 'super_admin' as UserRole },
  });

  if (supers.length === 0) {
    const passwordHash = await hash('SuperAdmin123!');
    const created = await prisma.user.create({
      data: {
        email: 'super@eduplatform.uz',
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin' as UserRole,
        schoolId: null,
        branchId: null,
        isActive: true,
      },
    });
    console.log(`  ✓ Super admin yaratildi: ${created.email} / SuperAdmin123!`);
  } else {
    for (const s of supers) {
      const updateData: any = {
        isActive: true,
        schoolId: null, // platforma darajasida bo'lishi kerak
        branchId: null,
      };
      if (RESET) updateData.passwordHash = await hash('SuperAdmin123!');
      await prisma.user.update({ where: { id: s.id }, data: updateData });
      console.log(`  ✓ Super admin tuzatildi: ${s.email} (schoolId=null, isActive=true)`);
    }
  }

  console.log('');
  console.log('✅ Tiklash yakunlandi.');
  if (RESET) {
    console.log('');
    console.log('Default parollar:');
    console.log('  super@eduplatform.uz / SuperAdmin123!');
    console.log('  director@*           / Director123!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Xato:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
