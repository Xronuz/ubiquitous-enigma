import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: '5-A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel: number;

  @ApiProperty({ example: '2024-2025' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({ description: 'Sinf rahbari ID (null = olib tashlash)' })
  @IsOptional()
  @IsString()
  classTeacherId?: string | null;

  @ApiPropertyOptional({ description: 'Filial ID (null = maktab bo\'yicha)' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId UUID formatida bo\'lishi kerak' })
  branchId?: string | null;
}
