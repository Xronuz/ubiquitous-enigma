import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { IsString, IsOptional, IsEmail, IsBoolean, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ModuleName } from '@eduplatform/types';

export class CreateSchoolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug faqat kichik harf, raqam va defis bo\'lishi kerak' })
  @MaxLength(60)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  subscriptionTier?: string;
}

export class ToggleModuleDto {
  @IsString()
  moduleName: ModuleName;

  @IsBoolean()
  isEnabled: boolean;

  @IsOptional()
  configJson?: Record<string, any>;
}

// Core modules that are always enabled
const CORE_MODULES: ModuleName[] = [
  ModuleName.AUTH, ModuleName.USERS, ModuleName.CLASSES,
  ModuleName.SCHEDULE, ModuleName.NOTIFICATIONS, ModuleName.MESSAGING, ModuleName.REPORTS,
];

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchools(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] }
      : {};

    const [schools, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        skip,
        take: limit,
        include: {
          subscription: true,
          _count: { select: { users: true, classes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.school.count({ where }),
    ]);
    return { data: schools, meta: { total, page, limit } };
  }

  async getSchool(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { modules: true, subscription: true },
    });
    if (!school) throw new NotFoundException('Maktab topilmadi');
    return school;
  }

  async createSchool(dto: CreateSchoolDto) {
    const existing = await this.prisma.school.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Bu slug allaqachon band');

    const school = await this.prisma.school.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        subscriptionTier: (dto.subscriptionTier as any) ?? 'basic',
        subscription: {
          create: {
            plan: (dto.subscriptionTier as any) ?? 'basic',
            status: 'trial',
          },
        },
      },
    });

    // Auto-create default "Main Campus" branch
    const mainBranch = await this.prisma.branch.create({
      data: {
        schoolId: school.id,
        name: 'Main Campus',
        code: 'MAIN',
        isActive: true,
      },
    });

    // Enable all core modules by default
    await this.prisma.schoolModule.createMany({
      data: CORE_MODULES.map((moduleName) => ({
        schoolId: school.id,
        moduleName,
        isEnabled: true,
      })),
    });

    return { ...school, mainBranchId: mainBranch.id };
  }

  async updateSchool(id: string, dto: Partial<CreateSchoolDto>) {
    await this.getSchool(id);
    return this.prisma.school.update({ where: { id }, data: dto as any });
  }

  async toggleModule(schoolId: string, dto: ToggleModuleDto) {
    await this.getSchool(schoolId);
    return this.prisma.schoolModule.upsert({
      where: { schoolId_moduleName: { schoolId, moduleName: dto.moduleName } },
      create: {
        schoolId,
        moduleName: dto.moduleName,
        isEnabled: dto.isEnabled,
        configJson: dto.configJson,
      },
      update: { isEnabled: dto.isEnabled, configJson: dto.configJson },
    });
  }

  async getModules(schoolId: string) {
    return this.prisma.schoolModule.findMany({ where: { schoolId } });
  }

  async getPlatformStats() {
    const [schoolCount, userCount, activeSubscriptions] = await this.prisma.$transaction([
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.subscription.count({ where: { status: 'active' } }),
    ]);
    return { schoolCount, userCount, activeSubscriptions };
  }
}
