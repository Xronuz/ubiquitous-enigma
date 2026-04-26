import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Optional, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AuditService, AuditAction } from '@/common/audit/audit.service';
import { CreateClubDto, UpdateClubDto, ClubJoinRequestDto } from './dto/clubs.dto';
import { branchFilter } from '@/common/utils/branch-filter.util';

const CLUB_INCLUDE = {
  leader: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { members: true } },
} as const;

/** Convert "HH:mm" → minutes from midnight for numeric comparison */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Returns true if two [start, end] intervals overlap (exclusive end boundary) */
function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return toMinutes(s1) < toMinutes(e2) && toMinutes(s2) < toMinutes(e1);
}

@Injectable()
export class ClubsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
  ) {}

  // ─── List all clubs ───────────────────────────────────────────────────────
  async findAll(currentUser: JwtPayload, branchCtx: string | null = null, category?: string) {
    const where: any = { ...branchFilter(currentUser, branchCtx), isActive: true };
    if (category) where.category = category;

    return this.prisma.club.findMany({
      where,
      include: CLUB_INCLUDE,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  // ─── My joined clubs (student) ────────────────────────────────────────────
  async findMine(currentUser: JwtPayload) {
    const memberships = await this.prisma.clubMember.findMany({
      where: { studentId: currentUser.sub },
      include: { club: { include: CLUB_INCLUDE } },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.club, joinedAt: m.joinedAt }));
  }

  // ─── My pending join requests (student) ───────────────────────────────────
  async findMyRequests(currentUser: JwtPayload) {
    return this.prisma.clubJoinRequest.findMany({
      where: { studentId: currentUser.sub },
      include: { club: { include: CLUB_INCLUDE } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── My led clubs (teacher) ───────────────────────────────────────────────
  async findLed(currentUser: JwtPayload) {
    return this.prisma.club.findMany({
      where: { schoolId: currentUser.schoolId!, leaderId: currentUser.sub },
      include: {
        ...CLUB_INCLUDE,
        members: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Single club detail ───────────────────────────────────────────────────
  async findOne(id: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    const club = await this.prisma.club.findFirst({
      where: { id, ...branchFilter(currentUser, branchCtx) },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        members: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { members: true } },
      },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');
    return club;
  }

  // ─── Create ───────────────────────────────────────────────────────────────
  async create(dto: CreateClubDto, currentUser: JwtPayload, branchCtx: string | null = null) {
    const { scheduleDays, ...rest } = dto;
    const club = await this.prisma.club.create({
      data: {
        ...rest,
        scheduleDays: (scheduleDays ?? []) as any,
        schoolId: currentUser.schoolId!,
        branchId: branchCtx ?? currentUser.branchId ?? undefined,
      },
      include: CLUB_INCLUDE,
    });

    await this.auditService?.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId!,
      action: 'create' as AuditAction,
      entity: 'Club',
      entityId: club.id,
      newData: { name: club.name, category: club.category },
    });

    return club;
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateClubDto, currentUser: JwtPayload) {
    const club = await this.prisma.club.findFirst({
      where: { id, ...branchFilter(currentUser) },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    const isAdmin = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL].includes(currentUser.role as UserRole);
    const isLeader = club.leaderId === currentUser.sub;
    if (!isAdmin && !isLeader) throw new ForbiddenException('Faqat admin yoki rahbar tahrirlay oladi');

    const { scheduleDays, ...rest } = dto;
    return this.prisma.club.update({
      where: { id },
      data: {
        ...rest,
        ...(scheduleDays !== undefined ? { scheduleDays: scheduleDays as any } : {}),
      },
      include: CLUB_INCLUDE,
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  async remove(id: string, currentUser: JwtPayload) {
    const club = await this.prisma.club.findFirst({
      where: { id, ...branchFilter(currentUser) },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    await this.prisma.club.delete({ where: { id } });

    await this.auditService?.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId!,
      action: 'delete' as AuditAction,
      entity: 'Club',
      entityId: id,
      oldData: { name: club.name },
    });

    return { message: 'To\'garak o\'chirildi' };
  }

  // ─── Request to join (PENDING flow) ──────────────────────────────────────
  async requestJoin(id: string, dto: ClubJoinRequestDto, currentUser: JwtPayload) {
    const club = await this.prisma.club.findFirst({
      where: { id, schoolId: currentUser.schoolId!, isActive: true },
      include: { _count: { select: { members: true } } },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    if (club.maxMembers && club._count.members >= club.maxMembers) {
      throw new BadRequestException('To\'garakda joy qolmagan');
    }

    // Already a full member
    const alreadyMember = await this.prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
    });
    if (alreadyMember) throw new ConflictException('Siz allaqachon bu to\'garak a\'zosisiz');

    // Already has a pending/approved request
    const existingReq = await this.prisma.clubJoinRequest.findUnique({
      where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
    });
    if (existingReq) {
      if (existingReq.status === 'PENDING') throw new ConflictException('Arizangiz ko\'rib chiqilmoqda');
      if (existingReq.status === 'APPROVED') throw new ConflictException('Arizangiz allaqachon tasdiqlangan');
      // REJECTED — allow re-applying by updating the record
      return this.prisma.clubJoinRequest.update({
        where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
        data: { status: 'PENDING', message: dto.message, updatedAt: new Date() },
        include: { club: { select: { id: true, name: true } } },
      });
    }

    // Schedule conflict check against current active memberships
    await this.checkScheduleConflict(currentUser.sub, club);

    return this.prisma.clubJoinRequest.create({
      data: { clubId: id, studentId: currentUser.sub, message: dto.message },
      include: { club: { select: { id: true, name: true } } },
    });
  }

  // ─── Approve a join request (leader or admin) ─────────────────────────────
  async approveRequest(clubId: string, requestId: string, currentUser: JwtPayload) {
    const req = await this.prisma.clubJoinRequest.findFirst({
      where: { id: requestId, clubId },
      include: { club: { include: { _count: { select: { members: true } } } } },
    });
    if (!req) throw new NotFoundException('Ariza topilmadi');
    if (req.status !== 'PENDING') throw new BadRequestException('Ariza allaqachon ko\'rib chiqilgan');

    this.assertLeaderOrAdmin(req.club, currentUser);

    if (req.club.maxMembers && req.club._count.members >= req.club.maxMembers) {
      throw new BadRequestException('To\'garakda joy qolmagan');
    }

    // Final schedule conflict check at approval time
    await this.checkScheduleConflict(req.studentId, req.club);

    const [, member] = await this.prisma.$transaction([
      this.prisma.clubJoinRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', updatedAt: new Date() },
      }),
      this.prisma.clubMember.create({
        data: { clubId, studentId: req.studentId },
        include: { club: { select: { id: true, name: true } }, student: { select: { id: true, firstName: true, lastName: true } } },
      }),
    ]);

    return member;
  }

  // ─── Reject a join request (leader or admin) ──────────────────────────────
  async rejectRequest(clubId: string, requestId: string, currentUser: JwtPayload) {
    const req = await this.prisma.clubJoinRequest.findFirst({
      where: { id: requestId, clubId },
      include: { club: true },
    });
    if (!req) throw new NotFoundException('Ariza topilmadi');
    if (req.status !== 'PENDING') throw new BadRequestException('Ariza allaqachon ko\'rib chiqilgan');

    this.assertLeaderOrAdmin(req.club, currentUser);

    return this.prisma.clubJoinRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', updatedAt: new Date() },
    });
  }

  // ─── List join requests for a club (leader/admin) ─────────────────────────
  async getJoinRequests(clubId: string, currentUser: JwtPayload, status?: string) {
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, schoolId: currentUser.schoolId! },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    this.assertLeaderOrAdmin(club, currentUser);

    return this.prisma.clubJoinRequest.findMany({
      where: { clubId, ...(status ? { status: status as any } : {}) },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Leave club ───────────────────────────────────────────────────────────
  async leave(id: string, currentUser: JwtPayload) {
    const member = await this.prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
    });
    if (!member) throw new NotFoundException('Siz bu to\'garak a\'zosi emassiz');

    await this.prisma.$transaction([
      this.prisma.clubMember.delete({
        where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
      }),
      // Reset request status so student can rejoin later
      this.prisma.clubJoinRequest.deleteMany({
        where: { clubId: id, studentId: currentUser.sub },
      }),
    ]);

    return { message: 'To\'garakdan chiqildi' };
  }

  // ─── Remove a member (admin or leader) ───────────────────────────────────
  async removeMember(clubId: string, studentId: string, currentUser: JwtPayload) {
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, schoolId: currentUser.schoolId! },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    this.assertLeaderOrAdmin(club, currentUser);

    await this.prisma.$transaction([
      this.prisma.clubMember.deleteMany({ where: { clubId, studentId } }),
      this.prisma.clubJoinRequest.deleteMany({ where: { clubId, studentId } }),
    ]);

    return { message: 'A\'zo chiqarildi' };
  }

  // ─── Get members list ─────────────────────────────────────────────────────
  async getMembers(id: string, currentUser: JwtPayload) {
    const club = await this.prisma.club.findFirst({
      where: { id, ...branchFilter(currentUser) },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    return this.prisma.clubMember.findMany({
      where: { clubId: id },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private assertLeaderOrAdmin(club: { leaderId: string }, currentUser: JwtPayload) {
    const isAdmin = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.DIRECTOR].includes(currentUser.role as UserRole);
    const isLeader = club.leaderId === currentUser.sub;
    if (!isAdmin && !isLeader) throw new ForbiddenException('Ruxsat yo\'q');
  }

  /**
   * Checks whether the student already belongs to a club whose scheduled days
   * and times overlap with the target club. Only runs when the target club has
   * structured schedule data (scheduleDays + start/end times).
   */
  private async checkScheduleConflict(
    studentId: string,
    targetClub: { id: string; scheduleDays: string[]; scheduleStartTime: string | null; scheduleEndTime: string | null },
  ) {
    if (
      !targetClub.scheduleDays?.length ||
      !targetClub.scheduleStartTime ||
      !targetClub.scheduleEndTime
    ) {
      return; // Not enough structured data — skip conflict check
    }

    const memberships = await this.prisma.clubMember.findMany({
      where: { studentId },
      include: {
        club: {
          select: {
            id: true, name: true,
            scheduleDays: true, scheduleStartTime: true, scheduleEndTime: true,
          },
        },
      },
    });

    for (const { club } of memberships) {
      if (club.id === targetClub.id) continue;
      if (!club.scheduleDays?.length || !club.scheduleStartTime || !club.scheduleEndTime) continue;

      const sharedDays = (club.scheduleDays as string[]).filter(
        (d) => (targetClub.scheduleDays as string[]).includes(d),
      );
      if (!sharedDays.length) continue;

      if (timesOverlap(targetClub.scheduleStartTime, targetClub.scheduleEndTime, club.scheduleStartTime, club.scheduleEndTime)) {
        throw new ConflictException(
          `Jadval to'qnashuvi: "${club.name}" to'garagi bilan vaqt mos keladi (${sharedDays.join(', ')} ${club.scheduleStartTime}–${club.scheduleEndTime})`,
        );
      }
    }
  }
}
