import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@eduplatform/types';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.config.get('JWT_SECRET'),
        });
        client.data.user = payload;

        const rooms: string[] = [`user:${payload.sub}`];

        // Tenant room — barcha maktab xodimlari
        if (payload.schoolId) {
          rooms.push(`school:${payload.schoolId}`);
        }

        // Branch room — filial xodimlari (director ham ulani kuzatadi)
        if (payload.branchId) {
          rooms.push(`branch:${payload.branchId}`);
        }

        await Promise.all(rooms.map((r) => client.join(r)));
        this.logger.log(
          `Connected: ${payload.email} → [${rooms.join(', ')}] (${client.id})`,
        );
      } else {
        // Public display mode — join display room only
        const schoolSlug = client.handshake.query?.schoolSlug as string;
        if (schoolSlug) {
          await client.join(`display:${schoolSlug}`);
          this.logger.log(`Display client connected: ${schoolSlug} (${client.id})`);
        }
      }
    } catch {
      this.logger.warn(`Unauthenticated socket connection: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ─── Subscribe messages (manual room join) ───────────────────────────────

  @SubscribeMessage('join:school')
  async handleJoinSchool(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { schoolId: string },
  ) {
    await client.join(`school:${data.schoolId}`);
    return { event: 'joined', room: `school:${data.schoolId}` };
  }

  @SubscribeMessage('join:branch')
  async handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    await client.join(`branch:${data.branchId}`);
    return { event: 'joined', room: `branch:${data.branchId}` };
  }

  @SubscribeMessage('join:display')
  async handleJoinDisplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { schoolSlug: string },
  ) {
    await client.join(`display:${data.schoolSlug}`);
    return { event: 'joined', room: `display:${data.schoolSlug}` };
  }

  // ─── Server-side emit helpers ────────────────────────────────────────────

  emitToSchool(schoolId: string, event: string, data: unknown) {
    this.server.to(`school:${schoolId}`).emit(event, data);
  }

  emitToBranch(branchId: string, event: string, data: unknown) {
    this.server.to(`branch:${branchId}`).emit(event, data);
  }

  emitToDisplay(schoolSlug: string, event: string, data: unknown) {
    this.server.to(`display:${schoolSlug}`).emit(event, data);
  }

  /** Shaxsiy xabar — user:{userId} xonasiga yuborish */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ─── Domain events ───────────────────────────────────────────────────────

  emitScheduleUpdate(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'schedule:live', data);
  }

  emitNotification(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'notification:new', data);
  }

  emitAttendanceUpdate(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'attendance:updated', data);
  }

  emitPaymentReceived(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'payment:received', data);
  }

  /**
   * G'azna yopildi — faqat shu filial + School Admin xabar oladi.
   * School Admin `school:{schoolId}` xonasida ham turadi, shuning uchun
   * ikkala emit ham kerak emas: branch xonasiga yuborganda School Admin
   * ham oladi faqat u `branch:{branchId}` xonasiga qo'shilgan bo'lsa.
   * Ishonchli yo'l: branch → school (cross-posting) orqali yuborish.
   */
  emitShiftClosed(
    branchId: string,
    schoolId: string,
    data: { branchName: string; closedAt: string; totalIn: number; totalOut: number; balance: number },
  ) {
    // Filial xodimlari (kassir, filial menejer)
    this.emitToBranch(branchId, 'treasury:shift_closed', data);
    // School Admin va Director — maktab xonasiga ham yuborish
    this.emitToSchool(schoolId, 'treasury:shift_closed', { ...data, branchId });
  }

  emitLeadAssigned(branchId: string, assigneeUserId: string, data: unknown) {
    this.emitToBranch(branchId, 'crm:lead_assigned', data);
    this.emitToUser(assigneeUserId, 'crm:lead_assigned', data);
  }

  /** Shaxsiy xabar: yangi xabar keldi */
  emitDirectMessage(toUserId: string, data: unknown) {
    this.emitToUser(toUserId, 'message:new', data);
  }

  /** Shaxsiy bildirishnoma */
  emitPersonalNotification(userId: string, data: unknown) {
    this.emitToUser(userId, 'notification:personal', data);
  }
}
