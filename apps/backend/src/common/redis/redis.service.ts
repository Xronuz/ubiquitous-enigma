import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    super({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get<number>('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get<number>('REDIS_DB', 0),
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });
  }

  async onModuleInit() {
    this.on('connect', () => this.logger.log('Redis ulanish o\'rnatildi'));
    this.on('error', (err) => this.logger.error('Redis xatosi', err));
  }

  async onModuleDestroy() {
    await this.quit();
    this.logger.log('Redis ulanish yopildi');
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.set(key, value, 'EX', ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const json = JSON.stringify(value);
    if (ttlSeconds) {
      await this.set(key, json, 'EX', ttlSeconds);
    } else {
      await this.set(key, json);
    }
  }
}
