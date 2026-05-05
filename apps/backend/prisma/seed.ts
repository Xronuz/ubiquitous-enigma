import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function hash(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Seeding demo data...');

  // ─── 1. Demo School ────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { slug: 'demo-school' },
    update: {},
    create: {
      name: 'Demo Maktab',
      slug: 'demo-school',
      address: "Toshkent sh., Chilonzor tumani",
      phone: '+998901234567',
      email: 'info@demo-school.uz',
      isActive: true,
      subscriptionTier: 'premium',
    },
  });
  console.log(`  ✓ School: ${school.name} (${school.id})`);

  // ─── 2. Subscription ───────────────────────────────────────────────────────
  await prisma.subscription.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      plan: 'premium',
      billingCycle: 'yearly',
      status: 'active',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      nextBilling: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('  ✓ Subscription: premium/active');

  // ─── 3. Demo Branch ────────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where: { schoolId_name: { schoolId: school.id, name: 'Asosiy filial' } },
    update: {},
    create: {
      schoolId: school.id,
      name: 'Asosiy filial',
      code: 'MAIN',
      address: "Toshkent sh., Chilonzor tumani",
      phone: '+998901234568',
      email: 'main@demo-school.uz',
      isActive: true,
    },
  });
  console.log(`  ✓ Branch: ${branch.name} (${branch.id})`);

  // ─── 4. Users ──────────────────────────────────────────────────────────────
  const users: Array<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    schoolId: string;
    branchId: string;
  }> = [
    {
      email: 'super@eduplatform.uz',
      password: 'SuperAdmin123!',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'director@demo-school.uz',
      password: 'Director123!',
      firstName: 'Dilnoza',
      lastName: 'Yusupova',
      role: 'director' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'vice@demo-school.uz',
      password: 'Vice123!',
      firstName: 'Sardor',
      lastName: 'Rahimov',
      role: 'vice_principal' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'teacher@demo-school.uz',
      password: 'Teacher123!',
      firstName: 'Malika',
      lastName: 'Toshmatova',
      role: 'teacher' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'classteacher@demo-school.uz',
      password: 'ClassTeacher123!',
      firstName: 'Aziz',
      lastName: 'Karimov',
      role: 'class_teacher' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'accountant@demo-school.uz',
      password: 'Accountant123!',
      firstName: 'Nodira',
      lastName: 'Hasanova',
      role: 'accountant' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'librarian@demo-school.uz',
      password: 'Librarian123!',
      firstName: 'Zulfiya',
      lastName: 'Mirzayeva',
      role: 'librarian' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'student@demo-school.uz',
      password: 'Student123!',
      firstName: 'Jasur',
      lastName: 'Normatov',
      role: 'student' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
    {
      email: 'parent@demo-school.uz',
      password: 'Parent123!',
      firstName: 'Hamida',
      lastName: 'Normatova',
      role: 'parent' as UserRole,
      schoolId: school.id,
      branchId: branch.id,
    },
  ];

  for (const u of users) {
    const passwordHash = await hash(u.password);
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        schoolId: u.schoolId,
        branchId: u.branchId,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        schoolId: u.schoolId,
        branchId: u.branchId,
        isActive: true,
      },
    });
    console.log(`  ✓ User [${created.role}]: ${created.email}`);
  }

  console.log('');
  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo credentials:');
  console.log('  Super Admin  : super@eduplatform.uz    / SuperAdmin123!');
  console.log('  Director     : director@demo-school.uz / Director123!');
  console.log('  Vice Principal: vice@demo-school.uz   / Vice123!');
  console.log('  Teacher      : teacher@demo-school.uz  / Teacher123!');
  console.log('  Class Teacher: classteacher@demo-school.uz / ClassTeacher123!');
  console.log('  Accountant   : accountant@demo-school.uz / Accountant123!');
  console.log('  Librarian    : librarian@demo-school.uz / Librarian123!');
  console.log('  Student      : student@demo-school.uz  / Student123!');
  console.log('  Parent       : parent@demo-school.uz   / Parent123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
