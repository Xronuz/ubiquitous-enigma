import { IsString, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform, TransformFnParams } from 'class-transformer';
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
    description: "O'quvchilar davomati ro'yxati. 'records' nomi ham qabul qilinadi (legacy alias).",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  // Accept both 'entries' (canonical) and 'records' (legacy alias from older frontend builds)
  @Transform(({ value, obj }: TransformFnParams) => value ?? obj?.records)
  entries: AttendanceEntryDto[];
}
