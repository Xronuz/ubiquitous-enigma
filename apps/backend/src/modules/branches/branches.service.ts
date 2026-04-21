import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CreateBranchDto, UpdateBranchDto } from './dto/branches.dto';

const SCHOOL_WIDE_ROLES = new Set<string>([
  UserRole.SUPER_ADMIN,
  UserRole.SCHOOL_ADMIN,
  UserRole.DIRECTOR,
]);

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Maktabning barcha filiallarini qaytaradi */
  async findAll(currentUser: JwtPayload) {
    const where = SCHOOL_WIDE_ROLES.has(currentUser.role)
      ? { schoolId: currentUser.schoolId! }
      : {
          schoolId: currentUser.schoolId!,
          id: currentUser.branchId ?? undefined,
          isActive: true,
        };

    return this.prisma.branch.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            classes: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /** Bitta filial tafsilotlari */
  async findOne(id: string, currentUser: JwtPayload) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        schoolId: currentUser.schoolId!,
      },
      select: {
        id: true,
        schoolId: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            classes: true,
            payments: true,
          },
        },
        modules: {
          select: {
            moduleName: true,
            isEnabled: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Filial topilmadi (id: ${id})`);
    }

    // Branch-scoped foydalanuvchi faqat o'z filialini ko'ra oladi
    if (!SCHOOL_WIDE_ROLES.has(currentUser.role) && branch.id !== currentUser.branchId) {
      throw new ForbiddenException('Bu filialga kirish taqiqlangan');
    }

    return branch;
  }

  /** Yangi filial yaratish — faqat school_admin / director */
  async create(dto: CreateBranchDto, currentUser: JwtPayload) {
    // Xuddi shu maktabda bir xil nomli filial mavjudligini tekshirish
    const existing = await this.prisma.branch.findUnique({
      where: {
        schoolId_name: {
          schoolId: currentUser.schoolId!,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`"${dto.name}" nomli filial allaqachon mavjud`);
    }

    // Agar code berilgan bo'lsa — unikligini tekshirish (maktab doirasida)
    if (dto.code) {
      const codeExists = await this.prisma.branch.findFirst({
        where: { schoolId: currentUser.schoolId!, code: dto.code },
      });
      if (codeExists) {
        throw new ConflictException(`"${dto.code}" kodi bilan filial allaqachon mavjud`);
      }
    }

    return this.prisma.branch.create({
      data: {
        schoolId: currentUser.schoolId!,
        name: dto.name,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  /** Filial ma'lumotlarini yangilash */
  async update(id: string, dto: UpdateBranchDto, currentUser: JwtPayload) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });

    if (!branch) {
      throw new NotFoundException(`Filial topilmadi (id: ${id})`);
    }

    // Nom o'zgartirilsa — konflikt tekshirish
    if (dto.name && dto.name !== branch.name) {
      const nameExists = await this.prisma.branch.findUnique({
        where: {
          schoolId_name: {
            schoolId: currentUser.schoolId!,
            name: dto.name,
          },
        },
      });
      if (nameExists) {
        throw new ConflictException(`"${dto.name}" nomli filial allaqachon mavjud`);
      }
    }

    // Kod o'zgartirilsa — konflikt tekshirish
    if (dto.code && dto.code !== branch.code) {
      const codeExists = await this.prisma.branch.findFirst({
        where: { schoolId: currentUser.schoolId!, code: dto.code, NOT: { id } },
      });
      if (codeExists) {
        throw new ConflictException(`"${dto.code}" kodi bilan filial allaqachon mavjud`);
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Filialni o'chirish.
   * Agar filialnda users / classes bo'lsa — soft delete (isActive = false).
   * Bo'sh filiallarni to'liq o'chirish mumkin.
   */
  async remove(id: string, currentUser: JwtPayload) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
      select: {
        id: true,
        name: true,
        _count: { select: { users: true, classes: true } },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Filial topilmadi (id: ${id})`);
    }

    const hasData = branch._count.users > 0 || branch._count.classes > 0;

    if (hasData) {
      // Soft delete — faqat deaktivatsiya
      await this.prisma.branch.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        message: `"${branch.name}" filiali deaktivatsiya qilindi (${branch._count.users} xodim, ${branch._count.classes} sinf mavjud edi)`,
        softDeleted: true,
      };
    }

    // Bo'sh filiallarni to'liq o'chirish
    await this.prisma.branch.delete({ where: { id } });
    return {
      message: `"${branch.name}" filiali muvaffaqiyatli o'chirildi`,
      softDeleted: false,
    };
  }
}
