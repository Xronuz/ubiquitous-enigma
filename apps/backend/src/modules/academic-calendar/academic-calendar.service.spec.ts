import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AcademicCalendarService } from './academic-calendar.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'admin@test.com',
  role: UserRole.SCHOOL_ADMIN,
  schoolId: 'school-1',
  isSuperAdmin: false,
};

describe('AcademicCalendarService', () => {
  let service: AcademicCalendarService;
  let prisma: { academicEvent: any };

  beforeEach(async () => {
    prisma = {
      academicEvent: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicCalendarService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AcademicCalendarService>(AcademicCalendarService);
  });

  describe('findAll', () => {
    it('should return events for the school', async () => {
      const events = [
        { id: '1', title: "Ta'til", schoolId: 'school-1' },
        { id: '2', title: 'Imtihon', schoolId: 'school-1' },
      ];
      prisma.academicEvent.findMany.mockResolvedValue(events);

      const result = await service.findAll(mockUser);

      expect(result).toEqual(events);
      expect(prisma.academicEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-1' }) }),
      );
    });

    it('should filter by date range when from/to provided', async () => {
      prisma.academicEvent.findMany.mockResolvedValue([]);

      await service.findAll(mockUser, '2025-09-01', '2025-09-30');

      const call = prisma.academicEvent.findMany.mock.calls[0][0];
      expect(call.where.startDate?.gte).toBeDefined();
      expect(call.where.startDate?.lte).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when event not found', async () => {
      prisma.academicEvent.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', mockUser))
        .rejects.toThrow(NotFoundException);
    });

    it('should return event when found', async () => {
      const event = { id: '1', title: "Ta'til", schoolId: 'school-1' };
      prisma.academicEvent.findFirst.mockResolvedValue(event);

      const result = await service.findOne('1', mockUser);

      expect(result).toEqual(event);
    });
  });

  describe('create', () => {
    it('should create event with correct schoolId and createdById', async () => {
      const created = { id: '1', title: 'Yangi tadbir' };
      prisma.academicEvent.create.mockResolvedValue(created);

      const result = await service.create(
        { title: 'Yangi tadbir', startDate: '2025-10-01', endDate: '2025-10-05' },
        mockUser,
      );

      expect(prisma.academicEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: 'school-1',
            createdById: 'user-1',
            title: 'Yangi tadbir',
          }),
        }),
      );
      expect(result).toEqual(created);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException for missing event', async () => {
      prisma.academicEvent.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing', mockUser))
        .rejects.toThrow(NotFoundException);
    });
  });
});
