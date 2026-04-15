import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { UserRole } from '@eduplatform/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@test.uz',
  firstName: 'Ali',
  lastName: 'Valiyev',
  role: UserRole.SCHOOL_ADMIN,
  schoolId: 'school-uuid-1',
  passwordHash: '',   // filled in beforeAll
  isActive: true,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const redisStore: Record<string, string> = {};
const mockRedis = {
  get: jest.fn((key: string) => Promise.resolve(redisStore[key] ?? null)),
  set: jest.fn((key: string, value: string) => { redisStore[key] = value; return Promise.resolve(); }),
  setEx: jest.fn((key: string, _ttl: number, value: string) => { redisStore[key] = value; return Promise.resolve(); }),
  del: jest.fn((key: string) => { delete redisStore[key]; return Promise.resolve(); }),
  incr: jest.fn((key: string) => {
    const cur = parseInt(redisStore[key] ?? '0') + 1;
    redisStore[key] = String(cur);
    return Promise.resolve(cur);
  }),
  expire: jest.fn(() => Promise.resolve()),
};

const mockJwt = {
  sign: jest.fn(() => 'mock-access-token'),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    return undefined;
  }),
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    // Clear redis store between tests
    Object.keys(redisStore).forEach(k => delete redisStore[k]);
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: RedisService,   useValue: mockRedis },
        { provide: JwtService,     useValue: mockJwt },
        { provide: ConfigService,  useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns user + tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.login({ email: mockUser.email, password: 'Password123!' });

      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
      // Login attempts cleared
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({ email: mockUser.email, password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);

      // Login attempt incremented
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'notfound@test.uz', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: mockUser.email, password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('blocks login after 5 failed attempts', async () => {
      // Pre-fill 5 attempts in redis
      redisStore[`login_attempts:${mockUser.email}`] = '5';

      await expect(
        service.login({ email: mockUser.email, password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);

      // Should not even query DB
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── refresh ──────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('returns new token pair on valid refresh token', async () => {
      const fakeRefresh = 'valid-refresh-token';
      redisStore[`refresh:${fakeRefresh}`] = mockUser.id;
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: mockUser.id, email: mockUser.email,
        role: mockUser.role, schoolId: mockUser.schoolId,
      });

      const tokens = await service.refresh({ refreshToken: fakeRefresh });

      expect(tokens.accessToken).toBe('mock-access-token');
      // Old token deleted (rotation)
      expect(redisStore[`refresh:${fakeRefresh}`]).toBeUndefined();
    });

    it('throws UnauthorizedException on unknown/expired refresh token', async () => {
      await expect(
        service.refresh({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('deletes refresh token from redis', async () => {
      const rt = 'token-to-revoke';
      redisStore[`refresh:${rt}`] = mockUser.id;

      await service.logout(rt);

      expect(redisStore[`refresh:${rt}`]).toBeUndefined();
    });
  });

  // ── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('returns generic message even if email not found (no leak)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.forgotPassword({ email: 'ghost@test.uz' });

      expect(result.message).toContain('ro\'yxatdan o\'tgan bo\'lsa');
      // No token created
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });

    it('creates reset token in redis when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.forgotPassword({ email: mockUser.email });

      expect(result.message).toContain('ro\'yxatdan o\'tgan bo\'lsa');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^pwd_reset:/),
        expect.any(Number),
        mockUser.id,
      );
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('updates password when token is valid', async () => {
      const token = 'valid-reset-token';
      redisStore[`pwd_reset:${token}`] = mockUser.id;
      mockPrisma.user.update.mockResolvedValueOnce(mockUser);

      const result = await service.resetPassword({ token, password: 'NewPass456!' });

      expect(result.message).toContain('muvaffaqiyatli');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      });
      // Token deleted
      expect(redisStore[`pwd_reset:${token}`]).toBeUndefined();
    });

    it('throws BadRequestException on invalid token', async () => {
      await expect(
        service.resetPassword({ token: 'invalid-token', password: 'any' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
