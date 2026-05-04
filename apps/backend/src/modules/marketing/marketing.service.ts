import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

export interface FunnelStage {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface SourceBreakdown {
  source: string;
  label: string;
  count: number;
  converted: number;
  conversionRate: number;
}

export interface MonthlyTrend {
  month: string;
  leads: number;
  converted: number;
  conversionRate: number;
}

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async getFunnel(user: JwtPayload): Promise<FunnelStage[]> {
    const where = buildTenantWhere(user);

    const statuses = ['NEW', 'CONTACTED', 'TEST_LESSON', 'WAITING_PAYMENT', 'CONVERTED', 'CLOSED'];
    const labels: Record<string, string> = {
      NEW: 'Yangi',
      CONTACTED: 'Bog\'lanildi',
      TEST_LESSON: 'Sinov darsi',
      WAITING_PAYMENT: 'To\'lov kutilmoqda',
      CONVERTED: 'O\'quvchiga aylantirildi',
      CLOSED: 'Yopildi',
    };

    const total = await this.prisma.lead.count({ where });

    const stages: FunnelStage[] = [];
    for (const status of statuses) {
      const count = await this.prisma.lead.count({ where: { ...where, status: status as any } });
      stages.push({
        status,
        label: labels[status],
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      });
    }

    return stages;
  }

  async getSources(user: JwtPayload): Promise<SourceBreakdown[]> {
    const where = buildTenantWhere(user);

    const sources = ['INSTAGRAM', 'TELEGRAM', 'FACEBOOK', 'WEBSITE', 'REFERRAL', 'CALL', 'WALK_IN', 'OTHER'];
    const labels: Record<string, string> = {
      INSTAGRAM: 'Instagram',
      TELEGRAM: 'Telegram',
      FACEBOOK: 'Facebook',
      WEBSITE: 'Sayt',
      REFERRAL: 'Tavsiya',
      CALL: 'Qo\'ng\'iroq',
      WALK_IN: 'To\'g\'ridan-to\'g\'ri',
      OTHER: 'Boshqa',
    };

    const result: SourceBreakdown[] = [];
    for (const source of sources) {
      const count = await this.prisma.lead.count({ where: { ...where, source: source as any } });
      const converted = await this.prisma.lead.count({
        where: { ...where, source: source as any, status: 'CONVERTED' },
      });
      result.push({
        source,
        label: labels[source],
        count,
        converted,
        conversionRate: count > 0 ? Math.round((converted / count) * 100) : 0,
      });
    }

    return result.sort((a, b) => b.count - a.count);
  }

  async getMonthlyTrend(user: JwtPayload): Promise<MonthlyTrend[]> {
    const where = buildTenantWhere(user);

    // Get last 6 months
    const months: MonthlyTrend[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const leads = await this.prisma.lead.count({
        where: { ...where, createdAt: { gte: start, lt: end } },
      });
      const converted = await this.prisma.lead.count({
        where: { ...where, status: 'CONVERTED', createdAt: { gte: start, lt: end } },
      });

      months.push({
        month: start.toLocaleDateString('uz-UZ', { month: 'short' }),
        leads,
        converted,
        conversionRate: leads > 0 ? Math.round((converted / leads) * 100) : 0,
      });
    }

    return months;
  }

  async getDashboard(user: JwtPayload) {
    const where = buildTenantWhere(user);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalLeads,
      newLeads,
      convertedLeads,
      conversionRate,
      topSources,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.lead.count({ where: { ...where, status: 'CONVERTED' } }),
      this.getOverallConversionRate(user),
      this.getSources(user).then(s => s.slice(0, 3)),
    ]);

    return {
      totalLeads,
      newLeads,
      convertedLeads,
      conversionRate,
      topSources,
      funnel: await this.getFunnel(user),
      monthlyTrend: await this.getMonthlyTrend(user),
    };
  }

  private async getOverallConversionRate(user: JwtPayload): Promise<number> {
    const where = buildTenantWhere(user);
    const total = await this.prisma.lead.count({ where });
    if (total === 0) return 0;
    const converted = await this.prisma.lead.count({ where: { ...where, status: 'CONVERTED' } });
    return Math.round((converted / total) * 100);
  }
}
