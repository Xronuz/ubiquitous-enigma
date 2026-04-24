import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradeType } from '@eduplatform/types';

export class CreateGradeDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty({ enum: GradeType })
  @IsEnum(GradeType)
  type: GradeType;

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  score: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Max(1000)
  maxScore?: number;

  @ApiProperty({ example: '2025-03-01' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
