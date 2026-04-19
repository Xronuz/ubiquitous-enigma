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

  // ══════════════════════════════════════════════════════════════════════════
  //  GROUP CHAT
  // ══════════════════════════════════════════════════════════════════════════

  /** Guruh yaratish */
  async createGroup(
    dto: { name: string; description?: string; participantIds: string[] },
    currentUser: JwtPayload,
  ) {
    const schoolId = currentUser.schoolId!;
    const creatorId = currentUser.sub;

    // Ensure creator is in participants
    const allIds = Array.from(new Set([creatorId, ...dto.participantIds]));

    const conversation = await this.prisma.conversation.create({
      data: {
        schoolId,
        name: dto.name,
        description: dto.description,
        createdById: creatorId,
        participants: {
          create: allIds.map(uid => ({
            userId: uid,
            isAdmin: uid === creatorId,
          })),
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
      },
    });

    // Notify participants via WebSocket
    allIds.forEach(uid => {
      if (uid !== creatorId) {
        this.eventsGateway?.emitToUser(uid, 'group:created', {
          id: conversation.id,
          name: conversation.name,
        });
      }
    });

    return conversation;
  }

  /** Foydalanuvchi ishtirokidagi barcha guruhlar */
  async getGroups(currentUser: JwtPayload) {
    const groups = await this.prisma.conversation.findMany({
      where: {
        schoolId: currentUser.schoolId!,
        participants: { some: { userId: currentUser.sub } },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return groups.map(g => {
      const me = g.participants.find(p => p.userId === currentUser.sub);
      const lastMessage = g.messages[0] ?? null;
      const unreadCount = 0; // computed separately if needed
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        participantCount: g.participants.length,
        participants: g.participants,
        lastMessage,
        unreadCount,
        isAdmin: me?.isAdmin ?? false,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      };
    });
  }

  /** Guruh xabarlarini olish */
  async getGroupMessages(
    groupId: string,
    currentUser: JwtPayload,
    page = 1,
    limit = 30,
  ) {
    // Check membership
    const member = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId: groupId, userId: currentUser.sub },
    });
    if (!member) throw new Error('Siz bu guruh a\'zosi emassiz');

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.prisma.groupMessage.findMany({
        where: { conversationId: groupId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
      }),
      this.prisma.groupMessage.count({ where: { conversationId: groupId } }),
    ]);

    // Update lastReadAt
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: groupId, userId: currentUser.sub } },
      data: { lastReadAt: new Date() },
    });

    return {
      data: messages.reverse(),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Guruhga xabar yuborish */
  async sendGroupMessage(
    groupId: string,
    content: string,
    currentUser: JwtPayload,
  ) {
    const member = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId: groupId, userId: currentUser.sub },
    });
    if (!member) throw new Error('Siz bu guruh a\'zosi emassiz');

    const message = await this.prisma.groupMessage.create({
      data: { conversationId: groupId, senderId: currentUser.sub, content },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });

    // Update conversation updatedAt
    await this.prisma.conversation.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    // Real-time: Broadcast to all group members
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: groupId },
      select: { userId: true },
    });
    participants.forEach(p => {
      this.eventsGateway?.emitToUser(p.userId, 'group:message', {
        conversationId: groupId,
        id: message.id,
        content: message.content,
        sender: message.sender,
        createdAt: message.createdAt,
      });
    });

    return message;
  }

  /** Guruhga yangi a'zo qo'shish (faqat admin) */
  async addParticipant(
    groupId: string,
    userId: string,
    currentUser: JwtPayload,
  ) {
    const admin = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId: groupId, userId: currentUser.sub, isAdmin: true },
    });
    if (!admin) throw new Error('Faqat guruh admini a\'zo qo\'sha oladi');

    await this.prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: groupId, userId } },
      create: { conversationId: groupId, userId },
      update: {},
    });
    return { message: 'A\'zo qo\'shildi' };
  }

  /** Guruhdan chiqish */
  async leaveGroup(groupId: string, currentUser: JwtPayload) {
    await this.prisma.conversationParticipant.deleteMany({
      where: { conversationId: groupId, userId: currentUser.sub },
    });
    return { message: 'Guruhdan chiqdingiz' };
  }
}
