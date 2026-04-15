import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GradesService, BulkGradesDto } from './grades.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GradeType, JwtPayload, UserRole } from '@eduplatform/types';

const SCHOOL_ID = 'school-1';
const CLASS_ID  = 'class-1';
const SUBJ_ID   = 'subj-1';

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'admin@test.com',
  role: UserRole.TEACHER,
  schoolId: SCHOOL_ID,
  isSuperAdmin: false,
};

const mockGrade = {
  id: 'grade-1',
  schoolId: SCHOOL_ID, classId: CLASS_ID, subjectId: SUBJ_ID,
  studentId: 'student-1', type: GradeType.TEST,
  score: 85, maxScore: 100, comment: 'Yaxshi',
  date: new Date('2026-04-01'),
  student: { id: 'student-1', firstName: 'Bobur', lastName: 'Toshmatov' },
  subject: { id: SUBJ_ID, name: 'Matematika' },
};

describe('GradesService', () => {
  let service: GradesService;
  let prisma: { grade: any; classStudent: any; $transaction: jest.Mock };

  beforeEach(async () => {
    prisma = {
      grade: {
        findMany:   jest.fn(),
        findFirst:  jest.fn(),
        create:     jest.fn(),
        createMany: jest.fn(),
        update:     jest.fn(),
        delete:     jest.fn(),
        count:      jest.fn(),
      },
      classStudent:  { findMany: jest.fn() },
      $transaction:  jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  describe('getStudentGpa', () => {
    it('should return 0 gpa when no grades', async () => {
      prisma.grade.findMany.mockResolvedValue([]);

      const result = await service.getStudentGpa('student-1', mockUser);

      expect(result.gpa).toBe(0);
      expect(result.gradeCount).toBe(0);
    });

    it('should calculate GPA correctly from grades', async () => {
      // 80/100 = 80%, 90/100 = 90% → avg = 85%
      prisma.grade.findMany.mockResolvedValue([
        { score: 80, maxScore: 100 },
        { score: 90, maxScore: 100 },
      ]);

      const result = await service.getStudentGpa('student-1', mockUser);

      expect(result.gpa).toBe(85);
      expect(result.gradeCount).toBe(2);
    });

    it('should handle different maxScore values', async () => {
      // 45/50 = 90%, 20/25 = 80% → avg = 85%
      prisma.grade.findMany.mockResolvedValue([
        { score: 45, maxScore: 50 },
        { score: 20, maxScore: 25 },
      ]);

      const result = await service.getStudentGpa('student-1', mockUser);

      expect(result.gpa).toBe(85);
    });
  });

  describe('getClassGpa', () => {
    it('should return empty students array and 0 classAvg when no members', async () => {
      prisma.classStudent.findMany.mockResolvedValue([]);

      const result = await service.getClassGpa('class-1', mockUser);

      expect(result.students).toEqual([]);
      expect(result.classAvg).toBe(0);
    });

    it('should sort students by gpa desc', async () => {
      prisma.classStudent.findMany.mockResolvedValue([
        { studentId: 'st-1', student: { firstName: 'Ali', lastName: 'Karimov' } },
        { studentId: 'st-2', student: { firstName: 'Vali', lastName: 'Rahimov' } },
      ]);
      // st-1 gets 60%, st-2 gets 90%
      prisma.grade.findMany
        .mockResolvedValueOnce([{ score: 60, maxScore: 100 }])
        .mockResolvedValueOnce([{ score: 90, maxScore: 100 }]);

      const result = await service.getClassGpa('class-1', mockUser);

      expect(result.students[0].studentId).toBe('st-2'); // higher GPA first
      expect(result.students[0].gpa).toBe(90);
      expect(result.classAvg).toBe(75);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a grade with schoolId injected from JWT', async () => {
      prisma.grade.create.mockResolvedValueOnce(mockGrade);

      const dto = {
        classId: CLASS_ID, subjectId: SUBJ_ID, studentId: 'student-1',
        type: GradeType.TEST, score: 85, maxScore: 100,
        date: '2026-04-01', comment: 'Yaxshi',
      };

      const result = await service.create(dto, mockUser);

      expect(result.score).toBe(85);
      expect(prisma.grade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ schoolId: SCHOOL_ID, score: 85 }),
        }),
      );
    });
  });

  // ── bulkCreate ────────────────────────────────────────────────────────────

  describe('bulkCreate()', () => {
    it('inserts all items and returns saved count', async () => {
      prisma.grade.createMany.mockResolvedValueOnce({ count: 3 });

      const dto: BulkGradesDto = {
        classId: CLASS_ID, subjectId: SUBJ_ID,
        type: GradeType.TEST, date: '2026-04-01', maxScore: 100,
        items: [
          { studentId: 'st-1', score: 90 },
          { studentId: 'st-2', score: 75 },
          { studentId: 'st-3', score: 60 },
        ],
      };

      const result = await service.bulkCreate(dto, mockUser);

      expect(result.saved).toBe(3);
      expect(prisma.grade.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ studentId: 'st-1', score: 90, schoolId: SCHOOL_ID }),
        ]),
      });
    });

    it('uses per-item maxScore when provided, falls back to DTO maxScore', async () => {
      prisma.grade.createMany.mockResolvedValueOnce({ count: 1 });

      const dto: BulkGradesDto = {
        classId: CLASS_ID, subjectId: SUBJ_ID,
        type: GradeType.TEST, date: '2026-04-01', maxScore: 100,
        items: [{ studentId: 'st-1', score: 45, maxScore: 50 }],
      };

      await service.bulkCreate(dto, mockUser);

      expect(prisma.grade.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ maxScore: 50 })],
      });
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates grade and returns updated record', async () => {
      prisma.grade.findFirst.mockResolvedValueOnce(mockGrade);
      prisma.grade.update.mockResolvedValueOnce({ ...mockGrade, score: 95 });

      const result = await service.update('grade-1', { score: 95 }, mockUser);

      expect(result.score).toBe(95);
    });

    it('throws NotFoundException when grade not in school', async () => {
      prisma.grade.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.update('nonexistent', { score: 90 }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('deletes the grade', async () => {
      prisma.grade.findFirst.mockResolvedValueOnce(mockGrade);
      prisma.grade.delete.mockResolvedValueOnce(mockGrade);

      const result = await service.remove('grade-1', mockUser);

      expect(result).toBeDefined();
      expect(prisma.grade.delete).toHaveBeenCalledWith({ where: { id: 'grade-1' } });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.grade.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.remove('nonexistent', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
