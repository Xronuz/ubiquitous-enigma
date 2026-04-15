import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DisplayService } from './display.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('display')
@Controller('display')
export class DisplayController {
  constructor(private readonly displayService: DisplayService) {}

  /**
   * Public endpoint — autentifikatsiya talab qilinmaydi.
   * Zal ekraniga bugungi dars jadvalini ko'rsatish uchun ishlatiladi.
   */
  @Get(':schoolSlug')
  @Throttle({ default: { ttl: 60000, limit: 60 } }) // 60 req/min — display sahifasi uchun yetarli
  @ApiOperation({ summary: 'Public: bugungi dars jadvali (zal ekrani)' })
  @ApiParam({ name: 'schoolSlug', description: 'Maktabning unikal slug identifikatori' })
  getTodaySchedule(@Param('schoolSlug') schoolSlug: string) {
    return this.displayService.getTodaySchedule(schoolSlug);
  }
}
