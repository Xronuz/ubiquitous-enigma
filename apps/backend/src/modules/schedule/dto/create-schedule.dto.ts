import { IsString, IsNotEmpty, IsInt, Min, IsEnum, IsOptional, Matches, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '@eduplatform/types';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId: string;

  @ApiPropertyOptional({ example: '201', description: 'Legacy: string xona raqami' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiPropertyOptional({ description: 'Room modelidan xona IDsi (roomId yoki roomNumber bittasini bering)' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: 1, description: 'Dars tartib raqami (1-8)' })
  @IsInt()
  @Min(1)
  timeSlot: number;

  @ApiProperty({ example: '08:00', description: 'Mahalliy vaqt (school.timezone asosida)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime HH:MM formatida bo\'lishi kerak' })
  startTime: string;

  @ApiProperty({ example: '08:45', description: 'Mahalliy vaqt (school.timezone asosida)' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime HH:MM formatida bo\'lishi kerak' })
  endTime: string;
}
