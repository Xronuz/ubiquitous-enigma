import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { parse as csvParse } from 'csv-parse/sync';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { UserRole, JwtPayload } from '@eduplatform/types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { branchFilter } from '@/common/utils/branch-filter.util';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(
    currentUser: JwtPayload,
    branchCtx: string | null = null,
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
  ) {
    const skip = (page - 1) * limit;

    // super_admin can see all users; others get branchFilter
    const baseFilter = currentUser.isSuperAdmin ? {} : branchFilter(currentUser, branchCtx);
    const where: any = { ...baseFilter };
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: this.userSelectFields(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...this.userSelectFields(), schoolId: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (!currentUser.isSuperAdmin && user.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Boshqa maktab foydalanuvchisiga kirish taqiqlangan');
    }
    return user;
  }

  async create(dto: CreateUserDto, currentUser: JwtPayload) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    // Non-super-admin can only create users for their school
    const schoolId = currentUser.isSuperAdmin
      ? (dto.schoolId ?? null)
      : currentUser.schoolId;

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        role: dto.role as any,
        schoolId,
        passwordHash,
      },
      select: this.userSelectFields(),
    });

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: schoolId ?? undefined,
      action: 'create',
      entity: 'User',
      entityId: user.id,
      newData: { email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUser: JwtPayload) {
    const before = await this.findOne(id, currentUser);
    const updated = await this.prisma.user.update({
      where: { id },
      data: dto as any,
      select: this.userSelectFields(),
    });

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'User',
      entityId: id,
      oldData: { firstName: before.firstName, lastName: before.lastName },
      newData: dto as any,
    });

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const user = await this.findOne(id, currentUser);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'User',
      entityId: id,
      oldData: { email: user.email, role: user.role },
    });

    return { message: 'Foydalanuvchi bloklandi' };
  }

  async restore(id: string, currentUser: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
    return { message: 'Foydalanuvchi faollashtirildi' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...this.userSelectFields(), schoolId: true, language: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async linkParentStudent(parentId: string, studentId: string, currentUser: JwtPayload) {
    const [parent, student] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: parentId, schoolId: currentUser.schoolId! } }),
      this.prisma.user.findFirst({ where: { id: studentId, schoolId: currentUser.schoolId! } }),
    ]);
    if (!parent) throw new NotFoundException('Ota-ona topilmadi');
    if (!student) throw new NotFoundException('O\'quvchi topilmadi');

    return this.prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      update: {},
      create: { parentId, studentId },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Joriy parol noto\'g\'ri');

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  /**
   * Avatar URL ni yangilash (upload endpointi natijasini saqlash)
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { avatarUrl } });
    return { message: 'Avatar yangilandi', avatarUrl };
  }

  /**
   * CSV fayldan ommaviy o'quvchi import qilish
   *
   * CSV formatı (header qator majburiy):
   * firstName,lastName,email,password,phone,classId
   */
  async importFromCsv(
    csvBuffer: Buffer,
    currentUser: JwtPayload,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    if (!currentUser.schoolId) {
      throw new ForbiddenException('Maktab ID si topilmadi');
    }

    let rows: Record<string, string>[];
    try {
      rows = csvParse(csvBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch (err) {
      throw new BadRequestException(`CSV fayl noto'g'ri format: ${err.message}`);
    }

    if (rows.length === 0) {
      throw new BadRequestException('CSV fayl bo\'sh');
    }

    if (rows.length > 500) {
      throw new BadRequestException('Bir vaqtda 500 tadan ko\'p o\'quvchi yuklab bo\'lmaydi');
    }

    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1 = header, 2 = birinchi data qator

      const firstName = row['firstName']?.trim() || row['Ism']?.trim();
      const lastName = row['lastName']?.trim() || row['Familiya']?.trim();
      const email = row['email']?.trim() || row['Email']?.trim();
      const password = row['password']?.trim() || row['Parol']?.trim() || 'Edu@1234';
      const phone = row['phone']?.trim() || row['Telefon']?.trim();
      const classId = row['classId']?.trim() || row['SinfID']?.trim();

      // Majburiy maydonlar tekshirish
      if (!firstName || !lastName || !email) {
        errors.push(`Qator ${rowNum}: firstName, lastName, email majburiy`);
        skipped++;
        continue;
      }

      // Email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Qator ${rowNum}: email format noto'g'ri — ${email}`);
        skipped++;
        continue;
      }

      try {
        // Email takrorlanishini tekshirish
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists) {
          errors.push(`Qator ${rowNum}: ${email} allaqachon mavjud — o'tkazib yuborildi`);
          skipped++;
          continue;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Classni tekshirish (agar berilgan bo'lsa)
        let validClassId: string | undefined;
        if (classId) {
          const cls = await this.prisma.class.findFirst({
            where: { id: classId, schoolId: currentUser.schoolId! },
          });
          if (!cls) {
            errors.push(`Qator ${rowNum}: Sinf ${classId} topilmadi — o'quvchi qo'shildi, sinfga biriktirilmadi`);
          } else {
            validClassId = classId;
          }
        }

        await this.prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            passwordHash,
            phone: phone || null,
            role: UserRole.STUDENT,
            schoolId: currentUser.schoolId!,
            isActive: true,
          },
        });

        // Agar sinf berilgan bo'lsa, sinfga biriktirish
        if (validClassId) {
          const createdUser = await this.prisma.user.findUnique({ where: { email } });
          if (createdUser) {
            await this.prisma.classStudent.upsert({
              where: { classId_studentId: { classId: validClassId, studentId: createdUser.id } },
              update: {},
              create: { classId: validClassId, studentId: createdUser.id },
            });
          }
        }

        created++;
      } catch (err) {
        errors.push(`Qator ${rowNum}: ${err.message}`);
        skipped++;
      }
    }

    return { created, skipped, errors };
  }

  private userSelectFields() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
    };
  }
}
