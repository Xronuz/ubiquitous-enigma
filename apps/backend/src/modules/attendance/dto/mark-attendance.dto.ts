import { IsString, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@eduplatform/types';

export class AttendanceEntryDto {
  @ApiProperty({ example: 'uuid-student-id', description: "O'quvchi user ID si" })
  @IsString()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT, description: 'present | absent | late | excused' })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiPropertyOptional({ example: 'Kasal', description: 'Ixtiyoriy izoh' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class MarkAttendanceDto {
  @ApiProperty({ example: 'uuid-class-id', description: 'Sinf ID si' })
  @IsString()
  classId: string;

  @ApiPropertyOptional({ example: 'uuid-schedule-id', description: 'Dars jadvali ID si (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @ApiProperty({ example: '2025-03-01' })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: [AttendanceEntryDto],
    description: "O'quvchilar davomati ro'yxati. 'entries' yoki 'records' (legacy alias) nomidan biri qabul qilinadi.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries?: AttendanceEntryDto[];

  // Legacy alias — explicitly whitelisted so forbidNonWhitelisted does not reject it.
  // The 'entries' @Transform above will consume this value.
  @ApiPropertyOptional({
    type: [AttendanceEntryDto],
    description: "Legacy alias for 'entries'. Prefer using 'entries'.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  records?: AttendanceEntryDto[];
}
