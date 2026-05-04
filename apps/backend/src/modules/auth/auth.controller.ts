import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchBranchDto } from './dto/switch-branch.dto';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private get cookieOptions() {
    const isHttps = this.config.get('APP_URL', '').startsWith('https://');
    return {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? ('none' as const) : ('lax' as const),
      path: '/',
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // Hard login rate-limit: max 10 attempts per 60 s per IP.
  // After 10 failures the client gets 429 Too Many Requests.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Tizimga kirish' })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirish' })
  @ApiResponse({ status: 401, description: 'Email yoki parol noto\'g\'ri' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    // httpOnly cookies for XSS-resistant auth
    res.cookie('access_token', result.tokens.accessToken, {
      ...this.cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('refresh_token', result.tokens.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access token yangilash' })
  async refresh(@Body() dto: RefreshTokenDto, @Res({ passthrough: true }) res: Response) {
    // Prefer cookie if body is empty (cookie-based auth flow)
    const cookieRefresh = (res.req as any)?.headers?.cookie?.match(/refresh_token=([^;]+)/);
    const refreshToken = dto?.refreshToken || (cookieRefresh ? decodeURIComponent(cookieRefresh[1]) : '');
    const tokens = await this.authService.refresh({ refreshToken });
    res.cookie('access_token', tokens.accessToken, {
      ...this.cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return tokens;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tizimdan chiqish' })
  logout(@Body() dto: LogoutDto, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', this.cookieOptions);
    res.clearCookie('refresh_token', this.cookieOptions);
    const cookieRefresh = (res.req as any)?.headers?.cookie?.match(/refresh_token=([^;]+)/);
    const refreshToken = dto?.refreshToken || (cookieRefresh ? decodeURIComponent(cookieRefresh[1]) : '');
    return this.authService.logout(refreshToken ?? '');
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Parolni tiklash so\'rovi' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yangi parol o\'rnatish' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /**
   * Director/admin aktiv filialga switch qiladi.
   * Yangi JWT tokenlar qaytariladi — frontend ularni saqlashi kerak.
   */
  @Post('switch-branch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT')
  @Roles(UserRole.SUPER_ADMIN, UserRole.DIRECTOR, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Aktiv filialni almashtirish (director/admin)' })
  @ApiResponse({ status: 200, description: 'Yangi tokenlar qaytarildi' })
  async switchBranch(@Body() dto: SwitchBranchDto, @CurrentUser() user: JwtPayload, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.switchBranch(dto, user);
    res.cookie('access_token', result.accessToken, {
      ...this.cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...this.cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return result;
  }
}
