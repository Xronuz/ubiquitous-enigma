import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { NOTIFICATION_QUEUE } from './queue.constants';

export function createQueueProvider(queueName: string) {
  return {
    provide: queueName,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      return new Queue(queueName, {
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
          db: config.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });
    },
  };
}

@Global()
@Module({
  providers: [createQueueProvider(NOTIFICATION_QUEUE)],
  exports: [NOTIFICATION_QUEUE],
})
export class QueueModule {}
