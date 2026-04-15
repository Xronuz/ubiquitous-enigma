import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('PostgreSQL ulanish o\'rnatildi');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PostgreSQL ulanish yopildi');
  }

  /**
   * Set RLS context for the current PostgreSQL session.
   * Called by TenantMiddleware on every authenticated request.
   *
   * NOTE: Uses SET (session-level) so the variable persists for the
   * connection lifetime. Works correctly with PgBouncer session mode.
   * Application-level tenant isolation (where: { schoolId }) provides
   * an additional security layer independent of PostgreSQL RLS.
   */
  async setTenantContext(schoolId: string | null, isSuperAdmin = false): Promise<void> {
    try {
      if (isSuperAdmin) {
        await this.$executeRawUnsafe(`SET app.is_super_admin = 'true'`);
        await this.$executeRawUnsafe(`SET app.current_school_id = ''`);
      } else if (schoolId) {
        // Sanitize schoolId (UUID format only — prevent injection)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(schoolId)) return;
        await this.$executeRawUnsafe(`SET app.current_school_id = '${schoolId}'`);
        await this.$executeRawUnsafe(`SET app.is_super_admin = 'false'`);
      }
    } catch {
      // PostgreSQL RLS setup is best-effort — app-level isolation remains active
    }
  }
}
