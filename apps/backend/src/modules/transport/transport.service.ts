import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import {
  IsString, IsOptional, IsInt, IsBoolean, Min, Max, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { branchFilter } from '@/common/utils/branch-filter.util';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export class CreateRouteDto {
  @IsString() @MaxLength(100)
  name: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string;

  @IsOptional()
  stops?: string[];

  @IsString() @MaxLength(10)
  departureTime: string; // "07:30"

  @IsString() @MaxLength(10)
  arrivalTime: string;   // "08:15"

  @IsOptional() @IsString() @MaxLength(100)
  driverName?: string;

  @IsOptional() @IsString() @MaxLength(30)
  driverPhone?: string;

  @IsOptional() @IsString() @MaxLength(30)
  vehicleNumber?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  @Type(() => Number)
  capacity?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateRouteDto {
  @IsOptional() @IsString() @MaxLength(100)
  name?: string;

  @IsOptional() @IsString() @MaxLength(300)
  description?: string;

  @IsOptional()
  stops?: string[];

  @IsOptional() @IsString() @MaxLength(10)
  departureTime?: string;

  @IsOptional() @IsString() @MaxLength(10)
  arrivalTime?: string;

  @IsOptional() @IsString() @MaxLength(100)
  driverName?: string;

  @IsOptional() @IsString() @MaxLength(30)
  driverPhone?: string;

  @IsOptional() @IsString() @MaxLength(30)
  vehicleNumber?: string;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  @Type(() => Number)
  capacity?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class AssignStudentDto {
  @IsString()
  studentId: string;

  @IsOptional() @IsString() @MaxLength(100)
  stopName?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const MANAGER_ROLES = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL];

@Injectable()
export class TransportService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Routes CRUD ──────────────────────────────────────────────────────────

  async getRoutes(currentUser: JwtPayload, branchCtx: string | null = null) {
    const routes = await this.prisma.transportRoute.findMany({
      where: branchFilter(currentUser, branchCtx),
      include: {
        _count: { select: { assignments: true } },
      },
      orderBy: { name: 'asc' },
    });
    return routes.map(r => ({
      ...r,
      studentCount: r._count.assignments,
    }));
  }

  async getRoute(id: string, currentUser: JwtPayload, branchCtx: string | null = null) {
    const route = await this.prisma.transportRoute.findFirst({
      where: { id, ...branchFilter(currentUser, branchCtx) },
      include: {
        assignments: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!route) throw new NotFoundException('Marshrut topilmadi');
    return route;
  }

  async createRoute(dto: CreateRouteDto, currentUser: JwtPayload, branchCtx: string | null = null) {
    const schoolId = currentUser.schoolId!;

    // Check duplicate name
    const existing = await this.prisma.transportRoute.findFirst({
      where: { schoolId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Bu nomli marshrut allaqachon mavjud');

    return this.prisma.transportRoute.create({
      data: {
        schoolId,
        branchId: branchCtx ?? currentUser.branchId ?? undefined,
        name: dto.name,
        description: dto.description,
        stops: (dto.stops ?? []) as any,
        departureTime: dto.departureTime,
        arrivalTime: dto.arrivalTime,
        driverName: dto.driverName,
        driverPhone: dto.driverPhone,
        vehicleNumber: dto.vehicleNumber,
        capacity: dto.capacity ?? 30,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRoute(id: string, dto: UpdateRouteDto, currentUser: JwtPayload) {
    const route = await this.prisma.transportRoute.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!route) throw new NotFoundException('Marshrut topilmadi');

    if (dto.name && dto.name !== route.name) {
      const dup = await this.prisma.transportRoute.findFirst({
        where: {
          schoolId: currentUser.schoolId!,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (dup) throw new ConflictException('Bu nomli marshrut allaqachon mavjud');
    }

    const data: any = {};
    if (dto.name !== undefined)          data.name = dto.name;
    if (dto.description !== undefined)   data.description = dto.description;
    if (dto.stops !== undefined)         data.stops = dto.stops;
    if (dto.departureTime !== undefined) data.departureTime = dto.departureTime;
    if (dto.arrivalTime !== undefined)   data.arrivalTime = dto.arrivalTime;
    if (dto.driverName !== undefined)    data.driverName = dto.driverName;
    if (dto.driverPhone !== undefined)   data.driverPhone = dto.driverPhone;
    if (dto.vehicleNumber !== undefined) data.vehicleNumber = dto.vehicleNumber;
    if (dto.capacity !== undefined)      data.capacity = dto.capacity;
    if (dto.isActive !== undefined)      data.isActive = dto.isActive;

    return this.prisma.transportRoute.update({ where: { id }, data });
  }

  async removeRoute(id: string, currentUser: JwtPayload) {
    const route = await this.prisma.transportRoute.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!route) throw new NotFoundException('Marshrut topilmadi');

    const assignedCount = await this.prisma.transportStudent.count({
      where: { routeId: id },
    });
    if (assignedCount > 0) {
      throw new BadRequestException(
        `Bu marshrutga ${assignedCount} ta o'quvchi biriktirilgan. Avval ularni olib tashlang.`,
      );
    }

    await this.prisma.transportRoute.delete({ where: { id } });
    return { message: 'Marshrut o\'chirildi' };
  }

  // ── Student Assignment ────────────────────────────────────────────────────

  async assignStudent(routeId: string, dto: AssignStudentDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    const route = await this.prisma.transportRoute.findFirst({
      where: { id: routeId, schoolId },
    });
    if (!route) throw new NotFoundException('Marshrut topilmadi');

    const student = await this.prisma.user.findFirst({
      where: { id: dto.studentId, schoolId, role: UserRole.STUDENT as any },
    });
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    // Check capacity
    const currentCount = await this.prisma.transportStudent.count({
      where: { routeId },
    });
    if (currentCount >= route.capacity) {
      throw new BadRequestException(`Marshrut to'la (${route.capacity} ta o'rin)`);
    }

    // Check already assigned to this route
    const exists = await this.prisma.transportStudent.findFirst({
      where: { routeId, studentId: dto.studentId },
    });
    if (exists) throw new ConflictException('O\'quvchi bu marshrutga allaqachon biriktirilgan');

    return this.prisma.transportStudent.create({
      data: {
        schoolId,
        routeId,
        studentId: dto.studentId,
        stopName: dto.stopName,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeStudentFromRoute(routeId: string, studentId: string, currentUser: JwtPayload) {
    const assignment = await this.prisma.transportStudent.findFirst({
      where: { routeId, studentId, schoolId: currentUser.schoolId! },
    });
    if (!assignment) throw new NotFoundException('Biriktirilgan o\'quvchi topilmadi');

    await this.prisma.transportStudent.delete({ where: { id: assignment.id } });
    return { message: 'O\'quvchi marshrutdan olib tashlandi' };
  }

  async getStudentsByRoute(routeId: string, currentUser: JwtPayload) {
    const route = await this.prisma.transportRoute.findFirst({
      where: { id: routeId, schoolId: currentUser.schoolId! },
    });
    if (!route) throw new NotFoundException('Marshrut topilmadi');

    return this.prisma.transportStudent.findMany({
      where: { routeId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const [totalRoutes, activeRoutes, totalAssigned] = await this.prisma.$transaction([
      this.prisma.transportRoute.count({ where: { schoolId } }),
      this.prisma.transportRoute.count({ where: { schoolId, isActive: true } }),
      this.prisma.transportStudent.count({ where: { schoolId } }),
    ]);
    return { totalRoutes, activeRoutes, totalAssigned };
  }

  /** My route — for students / parents */
  async getMyRoute(currentUser: JwtPayload) {
    const assignment = await this.prisma.transportStudent.findFirst({
      where: { studentId: currentUser.sub, schoolId: currentUser.schoolId! },
      include: {
        route: true,
      },
    });
    if (!assignment) return null;
    return assignment.route;
  }
}
