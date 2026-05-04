import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { CreateKpiMetricDto, UpdateKpiMetricDto, CreateKpiRecordDto } from './dto/create-kpi.dto';
import { KpiCategory } from '@prisma/client';

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  async findMetrics(user: JwtPayload, category?: KpiCategory) {
    const where: any = buildTenantWhere(user);
    if (category) where.category = category;
    return this.prisma.kpiMetric.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { records: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findMetric(id: string, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id, ...buildTenantWhere(user) },
      include: {
        branch: { select: { id: true, name: true } },
        records: {
          orderBy: { periodStart: 'desc' },
          take: 12,
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');
    return metric;
  }

  async createMetric(dto: CreateKpiMetricDto, user: JwtPayload) {
    const schoolId = user.isSuperAdmin ? dto.schoolId! : user.schoolId!;
    if (!schoolId) throw new BadRequestException('schoolId majburiy');

    return this.prisma.kpiMetric.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        targetValue: dto.targetValue ?? 0,
        unit: dto.unit ?? '%',
        period: dto.period ?? 'MONTHLY',
        isActive: dto.isActive ?? true,
        schoolId,
        branchId: dto.branchId,
      },
    });
  }

  async updateMetric(id: string, dto: UpdateKpiMetricDto, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id, ...buildTenantWhere(user) },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');

    return this.prisma.kpiMetric.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.period && { period: dto.period }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteMetric(id: string, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id, ...buildTenantWhere(user) },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');

    await this.prisma.kpiMetric.delete({ where: { id } });
    return { message: 'KPI metrika o\'chirildi' };
  }

  async createRecord(dto: CreateKpiRecordDto, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id: dto.metricId, ...buildTenantWhere(user) },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    return this.prisma.kpiRecord.create({
      data: {
        metricId: dto.metricId,
        actualValue: dto.actualValue,
        periodStart,
        periodEnd,
        notes: dto.notes,
        createdById: user.sub,
      },
    });
  }

  async getDashboard(user: JwtPayload) {
    const where = buildTenantWhere(user);

    const metrics = await this.prisma.kpiMetric.findMany({
      where,
      include: {
        records: {
          orderBy: { periodStart: 'desc' },
          take: 1,
        },
      },
    });

    const latestRecords = metrics.map(m => ({
      metricId: m.id,
      name: m.name,
      category: m.category,
      targetValue: m.targetValue,
      unit: m.unit,
      latestValue: m.records[0]?.actualValue ?? null,
      latestPeriod: m.records[0]?.periodStart ?? null,
      progress: m.records[0] ? Math.round((m.records[0].actualValue / (m.targetValue || 1)) * 100) : null,
    }));

    const byCategory = {} as Record<string, typeof latestRecords>;
    latestRecords.forEach(r => {
      const key = r.category;
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(r);
    });

    return { metrics: latestRecords, byCategory };
  }
}
