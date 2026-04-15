import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { SendMessageDto } from './dto/send-message.dto';
import { EventsGateway } from '@/modules/gateway/events.gateway';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  async getConversations(currentUser: JwtPayload) {
    const userId = currentUser.sub;
    const schoolId = currentUser.schoolId!;

    // Get all messages involving the current user
    const messages = await this.prisma.message.findMany({
      where: {
        schoolId,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Build conversation map keyed by the other user's id
    const conversationMap = new Map<string, any>();

    for (const msg of messages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;

      if (!conversationMap.has(otherId)) {
        conversationMap.set(otherId, {
          user: otherUser,
          lastMessage: msg,
          unreadCount: 0,
        });
      }

      // Count unread messages from the other user
      if (msg.receiverId === userId && !msg.isRead) {
        const conv = conversationMap.get(otherId)!;
        conv.unreadCount += 1;
      }
    }

    return Array.from(conversationMap.values());
  }

  async getMessages(
    otherUserId: string,
    currentUser: JwtPayload,
    page = 1,
    limit = 20,
  ) {
    const userId = currentUser.sub;
    const schoolId = currentUser.schoolId!;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          schoolId,
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
          receiver: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.message.count({
        where: {
          schoolId,
          OR: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        },
      }),
    ]);

    return {
      data: messages.reverse(),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async sendMessage(dto: SendMessageDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Verify receiver exists in the same school
    const receiver = await this.prisma.user.findFirst({
      where: { id: dto.receiverId, schoolId },
    });
    if (!receiver) throw new NotFoundException('Foydalanuvchi topilmadi');

    const message = await this.prisma.message.create({
      data: {
        schoolId,
        senderId: currentUser.sub,
        receiverId: dto.receiverId,
        content: dto.content,
        isRead: false,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        receiver: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Real-time: qabul qiluvchiga shaxsiy xona orqali yuborish
    this.eventsGateway?.emitDirectMessage(dto.receiverId, {
      id:         message.id,
      content:    message.content,
      senderId:   message.senderId,
      sender:     message.sender,
      createdAt:  message.createdAt,
    });

    return message;
  }

  async markAsRead(otherUserId: string, currentUser: JwtPayload) {
    const userId = currentUser.sub;
    const schoolId = currentUser.schoolId!;

    await this.prisma.message.updateMany({
      where: {
        schoolId,
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { message: 'Xabarlar o\'qildi deb belgilandi' };
  }

  async getUnreadCount(currentUser: JwtPayload) {
    const count = await this.prisma.message.count({
      where: {
        schoolId: currentUser.schoolId!,
        receiverId: currentUser.sub,
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  /** O'z yuborgan xabarini o'chirish */
  async deleteMessage(id: string, currentUser: JwtPayload) {
    const msg = await this.prisma.message.findFirst({
      where: { id, schoolId: currentUser.schoolId!, senderId: currentUser.sub },
    });
    if (!msg) throw new NotFoundException('Xabar topilmadi yoki o\'chirish huquqi yo\'q');
    await this.prisma.message.delete({ where: { id } });
    return { message: 'Xabar o\'chirildi' };
  }

  /** Foydalanuvchi bilan butun suhbatni o'chirish (o'z xabarlari) */
  async deleteConversation(otherUserId: string, currentUser: JwtPayload) {
    const { count } = await this.prisma.message.deleteMany({
      where: {
        schoolId: currentUser.schoolId!,
        senderId: currentUser.sub,
        receiverId: otherUserId,
      },
    });
    return { message: `${count} ta xabar o'chirildi`, count };
  }
}
