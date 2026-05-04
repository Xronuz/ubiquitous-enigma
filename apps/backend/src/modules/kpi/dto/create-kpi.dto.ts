import {
  IsString, IsOptional, IsNumber, IsBoolean, IsEnum,
  IsUUID, MinLength, MaxLength, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KpiCategory, KpiPeriod } from '@prisma/client';

export class CreateKpiMetricDto {
  @ApiPropertyOptional({ description: 'Maktab ID (super_admin uchun)' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiProperty({ example: 'Davomat foizi' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'O\'quvchilarning oylik davomat foizi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: KpiCategory, example: 'ACADEMIC' })
  @IsEnum(KpiCategory)
  category: KpiCategory;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  targetValue?: number;

  @ApiPropertyOptional({ example: '%' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: KpiPeriod, default: 'MONTHLY' })
  @IsOptional()
  @IsEnum(KpiPeriod)
  period?: KpiPeriod;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filial ID (null = maktab bo\'yicha)' })
  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}

export class UpdateKpiMetricDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: KpiCategory })
  @IsOptional()
  @IsEnum(KpiCategory)
  category?: KpiCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: KpiPeriod })
  @IsOptional()
  @IsEnum(KpiPeriod)
  period?: KpiPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateKpiRecordDto {
  @ApiProperty({ example: 'metric-uuid' })
  @IsUUID()
  metricId: string;

  @ApiProperty({ example: 87.5 })
  @IsNumber()
  @Min(0)
  actualValue: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  periodStart: string;

  @ApiProperty({ example: '2026-05-07T23:59:59.000Z' })
  periodEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
