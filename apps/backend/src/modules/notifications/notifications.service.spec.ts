import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1',
  email: 'admin@test.com',
  role: UserRole.SCHOOL_ADMIN,
  schoolId: 'school-1',
  isSuperAdmin: false,
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: { notification: any; user: any };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('getPreferences', () => {
    it('should return defaults when user has no preferences', async () => {
      prisma.user.findUnique.mockResolvedValue({ notifPreferences: null });

      const result = await service.getPreferences('user-1');

      expect(result.preferences.sms_attendance).toBe(true);
      expect(result.preferences.push_all).toBe(true);
    });

    it('should merge saved preferences with defaults', async () => {
      prisma.user.findUnique.mockResolvedValue({
        notifPreferences: { sms_attendance: false, email_grades: false },
      });

      const result = await service.getPreferences('user-1');

      expect(result.preferences.sms_attendance).toBe(false);
      expect(result.preferences.email_grades).toBe(false);
      expect(result.preferences.push_all).toBe(true); // default
    });
  });

  describe('updatePreferences', () => {
    it('should save preferences and return them', async () => {
      prisma.user.update.mockResolvedValue({});

      const prefs = { sms_attendance: false, push_all: true };
      const result = await service.updatePreferences('user-1', prefs);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { notifPreferences: prefs },
      });
      expect(result.preferences).toEqual(prefs);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('send', () => {
    it('should create a notification', async () => {
      const notification = { id: 'notif-1', title: 'Test' };
      prisma.notification.create.mockResolvedValue(notification);

      const result = await service.send(
        { recipientId: 'user-2', title: 'Test', body: 'Test body' },
        mockUser,
      );

      expect(prisma.notification.create).toHaveBeenCalled();
      expect(result).toEqual(notification);
    });
  });
});
