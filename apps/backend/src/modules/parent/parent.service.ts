import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { IsString, IsDateString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class RequestChildLeaveDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString() @MinLength(5) @MaxLength(500)
  reason: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ParentService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Access check ─────────────────────────────────────────────────────────

  async verifyParentAccess(parentId: string, studentId: string, schoolId: string): Promise<void> {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, schoolId, role: 'student' },
    });
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    const relation = await this.prisma.parentStudent.findFirst({
      where: { parentId, studentId },
    });
    if (!relation) throw new ForbiddenException('Siz bu o\'quvchining ota-onasi emassiz');
  }

  // ── Read endpoints ────────────────────────────────────────────────────────

  async getChildren(currentUser: JwtPayload) {
    const rows = await this.prisma.parentStudent.findMany({
      where: {
        parentId: currentUser.sub,
        student: { schoolId: currentUser.schoolId!, isActive: true },
      },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, avatarUrl: true,
            studentClasses: {
              include: { class: { select: { id: true, name: true, gradeLevel: true } } },
            },
          },
        },
      },
    });

    // Flatten: return student-shaped objects so consumers can use children[n].id
    // as the studentId for /parent/child/:studentId/* endpoints.
    return rows.map((r) => {
      const studentClasses = r.student.studentClasses.map((sc) => sc.class);
      return {
        id: r.student.id,
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        avatarUrl: r.student.avatarUrl,
        // Convenience: primary class (first enrollment) for UI display
        class: studentClasses[0] ?? null,
        classes: studentClasses,
      };
    });
  }

  async getChild(studentId: string, currentUser: JwtPayload) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);
    return this.prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true, firstName: true, lastName: true, avatarUrl: true, phone: true,
        studentClasses: {
          include: { class: { select: { id: true, name: true, gradeLevel: true } } },
        },
      },
    });
  }

  async getChildAttendance(studentId: string, currentUser: JwtPayload, limit = 30) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);
    return this.prisma.attendance.findMany({
      where: { studentId, schoolId: currentUser.schoolId! },
      include: { schedule: { include: { subject: { select: { name: true } } } } },
      orderBy: { date: 'desc' },
      take: +limit,
    });
  }

  async getChildGrades(studentId: string, currentUser: JwtPayload) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);
    return this.prisma.grade.findMany({
      where: { studentId, schoolId: currentUser.schoolId! },
      include: { subject: { select: { name: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getChildSchedule(studentId: string, currentUser: JwtPayload) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);
    const enrollment = await this.prisma.classStudent.findFirst({
      where: { studentId, class: { schoolId: currentUser.schoolId! } },
    });
    if (!enrollment) return [];
    return this.prisma.schedule.findMany({
      where: { classId: enrollment.classId, schoolId: currentUser.schoolId! },
      include: { subject: { include: { teacher: { select: { firstName: true, lastName: true } } } } },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });
  }

  async getChildPayments(studentId: string, currentUser: JwtPayload) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);
    return this.prisma.payment.findMany({
      where: { studentId, schoolId: currentUser.schoolId! },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Ota-ona farzand nomidan ta'til so'rovi yuborishi
   */
  async requestChildLeave(
    studentId: string,
    dto: RequestChildLeaveDto,
    currentUser: JwtPayload,
  ) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('Tugash sanasi boshlanishdan oldin bo\'lishi mumkin emas');

    const schoolId = currentUser.schoolId!;

    // Find approvers
    const approvers = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL] as any },
        isActive: true,
      },
      select: { id: true, role: true },
    });

    if (approvers.length === 0) {
      throw new BadRequestException('Maktabda tasdiqlash uchun mas\'ul shaxs topilmadi');
    }

    // Get student info for notification body
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true },
    });

    // Create leave request on behalf of student
    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        schoolId,
        branchId: currentUser.branchId!,
        requesterId: studentId,       // so'rovchi — o'quvchi
        reason: `[Ota-ona so'rovi] ${dto.reason}`,
        startDate: start,
        endDate: end,
        approvals: {
          create: approvers.map(a => ({ approverId: a.id })),
        },
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notify approvers
    try {
      await this.prisma.notification.createMany({
        data: approvers.map(a => ({
          schoolId,
          branchId: currentUser.branchId!,
          recipientId: a.id,
          title: "Yangi ta'til so'rovi (ota-ona)",
          body: `${student?.firstName} ${student?.lastName} uchun ota-ona ta'til so'rov yubordi: ${dto.startDate} – ${dto.endDate}`,
        })),
      });
    } catch { /* ignore */ }

    return leaveRequest;
  }

  /**
   * Ota-ona farzandining EduCoin balansi, reytingi va tarixi
   */
  async getChildCoins(studentId: string, currentUser: JwtPayload, limit = 30) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);

    const [student, history, classmates] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentId },
        select: { coins: true },
      }),
      this.prisma.coinTransaction.findMany({
        where:   { userId: studentId, schoolId: currentUser.schoolId! },
        orderBy: { createdAt: 'desc' },
        take:    +limit,
      }),
      this.prisma.user.findMany({
        where:   { schoolId: currentUser.schoolId!, role: 'student' as any, isActive: true },
        select:  { id: true, coins: true },
        orderBy: { coins: 'desc' },
      }),
    ]);

    const rank = classmates.findIndex(s => s.id === studentId) + 1;

    return {
      balance: student?.coins ?? 0,
      rank:    rank > 0 ? rank : classmates.length,
      total:   classmates.length,
      history,
    };
  }

  /**
   * Ota-ona o'z farzandining ta'til so'rovlarini ko'rishi
   */
  async getChildLeaveRequests(studentId: string, currentUser: JwtPayload) {
    await this.verifyParentAccess(currentUser.sub, studentId, currentUser.schoolId!);
    return this.prisma.leaveRequest.findMany({
      where: { requesterId: studentId, schoolId: currentUser.schoolId! },
      include: {
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
