import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsUUID, Min, IsDateString } from 'class-validator';
import * as crypto from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, PaymentStatus } from '@eduplatform/types';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';

// ─── Payme JSON-RPC error codes ────────────────────────────────────────────
const PAYME_ERRORS = {
  METHOD_NOT_FOUND:         { code: -32601, message: { ru: 'Метод не найден',               uz: 'Metod topilmadi' } },
  WRONG_AMOUNT:             { code: -31001, message: { ru: 'Неверная сумма',                uz: 'Noto\'g\'ri summa' } },
  OBJECT_NOT_FOUND:         { code: -31050, message: { ru: 'Объект не найден',              uz: 'Ob\'ekt topilmadi' } },
  TRANSACTION_NOT_FOUND:    { code: -31003, message: { ru: 'Транзакция не найдена',         uz: 'Tranzaksiya topilmadi' } },
  UNABLE_TO_PERFORM:        { code: -31008, message: { ru: 'Невозможно выполнить операцию', uz: 'Amaliyotni bajarish mumkin emas' } },
  CANT_DO_OPERATION:        { code: -31008, message: { ru: 'Нельзя выполнить операцию',     uz: 'Amaliyot bajarib bo\'lmaydi' } },
};

export class CreatePaymentDto {
  @IsUUID() studentId: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  async create(dto: CreatePaymentDto, currentUser: JwtPayload) {
    const payment = await this.prisma.payment.create({
      data: {
        schoolId: currentUser.schoolId!,
        studentId: dto.studentId,
        amount: dto.amount,
        currency: dto.currency ?? 'UZS',
        provider: (dto.provider as any) ?? 'cash',
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Payment',
      entityId: payment.id,
      newData: { amount: payment.amount, currency: payment.currency, studentId: payment.studentId },
    });

    return payment;
  }

  async getHistory(
    currentUser: JwtPayload,
    studentId?: string,
    classId?: string,
    status?: string,
    from?: string,
    to?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { schoolId: currentUser.schoolId! };
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z');
    }

    // Filter by classId via student's class membership
    let studentIds: string[] | undefined;
    if (classId) {
      const members = await this.prisma.classStudent.findMany({
        where: { classId, class: { schoolId: currentUser.schoolId! } },
        select: { studentId: true },
      });
      studentIds = members.map((m) => m.studentId);
      where.studentId = { in: studentIds };
    }

    const [payments, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data: payments, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getReport(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPaid, totalPending, totalOverdue, debtors, classes] = await this.prisma.$transaction([
      this.prisma.payment.aggregate({
        where: { schoolId, status: 'paid' as any, paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { schoolId, status: 'pending' as any },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { schoolId, status: 'overdue' as any },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { schoolId, status: { in: ['pending', 'overdue'] as any } },
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.class.findMany({
        where: { schoolId },
        include: {
          students: { select: { studentId: true } },
          _count: { select: { students: true } },
        },
        orderBy: [{ gradeLevel: 'asc' }, { name: 'asc' }],
      }),
    ]);

    // Build per-class stats
    const debtorStudentIds = new Set(debtors.map((d: any) => d.studentId));
    const classStats = await Promise.all(
      classes.map(async (cls: any) => {
        const classStudentIds = cls.students.map((cs: any) => cs.studentId);
        const classDebtors = debtors.filter((d: any) => classStudentIds.includes(d.studentId));
        const classDebt = classDebtors.reduce((sum: number, d: any) => sum + (d.amount ?? 0), 0);

        return {
          classId: cls.id,
          className: cls.name,
          gradeLevel: cls.gradeLevel,
          totalStudents: cls._count.students,
          debtorCount: classDebtors.length,
          totalDebt: classDebt,
          debtors: classDebtors.map((d: any) => ({
            id: d.id,
            studentId: d.studentId,
            studentName: `${d.student.firstName} ${d.student.lastName}`,
            amount: d.amount,
            status: d.status,
            dueDate: d.dueDate,
            description: d.description,
            createdAt: d.createdAt,
          })),
        };
      }),
    );

    return {
      monthly: { paid: totalPaid._sum.amount ?? 0 },
      pending: totalPending._sum.amount ?? 0,
      overdue: totalOverdue._sum.amount ?? 0,
      debtors,
      classStats,
    };
  }

  async markAsPaid(id: string, currentUser: JwtPayload) {
    const payment = await this.prisma.payment.findFirst({ where: { id, schoolId: currentUser.schoolId! } });
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    const updated = await this.prisma.payment.update({
      where: { id },
      data: { status: 'paid' as any, paidAt: new Date() },
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'Payment',
      entityId: id,
      oldData: { status: payment.status },
      newData: { status: 'paid', paidAt: updated.paidAt },
    });

    // ── Real-time broadcast ───────────────────────────────────────────────────
    if (currentUser.schoolId) {
      this.eventsGateway?.emitPaymentReceived(currentUser.schoolId, {
        paymentId: id,
        studentId: payment.studentId,
        amount: payment.amount,
      });
    }

    return updated;
  }

  // ─── Payme Webhook ────────────────────────────────────────────────────────
  /**
   * Payme uses JSON-RPC 2.0.
   * Authorization: Basic base64("Paycom:{PAYME_SECRET_KEY}")
   */
  async paymeWebhook(authHeader: string | undefined, body: any) {
    // 1. Signature validation
    this.validatePaymeAuth(authHeader);

    const { method, params, id } = body ?? {};

    try {
      switch (method) {
        case 'CheckPerformTransaction':
          return this.paymeCheckPerform(id, params);
        case 'CreateTransaction':
          return this.paymeCreateTransaction(id, params);
        case 'PerformTransaction':
          return this.paymePerformTransaction(id, params);
        case 'CancelTransaction':
          return this.paymeCancelTransaction(id, params);
        case 'CheckTransaction':
          return this.paymeCheckTransaction(id, params);
        case 'GetStatement':
          return this.paymeGetStatement(id, params);
        default:
          return { id, error: PAYME_ERRORS.METHOD_NOT_FOUND };
      }
    } catch (err) {
      this.logger.error('Payme webhook error', err);
      return { id, error: PAYME_ERRORS.UNABLE_TO_PERFORM };
    }
  }

  private validatePaymeAuth(authHeader: string | undefined): void {
    const secretKey = this.config.get<string>('PAYME_SECRET_KEY', '');
    if (!secretKey) {
      this.logger.warn('PAYME_SECRET_KEY not configured — skipping auth in dev');
      return;
    }
    if (!authHeader?.startsWith('Basic ')) {
      throw new UnauthorizedException('Payme: missing Authorization header');
    }
    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const expected = `Paycom:${secretKey}`;
    // Constant-time comparison to prevent timing attacks
    const decodedBuf  = Buffer.from(decoded);
    const expectedBuf = Buffer.from(expected);
    if (
      decodedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(decodedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Payme: invalid credentials');
    }
  }

  private async paymeCheckPerform(id: any, params: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: params?.account?.order_id },
    });
    if (!payment) return { id, error: PAYME_ERRORS.OBJECT_NOT_FOUND };

    // Amount is in tiyin (1 UZS = 100 tiyin)
    const amountInTiyin = Math.round(payment.amount * 100);
    if (params?.amount !== amountInTiyin) return { id, error: PAYME_ERRORS.WRONG_AMOUNT };

    return { id, result: { allow: true } };
  }

  private async paymeCreateTransaction(id: any, params: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: params?.account?.order_id },
    });
    if (!payment) return { id, error: PAYME_ERRORS.OBJECT_NOT_FOUND };

    const amountInTiyin = Math.round(payment.amount * 100);
    if (params?.amount !== amountInTiyin) return { id, error: PAYME_ERRORS.WRONG_AMOUNT };

    // Store Payme transaction ID on the payment record
    const now = Date.now();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: params.id,
        status: 'pending' as any,
        updatedAt: new Date(),
      },
    });

    return {
      id,
      result: {
        create_time: now,
        transaction:  params.id,
        state:        1, // created
      },
    };
  }

  private async paymePerformTransaction(id: any, params: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: params?.id },
    });
    if (!payment) return { id, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND };
    if ((payment.status as string) === 'paid') {
      return { id, result: { transaction: params.id, perform_time: payment.paidAt?.getTime() ?? Date.now(), state: 2 } };
    }

    const now = new Date();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'paid' as any, paidAt: now },
    });

    // Broadcast real-time event to school dashboard
    if (payment.schoolId) {
      this.eventsGateway?.emitPaymentReceived(payment.schoolId, {
        paymentId: payment.id,
        studentId: payment.studentId,
        amount: payment.amount,
      });
    }

    return {
      id,
      result: {
        transaction:  params.id,
        perform_time: now.getTime(),
        state:        2, // completed
      },
    };
  }

  private async paymeCancelTransaction(id: any, params: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: params?.id },
    });
    if (!payment) return { id, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND };
    if ((payment.status as string) === 'paid') {
      return { id, error: PAYME_ERRORS.CANT_DO_OPERATION };
    }

    const now = new Date();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'cancelled' as any, updatedAt: now },
    });

    return {
      id,
      result: {
        transaction:  params.id,
        cancel_time:  now.getTime(),
        state:        -1, // cancelled
      },
    };
  }

  private async paymeCheckTransaction(id: any, params: any) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: params?.id },
    });
    if (!payment) return { id, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND };

    const stateMap: Record<string, number> = { pending: 1, paid: 2, cancelled: -1, overdue: -2 };
    return {
      id,
      result: {
        create_time:  payment.createdAt.getTime(),
        perform_time: payment.paidAt?.getTime() ?? 0,
        cancel_time:  0,
        transaction:  params.id,
        state:        stateMap[(payment.status as string)] ?? 1,
        reason:       null,
      },
    };
  }

  private async paymeGetStatement(id: any, params: any) {
    const from  = new Date(params?.from ?? 0);
    const to    = new Date(params?.to   ?? Date.now());
    const payments = await this.prisma.payment.findMany({
      where: {
        providerOrderId: { not: null },
        createdAt: { gte: from, lte: to },
      },
    });

    return {
      id,
      result: {
        transactions: payments.map((p) => ({
          id:           p.providerOrderId,
          time:         p.createdAt.getTime(),
          amount:       Math.round(p.amount * 100),
          account:      { order_id: p.id },
          create_time:  p.createdAt.getTime(),
          perform_time: p.paidAt?.getTime() ?? 0,
          cancel_time:  0,
          transaction:  p.providerOrderId,
          state:        (p.status as string) === 'paid' ? 2 : 1,
          reason:       null,
        })),
      },
    };
  }

  // ─── Click Webhook ────────────────────────────────────────────────────────
  /**
   * Click uses form-encoded POST with MD5 signature.
   * sign_string = MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time)
   */
  async clickWebhook(body: any) {
    this.validateClickSignature(body);

    const { action, merchant_trans_id, amount, error } = body;

    if (Number(error) < 0) {
      this.logger.warn(`Click payment error: action=${action} error=${error}`);
      return { error: 0, error_note: 'Success' };
    }

    const payment = await this.prisma.payment.findFirst({
      where: { id: merchant_trans_id },
    });

    if (!payment) return { error: -5, error_note: 'Transaction not found' };

    // action=1: prepare (CheckPerformTransaction equivalent)
    if (Number(action) === 1) {
      const amountInSom = parseFloat(amount);
      if (Math.abs(amountInSom - payment.amount) > 1) {
        return { error: -2, error_note: 'Incorrect parameter amount' };
      }
      return { error: 0, error_note: 'Success', click_trans_id: body.click_trans_id, merchant_trans_id, merchant_prepare_id: payment.id };
    }

    // action=2: complete (PerformTransaction equivalent)
    if (Number(action) === 2) {
      if ((payment.status as string) !== 'paid') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'paid' as any, paidAt: new Date(), providerOrderId: String(body.click_trans_id) },
        });
        // Broadcast real-time event to school dashboard
        if (payment.schoolId) {
          this.eventsGateway?.emitPaymentReceived(payment.schoolId, {
            paymentId: payment.id,
            studentId: payment.studentId,
            amount: payment.amount,
          });
        }
      }
      return { error: 0, error_note: 'Success', click_trans_id: body.click_trans_id, merchant_trans_id, merchant_confirm_id: payment.id };
    }

    return { error: -8, error_note: 'Error in request from click' };
  }

  private validateClickSignature(body: any): void {
    const secretKey = this.config.get<string>('CLICK_SECRET_KEY', '');
    if (!secretKey) {
      this.logger.warn('CLICK_SECRET_KEY not configured — skipping signature check in dev');
      return;
    }
    const { click_trans_id, service_id, merchant_trans_id, amount, action, sign_time, sign_string } = body;
    const raw = `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;
    const expected = crypto.createHash('md5').update(raw).digest('hex');
    if (expected !== sign_string) {
      throw new UnauthorizedException('Click: invalid signature');
    }
  }
}
