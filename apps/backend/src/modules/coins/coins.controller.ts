import {
  Controller, Get, Post, Body, Query, ParseIntPipe, DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard }  from '@/common/guards/jwt-auth.guard';
import { RolesGuard }    from '@/common/guards/roles.guard';
import { Roles }         from '@/common/decorators/roles.decorator';
import { CurrentUser }   from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CoinsService }  from './coins.service';
import { SpendCoinsDto } from './dto/spend-coins.dto';

const ADMIN_ROLES = [
  UserRole.SCHOOL_ADMIN, UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
];

@ApiTags('coins')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'coins', version: '1' })
export class CoinsController {
  constructor(private readonly coinsService: CoinsService) {}

  // ─── Student endpoints ────────────────────────────────────────────────────

  @Get('balance')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'O\'z coin balansini ko\'rish' })
  getBalance(@CurrentUser() user: JwtPayload) {
    return this.coinsService.getBalance(user);
  }

  @Get('history')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Coin tarixi (so\'nggi N ta)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Default: 20' })
  getHistory(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.coinsService.getHistory(user, limit);
  }

  @Get('shop')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Coin do\'koni — mavjud sovg\'alar' })
  getShopItems() {
    return this.coinsService.getShopItems();
  }

  @Post('spend')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Coinlarni sarflash (xarid qilish)' })
  spendCoins(
    @Body() dto: SpendCoinsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coinsService.spendCoins(dto.itemId, user);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @Post('award')
  @Roles(...ADMIN_ROLES)
  @ApiOperation({ summary: 'Admin: O\'quvchiga qo\'lda coin berish/ayirish' })
  awardManual(
    @Body() body: { studentId: string; amount: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coinsService.awardManual(body.studentId, body.amount, user);
  }
}
