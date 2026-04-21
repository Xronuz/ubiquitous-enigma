import { IsString, IsOptional, IsEnum, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum TreasuryTypeDto {
  CASH = 'CASH',
  BANK = 'BANK',
}

export class CreateTreasuryDto {
  @ApiProperty({ example: 'Asosiy kassa' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ enum: TreasuryTypeDto, default: 'CASH' })
  @IsOptional() @IsEnum(TreasuryTypeDto)
  type?: TreasuryTypeDto;

  @ApiPropertyOptional({ example: 'branch-uuid', description: 'null = markaziy (CENTRALIZED)' })
  @IsOptional() @IsUUID()
  branchId?: string | null;

  @ApiPropertyOptional({ default: 'UZS' })
  @IsOptional() @IsString()
  currency?: string;
}

export class UpdateTreasuryDto extends PartialType(CreateTreasuryDto) {}
