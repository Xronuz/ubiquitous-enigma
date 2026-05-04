import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { NotificationQueueService } from './notification-queue.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

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
    // Recipient branch for denormalization
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { branchId: true },
    });
    const branchId = recipient?.branchId!;

    const notification = await this.prisma.notification.create({
      data: {
        schoolId: currentUser.schoolId!,
        branchId,
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true, branchId: true, role: true },
    });
    const where: any = { recipientId: userId };
    // For non-school-wide roles, filter notifications by branch
    if (user?.branchId && !['super_admin', 'director'].includes(user.role)) {
      where.OR = [
        { branchId: user.branchId },
        { branchId: null }, // school-wide notifications
      ];
    }
    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
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
    const filter = buildTenantWhere(currentUser);

    // Maqsadli foydalanuvchilarni aniqlash
    const roleMap: Record<string, string[]> = {
      all_staff:      ['director', 'vice_principal', 'teacher', 'class_teacher', 'accountant', 'librarian'],
      all_teachers:   ['teacher', 'class_teacher'],
      class_teachers: ['class_teacher'],
      all_parents:    ['parent'],
      all_students:   ['student'],
    };

    const roles = roleMap[payload.targetGroup]
      ? roleMap[payload.targetGroup]
      : [payload.targetGroup]; // to'g'ridan-to'g'ri rol nomi berilgan bo'lsa

    const { schoolId: _, ...restFilter } = filter as any;
    const recipients = await this.prisma.user.findMany({
      where: { role: { in: roles as any }, isActive: true, ...restFilter, schoolId },
      select: { id: true, branchId: true },
    });

    if (recipients.length === 0) {
      return { sent: 0, message: 'Maqsadli foydalanuvchilar topilmadi' };
    }

    // Toplu notification yaratish (denormalized branchId)
    await this.prisma.notification.createMany({
      data: recipients.map(r => ({
        schoolId,
        branchId: r.branchId || currentUser.branchId!,
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
    branchId?: string | null;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        schoolId: data.schoolId,
        branchId: data.branchId!,
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
