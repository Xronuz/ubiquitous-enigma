import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload, UserRole, DayOfWeek } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'admin@test.com',
  role: UserRole.SCHOOL_ADMIN,
  schoolId: 'school-1',
  branchId: null,
  isSuperAdmin: false,
};

const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(undefined),
};

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prisma: { schedule: any };

  beforeEach(async () => {
    prisma = {
      schedule: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    jest.clearAllMocks();
    mockRedis.getJson.mockResolvedValue(null);
    mockRedis.keys.mockResolvedValue([]);
  });

  describe('checkConflict', () => {
    it('should return no conflicts when no existing schedule', async () => {
      prisma.schedule.findFirst.mockResolvedValue(null);

      const result = await service.checkConflict(mockUser, {
        dayOfWeek: DayOfWeek.MONDAY,
        timeSlot: 1,
        teacherId: 'teacher-1',
        roomNumber: '101',
        classId: 'class-1',
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect room conflict', async () => {
      prisma.schedule.findFirst
        .mockResolvedValueOnce({ id: 'existing-1' }) // room conflict
        .mockResolvedValueOnce(null)                  // teacher: no conflict
        .mockResolvedValueOnce(null);                 // class: no conflict

      const result = await service.checkConflict(mockUser, {
        dayOfWeek: DayOfWeek.MONDAY,
        timeSlot: 1,
        roomNumber: '101',
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].type).toBe('room');
    });

    it('should detect teacher conflict', async () => {
      // No roomNumber → room query is skipped (Promise.resolve(null) directly)
      // No classId → class query is skipped (Promise.resolve(null) directly)
      // Only teacherId query calls findFirst → one call
      prisma.schedule.findFirst
        .mockResolvedValueOnce({ id: 'existing-2', class: { name: '5A' }, subject: { name: 'Matematika' } });

      const result = await service.checkConflict(mockUser, {
        dayOfWeek: DayOfWeek.MONDAY,
        timeSlot: 2,
        teacherId: 'teacher-1',
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].type).toBe('teacher');
      expect(result.conflicts[0].message).toContain('5A');
    });

    it('should detect multiple conflicts simultaneously', async () => {
      prisma.schedule.findFirst
        .mockResolvedValueOnce({ id: 'r' })                                     // room conflict
        .mockResolvedValueOnce({ id: 't', class: { name: '7B' }, subject: { name: 'Fizika' } }) // teacher conflict
        .mockResolvedValueOnce(null);                                            // class: no conflict

      const result = await service.checkConflict(mockUser, {
        dayOfWeek: DayOfWeek.TUESDAY,
        timeSlot: 3,
        roomNumber: '205',
        teacherId: 'teacher-2',
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(2);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when slot not found', async () => {
      prisma.schedule.findFirst.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should delete and invalidate cache', async () => {
      prisma.schedule.findFirst.mockResolvedValue({ id: 'slot-1' });
      prisma.schedule.delete.mockResolvedValue({ id: 'slot-1' });
      mockRedis.keys.mockResolvedValue(['schedule:school-1:week:all']);

      await service.remove('slot-1', mockUser);

      expect(prisma.schedule.delete).toHaveBeenCalledWith({ where: { id: 'slot-1' } });
      expect(mockRedis.del).toHaveBeenCalledWith('schedule:school-1:week:all');
    });
  });
});
