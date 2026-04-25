import { Controller, Get, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck, HealthCheckService, PrismaHealthIndicator,
  MemoryHealthIndicator, HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaIndicator: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaService,
    @Optional() private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check (liveness)' })
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      // PrismaHealthIndicator types accept the bare PrismaClient generic.
      // Our PrismaService extends PrismaClient at runtime but Prisma v6's
      // structural type widens the missing methods — cast to any is safe here.
      () => this.prismaIndicator.pingCheck('database', this.prisma as any),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      // Redis — ixtiyoriy, mavjud bo'lmasa degraded holat, crash emas
      async () => {
        if (!this.redis) {
          return { redis: { status: 'up', message: 'not configured' } };
        }
        try {
          const pong = await Promise.race([
            this.redis.ping(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 2000),
            ),
          ]);
          return { redis: { status: 'up', pong } };
        } catch (err: any) {
          // Redis down bo'lsa health check fail qilmasin — degraded deb belgilaydi
          return { redis: { status: 'up', message: `degraded: ${err.message}` } };
        }
      },
    ]);
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness check' })
  ready() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
