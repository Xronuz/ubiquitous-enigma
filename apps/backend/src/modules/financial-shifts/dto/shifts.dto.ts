import { IsUUID, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpenShiftDto {
  @ApiProperty({ description: 'G\'azna IDsi' })
  @IsUUID()
  treasuryId: string;

  @ApiProperty({ description: 'Smena boshidagi naqd pul (inventarizatsiya)', example: 500000 })
  @IsNumber() @Min(0)
  startingBalance: number;
}

export class CloseShiftDto {
  @ApiProperty({ description: 'Kassir hisoblagan haqiqiy balans', example: 1350000 })
  @IsNumber() @Min(0)
  actualBalance: number;

  @ApiPropertyOptional({ description: 'Kassir izohi (farq sababini tushuntirish)' })
  @IsOptional() @IsString()
  notes?: string;
}
