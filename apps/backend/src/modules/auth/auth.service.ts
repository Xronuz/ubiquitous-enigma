import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { UserRole, JwtPayload, TokenPair } from '@eduplatform/types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchBranchDto } from './dto/switch-branch.dto';

const LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
const REFRESH_TOKEN_PREFIX = 'refresh:';
const PASSWORD_RESET_PREFIX = 'pwd_reset:';
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_TTL = 15 * 60; // 15 minutes in seconds
const ACCESS_TOKEN_TTL = 24 * 60 * 60; // 24 hours
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const PASSWORD_RESET_TTL = 30 * 60; // 30 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ user: object; tokens: TokenPair }> {
    const { email, password } = dto;
    const attemptsKey = `${LOGIN_ATTEMPTS_PREFIX}${email}`;

    // Check rate limit (Redis bo'lmasa skip qilinadi — xavfsizlik murosasi)
    try {
      const attempts = await this.redis.get(attemptsKey);
      if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
        throw new UnauthorizedException(
          'Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring',
        );
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`Redis rate-limit tekshiruvi o'tkazib yuborildi: ${err.message}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, role: true, schoolId: true, branchId: true,
        passwordHash: true, isActive: true, firstName: true, lastName: true,
      },
    });

    if (!user || !user.isActive) {
      await this.incrementLoginAttempts(attemptsKey).catch(() => null);
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.incrementLoginAttempts(attemptsKey).catch(() => null);
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    // Reset login attempts
    await this.redis.del(attemptsKey).catch(() => null);

    const tokens = await this.generateTokens(user);

    this.logger.log(`Foydalanuvchi tizimga kirdi: ${user.email} (${user.role})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
      },
      tokens,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const { refreshToken } = dto;
    const redisKey = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;

    // Check if token exists and not revoked
    let userId: string;
    try {
      const stored = await this.redis.get(redisKey);
      if (!stored) {
        throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati o\'tgan');
      }
      userId = stored;
      // Delete old token (rotation)
      await this.redis.del(redisKey);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      // Redis mavjud emas — JWT dan userId ni olamiz (rotation olmaydi)
      this.logger.warn(`Redis refresh token tekshiruvi o'tkazib yuborildi: ${err.message}`);
      try {
        const payload = this.jwtService.verify(refreshToken, {
          secret: this.config.get('JWT_REFRESH_SECRET'),
        }) as any;
        userId = payload.sub;
      } catch {
        throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati o\'tgan');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { id: true, email: true, role: true, schoolId: true, branchId: true },
    });

    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    return this.generateTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`).catch(err =>
      this.logger.warn(`Logout — Redis token o'chirishda xato: ${err.message}`),
    );
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'Agar email ro\'yxatdan o\'tgan bo\'lsa, tiklash havolasi yuborildi' };
    }

    const resetToken = uuidv4();
    try {
      await this.redis.setEx(
        `${PASSWORD_RESET_PREFIX}${resetToken}`,
        PASSWORD_RESET_TTL,
        user.id,
      );
    } catch (err: any) {
      this.logger.error(`Parol tiklash tokeni Redis ga yozilmadi: ${err.message}`);
      throw new BadRequestException('Tizimda vaqtinchalik muammo. Iltimos qayta urinib ko\'ring.');
    }

    // TODO: Send SMS/email with reset link
    this.logger.log(`Parol tiklash tokeni yaratildi: ${user.email}`);

    return { message: 'Agar email ro\'yxatdan o\'tgan bo\'lsa, tiklash havolasi yuborildi' };
  }

  /**
   * Director/admin aktiv filialga switch qiladi.
   * Yangi JWT tokenlar qaytariladi (branchId yangilangan).
   *
   * Qoidalar:
   * - SCHOOL_WIDE_ROLES (super_admin, school_admin, director) → har qanday filialga
   * - branch_admin → faqat o'ziga assigned filiallarga
   * - Boshqa rollar → 403
   */
  async switchBranch(dto: SwitchBranchDto, currentUser: JwtPayload): Promise<TokenPair> {
    const SCHOOL_WIDE_ROLES = new Set<UserRole>([
      UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR,
    ]);

    const canSwitch = SCHOOL_WIDE_ROLES.has(currentUser.role as UserRole) ||
      currentUser.role === UserRole.BRANCH_ADMIN;

    if (!canSwitch) {
      throw new ForbiddenException('Filial almashtirish sizning rolingiz uchun ruxsat etilmagan');
    }

    const targetBranchId = dto.branchId ?? null;

    // SECURITY: branch_admin "barcha filiallar" rejimiga (null) o'ta olmaydi.
    // Bu null bypass orqali assignment tekshiruvini chetlab o'tishni bloklaydi.
    if (currentUser.role === UserRole.BRANCH_ADMIN && !targetBranchId) {
      throw new ForbiddenException(
        'Branch admin "barcha filiallar" rejimiga o\'ta olmaydi. Aniq filial tanlang.',
      );
    }

    // Agar branchId berilgan bo'lsa — validate
    if (targetBranchId) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: targetBranchId },
        select: { id: true, schoolId: true, isActive: true },
      });

      if (!branch || !branch.isActive) {
        throw new BadRequestException('Filial topilmadi yoki faol emas');
      }

      // schoolId mos kelishi kerak (super_admin uchun tekshirmaymiz)
      if (currentUser.role !== UserRole.SUPER_ADMIN &&
          branch.schoolId !== currentUser.schoolId) {
        throw new ForbiddenException('Bu filial sizning maktabingizga tegishli emas');
      }

      // branch_admin: faqat o'z assigned filiallariga kirish huquqi
      if (currentUser.role === UserRole.BRANCH_ADMIN) {
        const assignment = await this.prisma.userBranchAssignment.findUnique({
          where: { userId_branchId: { userId: currentUser.sub, branchId: targetBranchId } },
          select: { isActive: true },
        });
        if (!assignment?.isActive && currentUser.branchId !== targetBranchId) {
          throw new ForbiddenException('Bu filialga kirish huquqingiz yo\'q');
        }
      }
    }

    // Yangi tokenlar — branchId ni override qilib
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub, isActive: true },
      select: { id: true, email: true, role: true, schoolId: true, branchId: true },
    });

    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    return this.generateTokens({ ...user, branchId: targetBranchId });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    let userId: string | null;
    try {
      userId = await this.redis.get(`${PASSWORD_RESET_PREFIX}${dto.token}`);
    } catch (err: any) {
      this.logger.error(`Parol tiklash token tekshiruvi xato: ${err.message}`);
      throw new BadRequestException('Tizimda vaqtinchalik muammo. Iltimos qayta urinib ko\'ring.');
    }

    if (!userId) {
      throw new BadRequestException('Token yaroqsiz yoki muddati o\'tgan');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.redis.del(`${PASSWORD_RESET_PREFIX}${dto.token}`).catch(err =>
      this.logger.warn(`Reset token o'chirishda Redis xato: ${err.message}`),
    );
    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    schoolId: string | null;
    branchId?: string | null;
  }): Promise<TokenPair> {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      schoolId: user.schoolId,
      branchId: user.branchId ?? null,
      isSuperAdmin,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = uuidv4();
    await this.redis
      .setEx(`${REFRESH_TOKEN_PREFIX}${refreshToken}`, REFRESH_TOKEN_TTL, user.id)
      .catch(err =>
        this.logger.warn(`Refresh token Redis ga yozilmadi: ${err.message}`),
      );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }

  private async incrementLoginAttempts(key: string): Promise<void> {
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, LOGIN_BLOCK_TTL);
      }
    } catch {
      // Redis mavjud emas — rate limit tracking o'tkazib yuboriladi
    }
  }
}
