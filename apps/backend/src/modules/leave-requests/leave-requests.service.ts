import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { IsString, IsDateString, IsOptional, IsIn, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { branchFilter } from '@/common/utils/branch-filter.util';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 'Kasal bo\'lgani uchun ta\'til so\'ralmoqda', minLength: 5, maxLength: 500 })
  @IsString() @MinLength(5) @MaxLength(500)
  reason: string;

  @ApiProperty({ example: '2026-05-01', description: 'Boshlanish sanasi (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-05-03', description: 'Tugash sanasi (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    enum: ['sick', 'personal', 'family', 'other'],
    example: 'sick',
    description: 'Ta\'til turi: sick | personal | family | other',
  })
  @IsOptional()
  @IsString()
  @IsIn(['sick', 'personal', 'family', 'other'])
  type?: string;
}

export class ReviewLeaveDto {
  @ApiProperty({ enum: ['approve', 'reject'], example: 'approve' })
  @IsString()
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ example: 'Ruxsat berildi', maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300)
  comment?: string;
}

// Roles that must approve a leave request (in order)
const APPROVER_ROLES = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER];

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  async create(dto: CreateLeaveRequestDto, currentUser: JwtPayload, branchCtx: string | null = null) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException("Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas");

    const schoolId = currentUser.schoolId!;

    // Find all approvers in this school (school_admin, vice_principal)
    const approvers = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL] as any },
        isActive: true,
        id: { not: currentUser.sub },
      },
      select: { id: true, role: true },
    });

    if (approvers.length === 0) {
      throw new BadRequestException("Maktabda tasdiqlash uchun mas'ul shaxs topilmadi");
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        schoolId,
        branchId: branchCtx ?? currentUser.branchId ?? undefined,
        requesterId: currentUser.sub,
        reason: dto.reason,
        startDate: start,
        endDate: end,
        approvals: {
          create: approvers.map((a) => ({
            approverId: a.id,
          })),
        },
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    // Notify approvers — DB insert + real-time Socket.IO push
    try {
      const notifTitle = "Yangi ta'til so'rovi";
      const notifBody = `${leaveRequest.requester.firstName} ${leaveRequest.requester.lastName} ta'til so'rov yubordi: ${dto.startDate} – ${dto.endDate}`;

      await this.prisma.notification.createMany({
        data: approvers.map((a) => ({
          schoolId,
          recipientId: a.id,
          title: notifTitle,
          body: notifBody,
          type: 'in_app',
        })),
      });

      // Real-time push: each approver gets an instant badge update
      approvers.forEach((a) => {
        this.eventsGateway?.emitToUser(a.id, 'notification:new', {
          title: notifTitle,
          body: notifBody,
          type: 'in_app',
        });
      });
    } catch { /* ignore */ }

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'LeaveRequest',
      entityId: leaveRequest.id,
      newData: { startDate: dto.startDate, endDate: dto.endDate, reason: dto.reason },
    });

    return leaveRequest;
  }

  async findAll(currentUser: JwtPayload, branchCtx: string | null = null, query?: { status?: string }) {
    const isApprover = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN].includes(currentUser.role as any);

    const where: any = { ...branchFilter(currentUser, branchCtx) };
    if (query?.status) where.status = query.status;

    // Non-approver sees only their own requests
    if (!isApprover) {
      where.requesterId = currentUser.sub;
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id, ...branchFilter(currentUser, branchCtx) },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException("So'rov topilmadi");

    const isApprover = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL].includes(currentUser.role as any);
    if (!isApprover && req.requesterId !== currentUser.sub) {
      throw new ForbiddenException("Bu so'rovni ko'rish huquqi yo'q");
    }
    return req;
  }

  async review(id: string, dto: ReviewLeaveDto, currentUser: JwtPayload) {
    const req = await this.findOne(id, currentUser);

    if (req.status === 'cancelled') throw new BadRequestException("Bekor qilingan so'rovni ko'rib bo'lmaydi");

    // Find this approver's approval record
    const myApproval = req.approvals.find((a: any) => a.approverId === currentUser.sub);
    if (!myApproval) throw new ForbiddenException("Siz bu so'rovni tasdiqlash/rad etish huquqiga ega emassiz");
    if (myApproval.status !== 'pending') throw new BadRequestException('Siz allaqachon qaror bildingiz');

    const newStatus = dto.action === 'approve' ? 'approved' : 'rejected';

    // Update this approval
    await this.prisma.leaveApproval.update({
      where: { id: myApproval.id },
      data: { status: newStatus as any, comment: dto.comment, decidedAt: new Date() },
    });

    // Recalculate overall status
    const updatedApprovals = await this.prisma.leaveApproval.findMany({
      where: { leaveRequestId: id },
    });

    let overallStatus: string = req.status as string;

    if (dto.action === 'reject') {
      // Any rejection → rejected
      overallStatus = 'rejected';
    } else {
      // All approved → approved
      const allApproved = updatedApprovals.every((a) => a.status === 'approved');
      if (allApproved) overallStatus = 'approved';
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: overallStatus as any },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        approvals: {
          include: { approver: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
      },
    });

    // H-1: Ta'til tasdiqlanganda davomat 'excused' yozuvi avtomatik yaratiladi
    if (overallStatus === 'approved') {
      try {
        const requester = await this.prisma.user.findUnique({
          where: { id: req.requesterId },
          select: { role: true },
        });

        if (requester?.role === 'student') {
          // O'quvchining sinfini olamiz
          const studentClass = await this.prisma.classStudent.findFirst({
            where: { studentId: req.requesterId },
            select: { classId: true },
          });
          const classId = studentClass?.classId;
          if (!classId) throw new Error('Student has no active class');

          const start = new Date(req.startDate);
          const end   = new Date(req.endDate);
          const cur   = new Date(start);

          while (cur <= end) {
            const dayStart = new Date(cur); dayStart.setHours(0, 0, 0, 0);
            const dayEnd   = new Date(cur); dayEnd.setHours(23, 59, 59, 999);

            const existing = await this.prisma.attendance.findFirst({
              where: { studentId: req.requesterId, date: { gte: dayStart, lte: dayEnd } },
            });

            if (existing) {
              await this.prisma.attendance.update({
                where: { id: existing.id },
                data: { status: 'excused' as any },
              });
            } else {
              await this.prisma.attendance.create({
                data: {
                  schoolId: currentUser.schoolId!,
                  studentId: req.requesterId,
                  classId,
                  date: dayStart,
                  status: 'excused' as any,
                  note: `Ta'til so'rovi #${id} tasdiqlandi`,
                },
              });
            }
            cur.setDate(cur.getDate() + 1);
          }
        }
      } catch { /* Davomat yozilmasa ham asosiy jarayon to'xtamaydi */ }
    }

    // Notify requester if final decision made
    if (overallStatus === 'approved' || overallStatus === 'rejected') {
      const notifTitle = overallStatus === 'approved' ? "✅ Ta'til so'rovi tasdiqlandi" : "❌ Ta'til so'rovi rad etildi";
      const notifBody = dto.comment ?? (overallStatus === 'approved' ? "So'rovingiz barcha tomondan tasdiqlandi" : "So'rovingiz rad etildi");
      try {
        await this.prisma.notification.create({
          data: {
            schoolId: currentUser.schoolId!,
            recipientId: req.requesterId,
            title: notifTitle,
            body: notifBody,
          },
        });
      } catch { /* ignore */ }

      // Real-time personal WebSocket notification to requester
      this.eventsGateway?.emitPersonalNotification(req.requesterId, {
        type: 'leave_request_decision',
        title: notifTitle,
        body: notifBody,
        status: overallStatus,
        leaveRequestId: id,
        decidedBy: {
          id: currentUser.sub,
          firstName: updated.approvals.find((a: any) => a.approverId === currentUser.sub)?.approver?.firstName,
          lastName: updated.approvals.find((a: any) => a.approverId === currentUser.sub)?.approver?.lastName,
        },
        decidedAt: new Date().toISOString(),
      });
    }

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'LeaveRequest',
      entityId: id,
      oldData: { status: req.status },
      newData: { status: overallStatus, action: dto.action, comment: dto.comment },
    });

    return updated;
  }

  async cancel(id: string, currentUser: JwtPayload) {
    const req = await this.findOne(id, currentUser);
    if (req.requesterId !== currentUser.sub) throw new ForbiddenException("Faqat o'z so'rovingizni bekor qila olasiz");
    if (req.status !== 'pending') throw new BadRequestException("Faqat kutilayotgan so'rovni bekor qilish mumkin");

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'cancelled' as any },
    });
  }
}
