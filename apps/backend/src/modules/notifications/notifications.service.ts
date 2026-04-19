import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { NotificationQueueService } from './notification-queue.service';

export class SendNotificationDto {
  recipientId: string;
  title: string;
  body: string;
  type?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway: EventsGateway,
    @Optional() private readonly notificationQueue: NotificationQueueService,
  ) {}

  async send(dto: SendNotificationDto, currentUser: JwtPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        schoolId: currentUser.schoolId!,
        recipientId: dto.recipientId,
        title: dto.title,
        body: dto.body,
        type: (dto.type as any) ?? 'in_app',
        metadata: dto.metadata,
      },
    });
    // H-5: BullMQ orqali SMS/push yuborish (Phase 2 implementation)
    // Agar type 'sms' yoki 'push' bo'lsa — queue orqali asinxron yuboramiz
    if (dto.type === 'sms' || dto.type === 'push') {
      const recipient = await this.prisma.user.findUnique({
        where: { id: dto.recipientId },
        select: { phone: true, email: true, firstName: true, lastName: true },
      }).catch(() => null);

      if (recipient?.phone && dto.type === 'sms') {
        await this.notificationQueue?.queueSms({
          to: recipient.phone,
          message: `${dto.title}: ${dto.body}`,
        }).catch(() => { /* Queue bo'lmasa davom etadi */ });
      }
    }

    // Real-time WebSocket push (in_app + push)
    if (dto.type !== 'sms') {
      this.eventsGateway?.emitToUser(dto.recipientId, 'notification:new', {
        id: notification.id,
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'in_app',
      });
    }

    this.logger.log(`Bildirishnoma yuborildi: ${dto.recipientId} — ${dto.title}`);
    return notification;
  }

  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { recipientId: userId } }),
      this.prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    ]);
    return { data: notifications, meta: { total, page, limit, unreadCount } };
  }

  async markAsRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
    return { message: 'O\'qildi deb belgilandi' };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'Barcha bildirishnomalar o\'qildi deb belgilandi' };
  }

  async deleteOne(id: string, userId: string) {
    await this.prisma.notification.deleteMany({
      where: { id, recipientId: userId },
    });
    return { message: 'Bildirishnoma o\'chirildi' };
  }

  async deleteAll(userId: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { recipientId: userId },
    });
    return { message: `${count} ta bildirishnoma o\'chirildi`, count };
  }

  // ── Notification Preferences ──────────────────────────────────────────────

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifPreferences: true },
    });
    const defaults = {
      sms_attendance: true,
      sms_payment:    true,
      email_grades:   true,
      email_homework: false,
      push_all:       true,
    };
    return { preferences: { ...defaults, ...(user?.notifPreferences as any ?? {}) } };
  }

  async updatePreferences(userId: string, prefs: Record<string, boolean>) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { notifPreferences: prefs },
    });
    return { message: 'Sozlamalar saqlandi', preferences: prefs };
  }

  /**
   * Direktor va adminlar uchun: maktab ichida rol yoki guruh bo'yicha toplu e'lon yuborish
   * targetGroup: 'all_staff' | 'all_teachers' | 'class_teachers' | 'all_parents' | 'all_students' | rol nomi
   */
  async broadcast(
    payload: { targetGroup: string; title: string; body: string },
    currentUser: JwtPayload,
  ) {
    const schoolId = currentUser.schoolId!;

    // Maqsadli foydalanuvchilarni aniqlash
    const roleMap: Record<string, string[]> = {
      all_staff:      ['school_admin', 'director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'],
      all_teachers:   ['teacher', 'class_teacher'],
      class_teachers: ['class_teacher'],
      all_parents:    ['parent'],
      all_students:   ['student'],
    };

    const roles = roleMap[payload.targetGroup]
      ? roleMap[payload.targetGroup]
      : [payload.targetGroup]; // to'g'ridan-to'g'ri rol nomi berilgan bo'lsa

    const recipients = await this.prisma.user.findMany({
      where: { schoolId, role: { in: roles as any }, isActive: true },
      select: { id: true },
    });

    if (recipients.length === 0) {
      return { sent: 0, message: 'Maqsadli foydalanuvchilar topilmadi' };
    }

    // Toplu notification yaratish
    await this.prisma.notification.createMany({
      data: recipients.map(r => ({
        schoolId,
        recipientId: r.id,
        title: payload.title,
        body: payload.body,
        type: 'in_app' as any,
      })),
    });

    // WebSocket orqali real-time yuborish
    this.eventsGateway?.emitToSchool(schoolId, 'notification:broadcast', {
      title: payload.title,
      body: payload.body,
      targetGroup: payload.targetGroup,
    });

    this.logger.log(`Broadcast: "${payload.title}" → ${payload.targetGroup} (${recipients.length} ta)`);
    return { sent: recipients.length, message: `${recipients.length} ta foydalanuvchiga e'lon yuborildi` };
  }

  async createInApp(data: {
    schoolId: string;
    recipientId: string;
    title: string;
    body: string;
    type: any;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        schoolId: data.schoolId,
        recipientId: data.recipientId,
        title: data.title,
        body: data.body,
        type: data.type,
        metadata: data.metadata,
      },
    });

    // Real-time push via WebSocket
    this.eventsGateway?.emitNotification(data.schoolId, {
      id: notification.id,
      recipientId: data.recipientId,
      title: data.title,
      body: data.body,
    });

    return notification;
  }
}
