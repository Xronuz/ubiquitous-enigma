import { IsString, IsNotEmpty, IsInt, Min, IsEnum, IsOptional, Matches } from 'class-validator';
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

  @ApiPropertyOptional({ example: '201' })
  @IsOptional()
  @IsString()
  roomNumber?: string;

  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: 1, description: 'Dars tartib raqami (1-8)' })
  @IsInt()
  @Min(1)
  timeSlot: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime HH:MM formatida bo\'lishi kerak' })
  startTime: string;

  @ApiProperty({ example: '08:45' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime HH:MM formatida bo\'lishi kerak' })
  endTime: string;
}
