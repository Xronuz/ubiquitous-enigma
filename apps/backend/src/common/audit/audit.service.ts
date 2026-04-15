import { Injectable, Logger, Optional } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export';

export interface AuditLogOptions {
  userId?: string;
  schoolId?: string;
  action: AuditAction;
  entity: string;      // e.g. 'User', 'Grade', 'Attendance'
  entityId?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * AuditService — muhim operatsiyalarni audit_logs jadvaliga yozadi
 *
 * Foydalanish:
 *   await this.auditService.log({
 *     userId: currentUser.sub,
 *     schoolId: currentUser.schoolId,
 *     action: 'create',
 *     entity: 'User',
 *     entityId: newUser.id,
 *     newData: { email: newUser.email, role: newUser.role },
 *   });
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Audit log yozish — xatolik bo'lsa asosiy operatsiyani bloklamas
   */
  async log(opts: AuditLogOptions): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: opts.userId,
          schoolId: opts.schoolId,
          action: opts.action as any,
          entity: opts.entity,
          entityId: opts.entityId,
          oldData: opts.oldData as any,
          newData: opts.newData as any,
          ipAddress: opts.ipAddress,
          userAgent: opts.userAgent,
        },
      });
      // Real-time: school_admin dashboard'iga yangi audit log keldi signal
      if (opts.schoolId) {
        this.eventsGateway?.emitToSchool(opts.schoolId, 'audit:new', {
          action: opts.action,
          entity: opts.entity,
          entityId: opts.entityId,
        });
      }
    } catch (err) {
      // Audit log xatosi asosiy biznes logikani bloklamamasligi kerak
      this.logger.error('Audit log yozishda xato:', err);
    }
  }

  /**
   * Audit loglarni Excel formatida eksport qilish
   */
  async exportToExcel(
    schoolId: string,
    opts: { entity?: string; action?: AuditAction; from?: string; to?: string } = {},
  ): Promise<Buffer> {
    const where: any = { schoolId };
    if (opts.entity) where.entity = opts.entity;
    if (opts.action) where.action = opts.action;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to)   where.createdAt.lte = new Date(opts.to);
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Audit Log');

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } },
    };

    sheet.columns = [
      { header: 'Vaqt',        key: 'createdAt',  width: 22 },
      { header: 'Amal',        key: 'action',     width: 12 },
      { header: 'Ob\'ekt',     key: 'entity',     width: 18 },
      { header: 'Ob\'ekt ID',  key: 'entityId',   width: 38 },
      { header: 'Foydalanuvchi', key: 'user',     width: 30 },
      { header: 'Rol',         key: 'role',       width: 18 },
      { header: 'IP',          key: 'ip',         width: 16 },
      { header: 'Eski ma\'lumot', key: 'old',     width: 50 },
      { header: 'Yangi ma\'lumot', key: 'new',    width: 50 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell(cell => { Object.assign(cell.style, headerStyle); });

    for (const log of logs) {
      sheet.addRow({
        createdAt: new Date(log.createdAt).toLocaleString('uz-UZ'),
        action:    log.action,
        entity:    log.entity,
        entityId:  log.entityId ?? '',
        user:      log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : '',
        role:      log.user?.role ?? '',
        ip:        log.ipAddress ?? '',
        old:       log.oldData ? JSON.stringify(log.oldData) : '',
        new:       log.newData ? JSON.stringify(log.newData) : '',
      });
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Maktab bo'yicha audit log tarixi
   */
  async getSchoolLogs(
    schoolId: string,
    opts: {
      page?: number;
      limit?: number;
      entity?: string;
      action?: AuditAction;
      userId?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: any = { schoolId };
    if (opts.entity) where.entity = opts.entity;
    if (opts.action) where.action = opts.action;
    if (opts.userId) where.userId = opts.userId;
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Super admin — barcha maktablar bo'yicha
   */
  async getAllLogs(opts: {
    page?: number;
    limit?: number;
    schoolId?: string;
    entity?: string;
    action?: AuditAction;
  } = {}) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (opts.schoolId) where.schoolId = opts.schoolId;
    if (opts.entity) where.entity = opts.entity;
    if (opts.action) where.action = opts.action;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
          school: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
