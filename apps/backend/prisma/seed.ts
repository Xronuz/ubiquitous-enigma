import { PrismaClient, ClubCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Helper ───────────────────────────────────────────────────────────────
function date(offset: number): Date {
  const d = new Date('2026-03-30');
  d.setDate(d.getDate() + offset);
  return d;
}

function dateOnly(offset: number): Date {
  const d = date(offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── 0. Cleanup: remove duplicate ClassStudent rows ─────────────────────
  // If a student somehow got enrolled in the same class twice (e.g. seed ran
  // without the upsert guard), deduplicate by keeping only the latest row.
  const allEnrollments = await prisma.classStudent.findMany({
    select: { id: true, classId: true, studentId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const seen = new Map<string, string>(); // key → keep id
  const toDelete: string[] = [];
  for (const e of allEnrollments) {
    const key = `${e.classId}:${e.studentId}`;
    if (seen.has(key)) {
      toDelete.push(e.id); // older duplicate → delete
    } else {
      seen.set(key, e.id);
    }
  }
  if (toDelete.length > 0) {
    await prisma.classStudent.deleteMany({ where: { id: { in: toDelete } } });
    console.log(`🧹 ${toDelete.length} ta takroriy ClassStudent yozuv o'chirildi`);
  }

  // ─── 1. Super Admin ─────────────────────────────────────────────────────
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@eduplatform.uz' },
    update: {},
    create: {
      email: 'super@eduplatform.uz',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: await bcrypt.hash('SuperAdmin123!', 12),
      role: 'super_admin',
      phone: '+998901234567',
    },
  });
  console.log(`✅ Super admin: ${superAdmin.email}`);

  // ─── 2. Demo School ──────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { slug: 'demo-school' },
    update: {},
    create: {
      name: 'Demo Maktab №1',
      slug: 'demo-school',
      address: "Toshkent sh., Yunusobod tumani, Amir Temur ko'chasi 15",
      phone: '+998712345678',
      email: 'info@demo-school.uz',
      subscriptionTier: 'standard',
      subscription: {
        create: {
          plan: 'standard',
          billingCycle: 'monthly',
          status: 'active',
          nextBilling: date(30),
          trialEndsAt: date(0),
        },
      },
      modules: {
        createMany: {
          data: [
            { moduleName: 'auth',             isEnabled: true },
            { moduleName: 'users',            isEnabled: true },
            { moduleName: 'classes',          isEnabled: true },
            { moduleName: 'schedule',         isEnabled: true },
            { moduleName: 'notifications',    isEnabled: true },
            { moduleName: 'messaging',        isEnabled: true },
            { moduleName: 'reports',          isEnabled: true },
            { moduleName: 'attendance',       isEnabled: true },
            { moduleName: 'grades',           isEnabled: true },
            { moduleName: 'payments',         isEnabled: true },
            { moduleName: 'exams',            isEnabled: true },
            { moduleName: 'homework',         isEnabled: true },
            { moduleName: 'display',          isEnabled: true },
            { moduleName: 'finance_dashboard',isEnabled: true },
            { moduleName: 'canteen',          isEnabled: true },
            { moduleName: 'library',          isEnabled: true },
            { moduleName: 'transport',        isEnabled: false },
            { moduleName: 'inventory',        isEnabled: false },
            { moduleName: 'clubs',            isEnabled: true  },
          ],
        },
      },
    },
  });
  console.log(`✅ Demo maktab: ${school.name}`);

  // ─── 3. Staff Users ──────────────────────────────────────────────────────
  const pw = (plain: string) => bcrypt.hash(plain, 12);

  const schoolAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo-school.uz' },
    update: {},
    create: {
      email: 'admin@demo-school.uz',
      firstName: 'Aziz',
      lastName: 'Karimov',
      passwordHash: await pw('SchoolAdmin123!'),
      role: 'school_admin',
      schoolId: school.id,
      phone: '+998901111111',
    },
  });

  const vicePrincipal = await prisma.user.upsert({
    where: { email: 'vice@demo-school.uz' },
    update: {},
    create: {
      email: 'vice@demo-school.uz',
      firstName: 'Nodira',
      lastName: 'Toshmatova',
      passwordHash: await pw('Vice123!'),
      role: 'vice_principal',
      schoolId: school.id,
      phone: '+998902222222',
    },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@demo-school.uz' },
    update: {},
    create: {
      email: 'accountant@demo-school.uz',
      firstName: 'Sarvar',
      lastName: 'Ergashev',
      passwordHash: await pw('Accountant123!'),
      role: 'accountant',
      schoolId: school.id,
      phone: '+998903333333',
    },
  });

  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@demo-school.uz' },
    update: {},
    create: {
      email: 'librarian@demo-school.uz',
      firstName: 'Maftuna',
      lastName: 'Xoliqova',
      passwordHash: await pw('Librarian123!'),
      role: 'librarian',
      schoolId: school.id,
      phone: '+998904444444',
    },
  });

  // Teachers
  const teacher1 = await prisma.user.upsert({
    where: { email: 'teacher@demo-school.uz' },
    update: {},
    create: {
      email: 'teacher@demo-school.uz',
      firstName: 'Malika',
      lastName: 'Yusupova',
      passwordHash: await pw('Teacher123!'),
      role: 'teacher',
      schoolId: school.id,
      phone: '+998905555555',
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: 'teacher2@demo-school.uz' },
    update: {},
    create: {
      email: 'teacher2@demo-school.uz',
      firstName: 'Jasur',
      lastName: 'Raximov',
      passwordHash: await pw('Teacher123!'),
      role: 'teacher',
      schoolId: school.id,
      phone: '+998906666666',
    },
  });

  const teacher3 = await prisma.user.upsert({
    where: { email: 'teacher3@demo-school.uz' },
    update: {},
    create: {
      email: 'teacher3@demo-school.uz',
      firstName: 'Zulfiya',
      lastName: 'Nazarova',
      passwordHash: await pw('Teacher123!'),
      role: 'teacher',
      schoolId: school.id,
      phone: '+998907777777',
    },
  });

  console.log('✅ Xodimlar yaratildi');

  // ─── 4. Classes ──────────────────────────────────────────────────────────
  const class5A = await prisma.class.upsert({
    where: { id: 'demo-class-5a' },
    update: {},
    create: {
      id: 'demo-class-5a',
      name: '5-A',
      gradeLevel: 5,
      academicYear: '2025-2026',
      schoolId: school.id,
      classTeacherId: teacher1.id,
    },
  });

  const class5B = await prisma.class.upsert({
    where: { id: 'demo-class-5b' },
    update: {},
    create: {
      id: 'demo-class-5b',
      name: '5-B',
      gradeLevel: 5,
      academicYear: '2025-2026',
      schoolId: school.id,
      classTeacherId: teacher2.id,
    },
  });

  const class6A = await prisma.class.upsert({
    where: { id: 'demo-class-6a' },
    update: {},
    create: {
      id: 'demo-class-6a',
      name: '6-A',
      gradeLevel: 6,
      academicYear: '2025-2026',
      schoolId: school.id,
      classTeacherId: teacher3.id,
    },
  });

  console.log('✅ Sinflar yaratildi: 5-A, 5-B, 6-A');

  // ─── 5. Subjects ─────────────────────────────────────────────────────────
  const getOrCreateSubject = async (name: string, classId: string, teacherId: string) => {
    const existing = await prisma.subject.findFirst({ where: { name, classId } });
    if (existing) return existing;
    return prisma.subject.create({ data: { name, classId, teacherId, schoolId: school.id } });
  };

  const math5A     = await getOrCreateSubject('Matematika', class5A.id, teacher1.id);
  const science5A  = await getOrCreateSubject("Tabiatshunoslik", class5A.id, teacher2.id);
  const uzbek5A    = await getOrCreateSubject("O'zbek tili", class5A.id, teacher3.id);
  const english5A  = await getOrCreateSubject("Ingliz tili", class5A.id, teacher2.id);
  const history5A  = await getOrCreateSubject("Tarix", class5A.id, teacher3.id);

  const math5B     = await getOrCreateSubject('Matematika', class5B.id, teacher1.id);
  const science5B  = await getOrCreateSubject("Tabiatshunoslik", class5B.id, teacher2.id);
  const uzbek5B    = await getOrCreateSubject("O'zbek tili", class5B.id, teacher3.id);

  const math6A     = await getOrCreateSubject('Matematika', class6A.id, teacher1.id);
  const physics6A  = await getOrCreateSubject('Fizika', class6A.id, teacher2.id);
  const chemistry6A = await getOrCreateSubject('Kimyo', class6A.id, teacher3.id);

  console.log('✅ Fanlar yaratildi');

  // ─── 6. Students ─────────────────────────────────────────────────────────
  const studentDefs = [
    { id: 'std-001', email: 'student@demo-school.uz',    firstName: 'Bobur',    lastName: 'Mirzayev',   classId: class5A.id, pass: 'Student123!' },
    { id: 'std-002', email: 'student2@demo-school.uz',   firstName: 'Dilnoza',  lastName: 'Karimova',   classId: class5A.id, pass: 'Student123!' },
    { id: 'std-003', email: 'student3@demo-school.uz',   firstName: 'Sardor',   lastName: 'Umarov',     classId: class5A.id, pass: 'Student123!' },
    { id: 'std-004', email: 'student4@demo-school.uz',   firstName: "Aziza",    lastName: "Toshpo'latova", classId: class5A.id, pass: 'Student123!' },
    { id: 'std-005', email: 'student5@demo-school.uz',   firstName: 'Kamol',    lastName: 'Xasanov',    classId: class5B.id, pass: 'Student123!' },
    { id: 'std-006', email: 'student6@demo-school.uz',   firstName: 'Shahlo',   lastName: 'Normatova',  classId: class5B.id, pass: 'Student123!' },
    { id: 'std-007', email: 'student7@demo-school.uz',   firstName: 'Murod',    lastName: "Qodirov",    classId: class6A.id, pass: 'Student123!' },
    { id: 'std-008', email: 'student8@demo-school.uz',   firstName: 'Nargiza',  lastName: 'Yuldasheva', classId: class6A.id, pass: 'Student123!' },
  ];

  const students: Record<string, Awaited<ReturnType<typeof prisma.user.upsert>>> = {};
  for (const s of studentDefs) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        id: s.id,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        passwordHash: await pw(s.pass),
        role: 'student',
        schoolId: school.id,
      },
    });
    await prisma.classStudent.upsert({
      where: { classId_studentId: { classId: s.classId, studentId: user.id } },
      update: {},
      create: { classId: s.classId, studentId: user.id },
    });
    students[s.id] = user;
  }
  console.log(`✅ ${studentDefs.length} ta o'quvchi yaratildi`);

  // ─── 7. Parents ──────────────────────────────────────────────────────────
  const parentDefs = [
    { email: 'parent@demo-school.uz',  firstName: 'Umid',    lastName: 'Mirzayev',  childId: 'std-001', pass: 'Parent123!' },
    { email: 'parent2@demo-school.uz', firstName: 'Gulnora', lastName: 'Karimova',  childId: 'std-002', pass: 'Parent123!' },
    { email: 'parent3@demo-school.uz', firstName: 'Bahodir', lastName: 'Umarov',    childId: 'std-003', pass: 'Parent123!' },
  ];
  for (const p of parentDefs) {
    const parent = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        firstName: p.firstName,
        lastName: p.lastName,
        passwordHash: await pw(p.pass),
        role: 'parent',
        schoolId: school.id,
      },
    });
    const child = students[p.childId];
    if (child) {
      await prisma.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: child.id } },
        update: {},
        create: { parentId: parent.id, studentId: child.id },
      });
    }
  }
  console.log('✅ Ota-onalar yaratildi');

  // ─── 8. Schedule ─────────────────────────────────────────────────────────
  // 5-A sinfi uchun haftalik jadval (dushanba - juma)
  const days: Array<'monday'|'tuesday'|'wednesday'|'thursday'|'friday'> = ['monday','tuesday','wednesday','thursday','friday'];
  const slots5A = [
    { subjectId: math5A.id,    startTime: '08:00', endTime: '08:45', room: '201' },
    { subjectId: science5A.id, startTime: '09:00', endTime: '09:45', room: '202' },
    { subjectId: uzbek5A.id,   startTime: '10:00', endTime: '10:45', room: '201' },
    { subjectId: english5A.id, startTime: '11:00', endTime: '11:45', room: '203' },
    { subjectId: history5A.id, startTime: '12:00', endTime: '12:45', room: '204' },
  ];
  const subjectTeacher: Record<string, string> = {
    [math5A.id]:    teacher1.id,
    [science5A.id]: teacher2.id,
    [uzbek5A.id]:   teacher3.id,
    [english5A.id]: teacher2.id,
    [history5A.id]: teacher3.id,
  };

  const scheduleIds: string[] = [];
  for (const day of days) {
    for (let i = 0; i < slots5A.length; i++) {
      const slot = slots5A[i];
      const existing = await prisma.schedule.findFirst({
        where: { classId: class5A.id, subjectId: slot.subjectId, dayOfWeek: day },
      });
      const sched = existing ?? await prisma.schedule.create({
        data: {
          schoolId:   school.id,
          classId:    class5A.id,
          subjectId:  slot.subjectId,
          teacherId:  subjectTeacher[slot.subjectId],
          roomNumber: slot.room,
          dayOfWeek:  day,
          timeSlot:   i + 1,
          startTime:  slot.startTime,
          endTime:    slot.endTime,
        },
      });
      scheduleIds.push(sched.id);
    }
  }
  console.log('✅ Dars jadvali yaratildi (5-A, dushanba-juma)');

  // ─── 9. Attendance (so'nggi 10 ish kuni) ────────────────────────────────
  // 2026-03-30 = dushanba. Oldingi 2 hafta: 16-27 mart
  const attendanceDays = [
    dateOnly(-14), dateOnly(-13), dateOnly(-12), dateOnly(-11), dateOnly(-10),
    dateOnly(-7),  dateOnly(-6),  dateOnly(-5),  dateOnly(-4),  dateOnly(-3),
  ];
  const std001 = students['std-001'];
  const std002 = students['std-002'];
  const std003 = students['std-003'];
  const std004 = students['std-004'];

  const attendanceStatuses: Array<'present'|'absent'|'late'|'excused'> = [
    'present','present','present','present','present',
    'present','late','present','present','absent',
  ];

  for (let di = 0; di < attendanceDays.length; di++) {
    const d = attendanceDays[di];
    for (const student of [std001, std002, std003, std004]) {
      let status: 'present'|'absent'|'late'|'excused' = 'present';
      if (student.id === std001.id) status = attendanceStatuses[di];
      else if (student.id === std003.id && di === 9) status = 'absent';
      else if (student.id === std002.id && di === 6) status = 'late';

      const existing = await prisma.attendance.findFirst({
        where: { studentId: student.id, classId: class5A.id, date: d },
      });
      if (!existing) {
        await prisma.attendance.create({
          data: {
            schoolId: school.id,
            classId:  class5A.id,
            studentId: student.id,
            date: d,
            status,
            note: status === 'excused' ? "Shifokor yorlig'i bilan" : undefined,
          },
        });
      }
    }
  }
  console.log('✅ Davomat tarixi yaratildi (so\'nggi 10 kun)');

  // ─── 10. Grades ──────────────────────────────────────────────────────────
  // har bir o'quvchi uchun 3 ta fan bo'yicha 4-5 ta baho
  const gradeData: Array<{
    studentId: string; subjectId: string; type: 'homework'|'classwork'|'test'|'exam'|'quarterly'|'final'; score: number; maxScore: number; dateOffset: number; comment?: string;
  }> = [
    // Bobur - Matematika
    { studentId: std001.id, subjectId: math5A.id,    type: 'homework',  score: 85,  maxScore: 100, dateOffset: -12 },
    { studentId: std001.id, subjectId: math5A.id,    type: 'test',      score: 78,  maxScore: 100, dateOffset: -8,  comment: "Algebraik ifodalar" },
    { studentId: std001.id, subjectId: math5A.id,    type: 'classwork', score: 90,  maxScore: 100, dateOffset: -4 },
    { studentId: std001.id, subjectId: math5A.id,    type: 'quarterly', score: 82,  maxScore: 100, dateOffset: -1,  comment: "3-chorak yakuniy" },
    // Bobur - O'zbek tili
    { studentId: std001.id, subjectId: uzbek5A.id,   type: 'homework',  score: 92,  maxScore: 100, dateOffset: -11 },
    { studentId: std001.id, subjectId: uzbek5A.id,   type: 'test',      score: 88,  maxScore: 100, dateOffset: -6 },
    { studentId: std001.id, subjectId: uzbek5A.id,   type: 'classwork', score: 95,  maxScore: 100, dateOffset: -3 },
    // Bobur - Ingliz tili
    { studentId: std001.id, subjectId: english5A.id, type: 'homework',  score: 72,  maxScore: 100, dateOffset: -10 },
    { studentId: std001.id, subjectId: english5A.id, type: 'test',      score: 68,  maxScore: 100, dateOffset: -5,  comment: "Grammar: Past tense" },

    // Dilnoza - Matematika
    { studentId: std002.id, subjectId: math5A.id,    type: 'homework',  score: 95,  maxScore: 100, dateOffset: -12 },
    { studentId: std002.id, subjectId: math5A.id,    type: 'test',      score: 93,  maxScore: 100, dateOffset: -8 },
    { studentId: std002.id, subjectId: math5A.id,    type: 'quarterly', score: 96,  maxScore: 100, dateOffset: -1 },
    // Dilnoza - O'zbek tili
    { studentId: std002.id, subjectId: uzbek5A.id,   type: 'homework',  score: 88,  maxScore: 100, dateOffset: -11 },
    { studentId: std002.id, subjectId: uzbek5A.id,   type: 'test',      score: 91,  maxScore: 100, dateOffset: -6 },
    // Dilnoza - Ingliz tili
    { studentId: std002.id, subjectId: english5A.id, type: 'test',      score: 87,  maxScore: 100, dateOffset: -5 },
    { studentId: std002.id, subjectId: english5A.id, type: 'homework',  score: 90,  maxScore: 100, dateOffset: -10 },

    // Sardor - Matematika
    { studentId: std003.id, subjectId: math5A.id,    type: 'homework',  score: 60,  maxScore: 100, dateOffset: -12 },
    { studentId: std003.id, subjectId: math5A.id,    type: 'test',      score: 55,  maxScore: 100, dateOffset: -8,  comment: "Qo'shimcha dars tavsiya etiladi" },
    { studentId: std003.id, subjectId: math5A.id,    type: 'classwork', score: 65,  maxScore: 100, dateOffset: -4 },
    // Sardor - Tabiatshunoslik
    { studentId: std003.id, subjectId: science5A.id, type: 'homework',  score: 75,  maxScore: 100, dateOffset: -9 },
    { studentId: std003.id, subjectId: science5A.id, type: 'test',      score: 70,  maxScore: 100, dateOffset: -5 },

    // Aziza - barcha fanlar
    { studentId: std004.id, subjectId: math5A.id,    type: 'homework',  score: 88,  maxScore: 100, dateOffset: -12 },
    { studentId: std004.id, subjectId: math5A.id,    type: 'test',      score: 84,  maxScore: 100, dateOffset: -8 },
    { studentId: std004.id, subjectId: uzbek5A.id,   type: 'homework',  score: 96,  maxScore: 100, dateOffset: -11 },
    { studentId: std004.id, subjectId: uzbek5A.id,   type: 'quarterly', score: 94,  maxScore: 100, dateOffset: -1 },
    { studentId: std004.id, subjectId: history5A.id, type: 'test',      score: 80,  maxScore: 100, dateOffset: -7 },
  ];

  for (const g of gradeData) {
    await prisma.grade.create({
      data: {
        schoolId:  school.id,
        classId:   class5A.id,
        studentId: g.studentId,
        subjectId: g.subjectId,
        type:      g.type,
        score:     g.score,
        maxScore:  g.maxScore,
        date:      dateOnly(g.dateOffset),
        comment:   g.comment,
      },
    });
  }
  console.log('✅ Baholar yaratildi');

  // ─── 11. Homeworks ───────────────────────────────────────────────────────
  const hw1 = await prisma.homework.create({
    data: {
      schoolId:    school.id,
      classId:     class5A.id,
      subjectId:   math5A.id,
      title:       'Kasrlar bo\'yicha masalalar',
      description: "Darslik 47-bet, 12-15-masalalar. Har bir masalani yechilishi bilan ko'rsating.",
      dueDate:     date(2),
    },
  }).catch(() => prisma.homework.findFirst({ where: { title: "Kasrlar bo'yicha masalalar", classId: class5A.id } }).then(r => r!));

  const hw2 = await prisma.homework.create({
    data: {
      schoolId:    school.id,
      classId:     class5A.id,
      subjectId:   uzbek5A.id,
      title:       'Insho: Bahor tabiatim',
      description: "Bahor mavzusida 150-200 so'zlik insho yozing.",
      dueDate:     date(3),
    },
  }).catch(() => prisma.homework.findFirst({ where: { title: 'Insho: Bahor tabiatim', classId: class5A.id } }).then(r => r!));

  const hw3 = await prisma.homework.create({
    data: {
      schoolId:    school.id,
      classId:     class5A.id,
      subjectId:   english5A.id,
      title:       'My Family - writing task',
      description: "Write about your family (100-150 words). Use Present Simple tense.",
      dueDate:     date(4),
    },
  }).catch(() => prisma.homework.findFirst({ where: { title: 'My Family - writing task', classId: class5A.id } }).then(r => r!));

  // Homework submissions
  if (hw1) {
    await prisma.homeworkSubmission.upsert({
      where: { homeworkId_studentId: { homeworkId: hw1.id, studentId: std001.id } },
      update: {},
      create: {
        homeworkId:  hw1.id,
        studentId:   std001.id,
        content:     "12-masala: 3/4 + 1/2 = 5/4. 13-masala: 2/3 × 6 = 4. 14-masala: ...",
        score:       90,
        submittedAt: date(-1),
      },
    });
    await prisma.homeworkSubmission.upsert({
      where: { homeworkId_studentId: { homeworkId: hw1.id, studentId: std002.id } },
      update: {},
      create: {
        homeworkId:  hw1.id,
        studentId:   std002.id,
        content:     "Barcha masalalar yechildi. Kasrlarni qo'shish, ayirish, ko'paytirish...",
        score:       95,
        submittedAt: date(-2),
      },
    });
  }
  console.log('✅ Uy vazifalari yaratildi');

  // ─── 12. Payments ────────────────────────────────────────────────────────
  const paymentData = [
    { studentId: std001.id, amount: 500000, status: 'paid',    provider: 'cash',  desc: "Mart 2026 — o'quv to'lovi",    paidAt: date(-5),  dueDate: date(-10) },
    { studentId: std001.id, amount: 500000, status: 'pending', provider: 'payme', desc: "Aprel 2026 — o'quv to'lovi",   paidAt: null,      dueDate: date(15)  },
    { studentId: std002.id, amount: 500000, status: 'paid',    provider: 'click', desc: "Mart 2026 — o'quv to'lovi",    paidAt: date(-8),  dueDate: date(-10) },
    { studentId: std002.id, amount: 500000, status: 'paid',    provider: 'click', desc: "Fevral 2026 — o'quv to'lovi",  paidAt: date(-35), dueDate: date(-40) },
    { studentId: std003.id, amount: 500000, status: 'overdue', provider: 'cash',  desc: "Mart 2026 — o'quv to'lovi",    paidAt: null,      dueDate: date(-5)  },
    { studentId: std003.id, amount: 500000, status: 'overdue', provider: 'cash',  desc: "Fevral 2026 — o'quv to'lovi",  paidAt: null,      dueDate: date(-35) },
    { studentId: std004.id, amount: 500000, status: 'paid',    provider: 'payme', desc: "Mart 2026 — o'quv to'lovi",    paidAt: date(-3),  dueDate: date(-10) },
    { studentId: std004.id, amount: 100000, status: 'paid',    provider: 'cash',  desc: "Sport to'garak to'lovi",         paidAt: date(-10), dueDate: date(-10) },
    { studentId: students['std-005'].id, amount: 500000, status: 'paid', provider: 'cash', desc: "Mart 2026", paidAt: date(-6), dueDate: date(-10) },
    { studentId: students['std-006'].id, amount: 500000, status: 'pending', provider: 'cash', desc: "Mart 2026", paidAt: null, dueDate: date(5) },
  ] as const;

  for (const p of paymentData) {
    await prisma.payment.create({
      data: {
        schoolId:    school.id,
        studentId:   p.studentId,
        amount:      p.amount,
        currency:    'UZS',
        status:      p.status as any,
        provider:    p.provider as any,
        description: p.desc,
        dueDate:     p.dueDate,
        paidAt:      p.paidAt as Date | null,
      },
    });
  }
  console.log('✅ To\'lovlar yaratildi');

  // ─── 13. Exams ───────────────────────────────────────────────────────────
  await prisma.exam.createMany({
    skipDuplicates: true,
    data: [
      {
        schoolId:    school.id,
        classId:     class5A.id,
        subjectId:   math5A.id,
        title:       'Matematika — 3-chorak nazorat ishi',
        frequency:   'quarterly',
        maxScore:    100,
        scheduledAt: date(5),
        duration:    80,
        isPublished: true,
      },
      {
        schoolId:    school.id,
        classId:     class5A.id,
        subjectId:   english5A.id,
        title:       'English — Monthly Test #3',
        frequency:   'monthly',
        maxScore:    50,
        scheduledAt: date(7),
        duration:    45,
        isPublished: true,
      },
      {
        schoolId:    school.id,
        classId:     class5A.id,
        subjectId:   uzbek5A.id,
        title:       "O'zbek tili — Insho yozish",
        frequency:   'on_demand',
        maxScore:    100,
        scheduledAt: date(10),
        duration:    90,
        isPublished: false,
      },
      {
        schoolId:    school.id,
        classId:     class6A.id,
        subjectId:   math6A.id,
        title:       'Matematika — Algebra bo\'lim testi',
        frequency:   'monthly',
        maxScore:    100,
        scheduledAt: date(3),
        duration:    60,
        isPublished: true,
      },
    ],
  });
  console.log('✅ Imtihonlar yaratildi');

  // ─── 14. Canteen Menu (joriy hafta) ──────────────────────────────────────
  const mealTypes = ['breakfast', 'lunch', 'snack'];
  const menuData: Array<{ dateOffset: number; mealType: string; price: number; items: object }> = [
    // Dushanba (0)
    { dateOffset: 0, mealType: 'breakfast', price: 8000, items: [
      { name: "Sho'rva", calories: 250, allergens: [] },
      { name: "Non", calories: 150, allergens: ['gluten'] },
      { name: "Choy", calories: 5, allergens: [] },
    ]},
    { dateOffset: 0, mealType: 'lunch', price: 15000, items: [
      { name: "Palov", calories: 450, allergens: [] },
      { name: "Salat", calories: 80, allergens: [] },
      { name: "Kompot", calories: 60, allergens: [] },
    ]},
    { dateOffset: 0, mealType: 'snack', price: 5000, items: [
      { name: "Olma", calories: 80, allergens: [] },
      { name: "Sut", calories: 120, allergens: ['dairy'] },
    ]},
    // Seshanba (1)
    { dateOffset: 1, mealType: 'breakfast', price: 8000, items: [
      { name: "Tvorog", calories: 200, allergens: ['dairy'] },
      { name: "Non", calories: 150, allergens: ['gluten'] },
      { name: "Choy", calories: 5, allergens: [] },
    ]},
    { dateOffset: 1, mealType: 'lunch', price: 16000, items: [
      { name: "Lagmon", calories: 500, allergens: ['gluten'] },
      { name: "Bodring salati", calories: 40, allergens: [] },
      { name: "Limonad", calories: 70, allergens: [] },
    ]},
    { dateOffset: 1, mealType: 'snack', price: 5000, items: [
      { name: "Banan", calories: 90, allergens: [] },
      { name: "Qatiq", calories: 100, allergens: ['dairy'] },
    ]},
    // Chorshanba (2)
    { dateOffset: 2, mealType: 'breakfast', price: 8000, items: [
      { name: "Yumurtali tuxum", calories: 180, allergens: ['egg'] },
      { name: "Non", calories: 150, allergens: ['gluten'] },
      { name: "Choy", calories: 5, allergens: [] },
    ]},
    { dateOffset: 2, mealType: 'lunch', price: 14000, items: [
      { name: "Moshxo'rda", calories: 380, allergens: [] },
      { name: "Pomidor salati", calories: 50, allergens: [] },
      { name: "Kompot", calories: 60, allergens: [] },
    ]},
    // Payshanba (3)
    { dateOffset: 3, mealType: 'breakfast', price: 8000, items: [
      { name: "Sutli bo'tqa", calories: 220, allergens: ['dairy', 'gluten'] },
      { name: "Sariyog' bilan non", calories: 200, allergens: ['dairy', 'gluten'] },
      { name: "Choy", calories: 5, allergens: [] },
    ]},
    { dateOffset: 3, mealType: 'lunch', price: 15000, items: [
      { name: "Kabob", calories: 420, allergens: [] },
      { name: "Qovurilgan kartoshka", calories: 300, allergens: [] },
      { name: "Ayron", calories: 80, allergens: ['dairy'] },
    ]},
    // Juma (4)
    { dateOffset: 4, mealType: 'breakfast', price: 9000, items: [
      { name: "Blini", calories: 280, allergens: ['dairy', 'gluten', 'egg'] },
      { name: "Qaymoq", calories: 100, allergens: ['dairy'] },
      { name: "Choy", calories: 5, allergens: [] },
    ]},
    { dateOffset: 4, mealType: 'lunch', price: 18000, items: [
      { name: "Qovurma palov (juma palovi)", calories: 520, allergens: [] },
      { name: "Achichuk salati", calories: 60, allergens: [] },
      { name: "Kompot", calories: 60, allergens: [] },
    ]},
    { dateOffset: 4, mealType: 'snack', price: 6000, items: [
      { name: "Tort", calories: 250, allergens: ['dairy', 'gluten', 'egg'] },
      { name: "Choy", calories: 5, allergens: [] },
    ]},
  ];

  for (const m of menuData) {
    await prisma.menuDay.upsert({
      where: { schoolId_date_mealType: { schoolId: school.id, date: dateOnly(m.dateOffset), mealType: m.mealType } },
      update: {},
      create: {
        schoolId:  school.id,
        date:      dateOnly(m.dateOffset),
        mealType:  m.mealType,
        itemsJson: m.items,
        price:     m.price,
      },
    });
  }
  console.log('✅ Ovqatxona menyusi yaratildi (joriy hafta)');

  // ─── 15. Library Books ───────────────────────────────────────────────────
  const books = [
    { isbn: '978-9943-07-001-1', title: "Matematika 5-sinf darsligi",   author: 'A. Mirzayev',        copies: 30, available: 25 },
    { isbn: '978-9943-07-002-2', title: "O'zbek tili 5-sinf",           author: "N. Xolmatova",       copies: 30, available: 28 },
    { isbn: '978-9943-07-003-3', title: "Tabiatshunoslik 5-sinf",       author: 'M. Karimov',         copies: 25, available: 20 },
    { isbn: '978-9943-07-004-4', title: "O'tkan kunlar",                author: 'Abdulla Qodiriy',    copies: 10, available: 7  },
    { isbn: '978-9943-07-005-5', title: "Mehrobdan chayon",             author: 'Abdulla Qodiriy',    copies: 8,  available: 6  },
    { isbn: '978-9943-07-006-6', title: "Ingliz tili 5-sinf",           author: 'Z. Yo\'ldosheva',    copies: 30, available: 27 },
    { isbn: '978-0-00-000001-1', title: "Harry Potter (O'zbekcha)",     author: 'J.K. Rowling',       copies: 5,  available: 3  },
    { isbn: '978-9943-07-007-7', title: "Fizika 6-sinf",                author: 'B. Toshmatov',       copies: 20, available: 18 },
    { isbn: '978-9943-07-008-8', title: "Kimyo 6-sinf",                 author: 'G. Nazarova',        copies: 20, available: 19 },
    { isbn: '978-9943-07-009-9', title: "Jahon tarixi",                 author: 'various',            copies: 15, available: 12 },
  ];

  const createdBooks: Awaited<ReturnType<typeof prisma.libraryBook.create>>[] = [];
  for (const b of books) {
    const existing = await prisma.libraryBook.findFirst({ where: { isbn: b.isbn, schoolId: school.id } });
    const book = existing ?? await prisma.libraryBook.create({
      data: {
        schoolId:        school.id,
        isbn:            b.isbn,
        title:           b.title,
        author:          b.author,
        copiesTotal:     b.copies,
        copiesAvailable: b.available,
      },
    });
    createdBooks.push(book);
  }

  // Library loans
  const loanData = [
    { book: createdBooks[0], studentId: std001.id, dueOffset: 14 },
    { book: createdBooks[3], studentId: std002.id, dueOffset: 14 },
    { book: createdBooks[6], studentId: std003.id, dueOffset: -3 }, // overdue
    { book: createdBooks[1], studentId: std004.id, dueOffset: 7  },
  ];
  for (const l of loanData) {
    await prisma.libraryLoan.create({
      data: {
        schoolId:  school.id,
        bookId:    l.book.id,
        studentId: l.studentId,
        loanDate:  date(-7),
        dueDate:   date(l.dueOffset),
        returnDate: null,
      },
    }).catch(() => null);
  }
  console.log('✅ Kutubxona kitoblari va nashriyotlar yaratildi');

  // ─── 16. Staff Salaries ──────────────────────────────────────────────────
  const salaryDefs = [
    { user: teacher1, base: 3500000, hourly: 25000, degree: 200000, cert: 150000, pos: "Matematika o'qituvchisi" },
    { user: teacher2, base: 3200000, hourly: 22000, degree: 0,       cert: 100000, pos: "Tabiatshunoslik o'qituvchisi" },
    { user: teacher3, base: 3300000, hourly: 23000, degree: 150000,  cert: 200000, pos: "O'zbek tili o'qituvchisi" },
    { user: schoolAdmin, base: 5000000, hourly: 0, degree: 0, cert: 0, pos: "Maktab direktori" },
    { user: vicePrincipal, base: 4500000, hourly: 0, degree: 200000, cert: 0, pos: "Direktor o'rinbosari" },
    { user: accountant, base: 3000000, hourly: 0, degree: 0, cert: 0, pos: "Buxgalter" },
    { user: librarian,  base: 2500000, hourly: 0, degree: 0, cert: 0, pos: "Kutubxonachi" },
  ];

  const createdSalaries: Array<Awaited<ReturnType<typeof prisma.staffSalary.upsert>>> = [];
  for (const s of salaryDefs) {
    const salary = await prisma.staffSalary.upsert({
      where: { userId: s.user.id },
      update: {},
      create: {
        schoolId:            school.id,
        userId:              s.user.id,
        baseSalary:          s.base,
        hourlyRate:          s.hourly,
        extraCurricularRate: 15000,
        degreeAllowance:     s.degree,
        certificateAllowance: s.cert,
        currency:            'UZS',
        position:            s.pos,
        startDate:           new Date('2024-09-01'),
        isActive:            true,
      },
    });
    createdSalaries.push(salary);
  }
  console.log('✅ Xodimlar maoshi yaratildi');

  // ─── 17. Monthly Payroll (Fevral 2026) ───────────────────────────────────
  const payroll = await prisma.monthlyPayroll.upsert({
    where: { schoolId_month_year: { schoolId: school.id, month: 2, year: 2026 } },
    update: {},
    create: {
      schoolId:    school.id,
      month:       2,
      year:        2026,
      status:      'paid',
      totalGross:  21850000,
      totalNet:    20000000,
      createdById: schoolAdmin.id,
      approvedById: schoolAdmin.id,
      approvedAt:  date(-20),
      paidAt:      date(-15),
      note:        'Fevral 2026 — oylik hisob-kitob',
    },
  });

  // Payroll items for teachers
  const payrollItemDefs = [
    { salary: createdSalaries[0], user: teacher1,    gross: 4050000, net: 3700000, schedHours: 20, compHours: 20 },
    { salary: createdSalaries[1], user: teacher2,    gross: 3500000, net: 3200000, schedHours: 18, compHours: 18 },
    { salary: createdSalaries[2], user: teacher3,    gross: 3800000, net: 3500000, schedHours: 18, compHours: 18 },
    { salary: createdSalaries[3], user: schoolAdmin, gross: 5000000, net: 4600000, schedHours: 0,  compHours: 0  },
    { salary: createdSalaries[4], user: vicePrincipal, gross: 4700000, net: 4300000, schedHours: 0, compHours: 0 },
  ];
  for (const pi of payrollItemDefs) {
    await prisma.payrollItem.upsert({
      where: { payrollId_staffSalaryId: { payrollId: payroll.id, staffSalaryId: pi.salary.id } },
      update: {},
      create: {
        schoolId:             school.id,
        payrollId:            payroll.id,
        staffSalaryId:        pi.salary.id,
        userId:               pi.user.id,
        baseSalary:           pi.salary.baseSalary,
        degreeAllowance:      pi.salary.degreeAllowance,
        certificateAllowance: pi.salary.certificateAllowance,
        scheduledHours:       pi.schedHours,
        completedHours:       pi.compHours,
        hourlyAmount:         pi.salary.hourlyRate * pi.compHours,
        extraCurricularHours: 2,
        extraCurricularAmount: pi.salary.extraCurricularRate * 2,
        bonuses:              0,
        deductions:           0,
        grossTotal:           pi.gross,
        advancePaid:          0,
        netTotal:             pi.net,
      },
    });
  }
  console.log('✅ Oylik hisob-kitob yaratildi (Fevral 2026)');

  // ─── 18. Leave Requests ──────────────────────────────────────────────────
  const leave1 = await prisma.leaveRequest.create({
    data: {
      schoolId:    school.id,
      requesterId: teacher2.id,
      reason:      "Shaxsiy sabab — oilaviy tadbir",
      startDate:   dateOnly(14),
      endDate:     dateOnly(16),
      status:      'pending',
    },
  }).catch(() => null);

  const leave2 = await prisma.leaveRequest.create({
    data: {
      schoolId:    school.id,
      requesterId: teacher3.id,
      reason:      "Malaka oshirish kursi — Toshkent shahri",
      startDate:   dateOnly(7),
      endDate:     dateOnly(11),
      status:      'approved',
    },
  }).catch(() => null);

  if (leave2) {
    await prisma.leaveApproval.upsert({
      where: { leaveRequestId_approverId: { leaveRequestId: leave2.id, approverId: schoolAdmin.id } },
      update: {},
      create: {
        leaveRequestId: leave2.id,
        approverId:     schoolAdmin.id,
        status:         'approved',
        comment:        "Tasdiqlandi. Kurs tugagach hisobot taqdim eting.",
        decidedAt:      date(-1),
      },
    });
  }
  console.log("✅ Ta'til so'rovlari yaratildi");

  // ─── 19. Notifications ───────────────────────────────────────────────────
  const notifData = [
    { recipientId: std001.id, title: "Yangi baho",               body: "Matematika: test uchun 78 ball oldingiz",           type: 'in_app' as const },
    { recipientId: std001.id, title: "Uy vazifasi",              body: "Matematika: 'Kasrlar' vazifasi ertaga topshiriladi", type: 'in_app' as const },
    { recipientId: std002.id, title: "To'lov tasdiqlandi",       body: "Mart oyi to'lovi qabul qilindi",                    type: 'in_app' as const },
    { recipientId: std003.id, title: "Qaydnoma: Davomat",        body: "Kecha darsga kelmadingiz. Ota-onangizga xabar yuborildi", type: 'in_app' as const },
    { recipientId: teacher1.id, title: "Imtihon sanasi",         body: "Matematika 3-chorak nazorat ishi 5 aprel kuni bo'ladi", type: 'in_app' as const },
    { recipientId: schoolAdmin.id, title: "Yangi so'rov",        body: "Jasur Raximov ta'til so'rovini yubordi",             type: 'in_app' as const },
    { recipientId: schoolAdmin.id, title: "To'lov kech qolindi", body: "Sardor Umarov — mart va fevral to'lovlari muddati o'tdi", type: 'in_app' as const },
  ];
  await prisma.notification.createMany({
    data: notifData.map(n => ({
      schoolId:    school.id,
      recipientId: n.recipientId,
      title:       n.title,
      body:        n.body,
      type:        n.type,
      isRead:      false,
    })),
    skipDuplicates: true,
  });
  console.log('✅ Bildirishnomalar yaratildi');

  // ─── 20. Messages ────────────────────────────────────────────────────────
  const msgData = [
    { senderId: teacher1.id, receiverId: schoolAdmin.id, content: "Assalomu alaykum! 5-A sinf matematika jurnali tayyor. Ko'rib chiqishingizni so'rayman." },
    { senderId: schoolAdmin.id, receiverId: teacher1.id, content: "Rahmat, ko'rib chiqdim. Juda yaxshi." },
    { senderId: teacher2.id, receiverId: schoolAdmin.id, content: "Aprel oyida malaka oshirish kursi bor. Ruxsat berasizmi?" },
    { senderId: schoolAdmin.id, receiverId: teacher2.id, content: "Ha, albatta. Ariza yozing." },
    { senderId: teacher1.id, receiverId: teacher3.id,   content: "Holida, 5-A sinfda ingliz tili bo'yicha yig'ilish qachon?" },
    { senderId: teacher3.id, receiverId: teacher1.id,   content: "Ertaga tanaffusda, 11:00 da xonangizda bo'lamiz." },
  ];
  await prisma.message.createMany({
    data: msgData.map(m => ({ schoolId: school.id, ...m, isRead: false })),
    skipDuplicates: true,
  });
  console.log('✅ Xabarlar yaratildi');

  // ─── 21. Clubs (To'garaklar) ─────────────────────────────────────────────
  const getOrCreateClub = async (data: {
    id: string; name: string; description: string; category: ClubCategory;
    leaderId: string; schedule: string; maxMembers: number;
  }) => {
    const existing = await prisma.club.findFirst({ where: { id: data.id } });
    if (existing) return existing;
    return prisma.club.create({
      data: { ...data, schoolId: school.id, isActive: true },
    });
  };

  const clubRobot = await getOrCreateClub({
    id: 'club-robot',
    name: 'Robototexnika',
    description: "Arduino va Raspberry Pi yordamida robotlar yasash, dasturlash va musobaqalarda qatnashish. Har hafta yangi loyiha!",
    category: ClubCategory.tech,
    leaderId: teacher2.id,
    schedule: "Dushanba, Chorshanba 14:00-15:30",
    maxMembers: 20,
  });

  const clubFootball = await getOrCreateClub({
    id: 'club-football',
    name: 'Futbol sektsiyasi',
    description: "Professional murabbiy rahbarligida futbol mahoratini oshirish. Maktablararo turnirga tayyorgarlik.",
    category: ClubCategory.sport,
    leaderId: teacher1.id,
    schedule: "Seshanba, Payshanba, Juma 15:00-16:30",
    maxMembers: 22,
  });

  const clubMusic = await getOrCreateClub({
    id: 'club-music',
    name: "Musiqa studiyasi",
    description: "Gitara, pianino va ovoz maktabi. Konsert va festivallar uchun tayyorgarlik ko'ramiz.",
    category: ClubCategory.music,
    leaderId: teacher3.id,
    schedule: "Seshanba, Juma 14:00-15:00",
    maxMembers: 15,
  });

  const clubArt = await getOrCreateClub({
    id: 'club-art',
    name: "Tasviriy san'at",
    description: "Rasm chizish, akvarell, yog' bilan ishlash texnikasi. Yoshlar ko'rgazmasiga tayyorgarlik.",
    category: ClubCategory.art,
    leaderId: teacher3.id,
    schedule: "Dushanba, Chorshanba 15:00-16:00",
    maxMembers: 18,
  });

  const clubEnglish = await getOrCreateClub({
    id: 'club-english',
    name: "English Speaking Club",
    description: "Ingliz tilini erkin gaplashish orqali o'rganish. Native speaker bilan onlayn suhbatlar va debate musobaqalari.",
    category: ClubCategory.language,
    leaderId: teacher2.id,
    schedule: "Chorshanba, Juma 14:00-15:00",
    maxMembers: 25,
  });

  const clubScience = await getOrCreateClub({
    id: 'club-science',
    name: "Yoshlar laboratoriyasi",
    description: "Kimyo, fizika va biologiya bo'yicha tajribalar. Respublika olimpiadasiga tayyorgarlik.",
    category: ClubCategory.science,
    leaderId: teacher1.id,
    schedule: "Payshanba 14:00-16:00",
    maxMembers: 15,
  });

  // Club members
  const clubMemberDefs = [
    { clubId: clubRobot.id,    studentId: students['std-001'].id },
    { clubId: clubRobot.id,    studentId: students['std-003'].id },
    { clubId: clubRobot.id,    studentId: students['std-007'].id },
    { clubId: clubFootball.id, studentId: students['std-001'].id },
    { clubId: clubFootball.id, studentId: students['std-003'].id },
    { clubId: clubFootball.id, studentId: students['std-005'].id },
    { clubId: clubFootball.id, studentId: students['std-007'].id },
    { clubId: clubMusic.id,    studentId: students['std-002'].id },
    { clubId: clubMusic.id,    studentId: students['std-004'].id },
    { clubId: clubMusic.id,    studentId: students['std-006'].id },
    { clubId: clubArt.id,      studentId: students['std-002'].id },
    { clubId: clubArt.id,      studentId: students['std-004'].id },
    { clubId: clubArt.id,      studentId: students['std-008'].id },
    { clubId: clubEnglish.id,  studentId: students['std-001'].id },
    { clubId: clubEnglish.id,  studentId: students['std-002'].id },
    { clubId: clubEnglish.id,  studentId: students['std-005'].id },
    { clubId: clubEnglish.id,  studentId: students['std-006'].id },
    { clubId: clubScience.id,  studentId: students['std-003'].id },
    { clubId: clubScience.id,  studentId: students['std-007'].id },
    { clubId: clubScience.id,  studentId: students['std-008'].id },
  ];

  for (const m of clubMemberDefs) {
    await prisma.clubMember.upsert({
      where: { clubId_studentId: { clubId: m.clubId, studentId: m.studentId } },
      update: {},
      create: { clubId: m.clubId, studentId: m.studentId },
    });
  }
  console.log(`✅ ${6} ta to'garak va ${clubMemberDefs.length} ta a'zolik yaratildi`);

  // ─── Final ───────────────────────────────────────────────────────────────
  console.log('\n🎉 To\'liq seeding tugadi!');
  console.log('\n📋 Test akkauntlar:');
  console.log('  Super admin:   super@eduplatform.uz      / SuperAdmin123!');
  console.log('  Maktab admin:  admin@demo-school.uz      / SchoolAdmin123!');
  console.log('  Direktor o\'r.: vice@demo-school.uz       / Vice123!');
  console.log('  Buxgalter:     accountant@demo-school.uz / Accountant123!');
  console.log('  Kutubxonachi:  librarian@demo-school.uz  / Librarian123!');
  console.log("  O'qituvchi 1:  teacher@demo-school.uz    / Teacher123!");
  console.log("  O'qituvchi 2:  teacher2@demo-school.uz   / Teacher123!");
  console.log("  O'qituvchi 3:  teacher3@demo-school.uz   / Teacher123!");
  console.log("  O'quvchi 1:    student@demo-school.uz    / Student123!");
  console.log("  O'quvchi 2:    student2@demo-school.uz   / Student123!");
  console.log('  Ota-ona:       parent@demo-school.uz     / Parent123!');
  console.log('\n📊 Demo ma\'lumotlar:');
  console.log('  • 3 ta sinf: 5-A (4 o\'q), 5-B (2 o\'q), 6-A (2 o\'q)');
  console.log('  • 10 ta fan, 25 ta jadval slot (5-A)');
  console.log('  • 10 kunlik davomat tarixi');
  console.log('  • 26 ta baho yozing, 3 ta uy vazifa');
  console.log('  • 10 ta to\'lov (paid/pending/overdue)');
  console.log('  • 4 ta imtihon');
  console.log('  • 13 ta ovqatxona menyusi (joriy hafta)');
  console.log('  • 10 ta kutubxona kitobi, 4 ta nashriyot');
  console.log('  • 7 ta xodim maoshi, 1 ta oylik hisob-kitob');
  console.log('  • 2 ta ta\'til so\'rovi');
  console.log('  • 6 ta to\'garak (robot, futbol, musiqa, san\'at, ingliz, ilm), 20 a\'zo');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
