import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Optional,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AuditService, AuditAction } from '@/common/audit/audit.service';
import { CreateClubDto, UpdateClubDto } from './dto/clubs.dto';
import { branchFilter } from '@/common/utils/branch-filter.util';

const CLUB_INCLUDE = {
  leader: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { members: true } },
} as const;

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

    // Teacher faqat o'zi rahbar bo'lgan to'garaklarni ko'radi (agar teacher bo'lsa)
    // lekin list hammaga ko'rinadi

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
      include: {
        club: { include: CLUB_INCLUDE },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({ ...m.club, joinedAt: m.joinedAt }));
  }

  // ─── My led clubs (teacher) ───────────────────────────────────────────────
  async findLed(currentUser: JwtPayload) {
    return this.prisma.club.findMany({
      where: { schoolId: currentUser.schoolId!, leaderId: currentUser.sub },
      include: { ...CLUB_INCLUDE, members: { include: { student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } } },
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
    const club = await this.prisma.club.create({
      data: { ...dto, schoolId: currentUser.schoolId!, branchId: branchCtx ?? currentUser.branchId ?? undefined },
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

    // Faqat admin yoki rahbar tahrirlashi mumkin
    const isAdmin = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL].includes(currentUser.role as UserRole);
    const isLeader = club.leaderId === currentUser.sub;
    if (!isAdmin && !isLeader) throw new ForbiddenException('Faqat admin yoki rahbar tahrirlay oladi');

    return this.prisma.club.update({
      where: { id },
      data: dto,
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

  // ─── Join club ────────────────────────────────────────────────────────────
  async join(id: string, currentUser: JwtPayload) {
    const club = await this.prisma.club.findFirst({
      where: { id, schoolId: currentUser.schoolId!, isActive: true },
      include: { _count: { select: { members: true } } },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    // Chegarani tekshir
    if (club.maxMembers && club._count.members >= club.maxMembers) {
      throw new BadRequestException('To\'garakda joy qolmagan');
    }

    // Allaqachon a'zo ekanini tekshir
    const existing = await this.prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
    });
    if (existing) throw new BadRequestException('Siz allaqachon bu to\'garak a\'zosisiz');

    const member = await this.prisma.clubMember.create({
      data: { clubId: id, studentId: currentUser.sub },
      include: { club: { select: { id: true, name: true } } },
    });

    return member;
  }

  // ─── Leave club ───────────────────────────────────────────────────────────
  async leave(id: string, currentUser: JwtPayload) {
    const member = await this.prisma.clubMember.findUnique({
      where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
    });
    if (!member) throw new NotFoundException('Siz bu to\'garak a\'zosi emassiz');

    await this.prisma.clubMember.delete({
      where: { clubId_studentId: { clubId: id, studentId: currentUser.sub } },
    });

    return { message: 'To\'garakdan chiqildi' };
  }

  // ─── Remove a member (admin or leader) ───────────────────────────────────
  async removeMember(clubId: string, studentId: string, currentUser: JwtPayload) {
    const club = await this.prisma.club.findFirst({
      where: { id: clubId, schoolId: currentUser.schoolId! },
    });
    if (!club) throw new NotFoundException('To\'garak topilmadi');

    const isAdmin = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL].includes(currentUser.role as UserRole);
    const isLeader = club.leaderId === currentUser.sub;
    if (!isAdmin && !isLeader) throw new ForbiddenException('Ruxsat yo\'q');

    await this.prisma.clubMember.deleteMany({ where: { clubId, studentId } });
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
}
