import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'admin@test.com',
  role: UserRole.SCHOOL_ADMIN,
  schoolId: 'school-1',
  branchId: null,
  isSuperAdmin: false,
};

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: { attendance: any; user: any; $transaction: any };

  beforeEach(async () => {
    prisma = {
      attendance: { findMany: jest.fn(), upsert: jest.fn() },
      user: { count: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationQueueService, useValue: null },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  describe('getTodaySummary', () => {
    it("should compute today's attendance summary correctly", async () => {
      const records = [
        { status: 'present' },
        { status: 'present' },
        { status: 'absent' },
        { status: 'late' },
        { status: 'excused' },
      ];
      prisma.attendance.findMany.mockResolvedValue(records);
      prisma.user.count.mockResolvedValue(30);

      const result = await service.getTodaySummary(mockUser);

      expect(result.present).toBe(2);
      expect(result.absent).toBe(1);
      expect(result.late).toBe(1);
      expect(result.excused).toBe(1);
      expect(result.marked).toBe(5);
      expect(result.totalStudents).toBe(30);
      expect(result.presentPct).toBe(40); // 2/5 = 40%
    });

    it('should return 0 presentPct when no records', async () => {
      prisma.attendance.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(30);

      const result = await service.getTodaySummary(mockUser);

      expect(result.marked).toBe(0);
      expect(result.presentPct).toBe(0);
    });

    it('should return 100% when all students are present', async () => {
      const records = Array(10).fill({ status: 'present' });
      prisma.attendance.findMany.mockResolvedValue(records);
      prisma.user.count.mockResolvedValue(10);

      const result = await service.getTodaySummary(mockUser);

      expect(result.presentPct).toBe(100);
      expect(result.absent).toBe(0);
    });
  });
});
