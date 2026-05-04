import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsUUID, IsInt, IsEnum, IsBoolean,
  MaxLength, Min, IsArray, Matches,
} from 'class-validator';

export enum ClubCategoryDto {
  sport    = 'sport',
  art      = 'art',
  science  = 'science',
  music    = 'music',
  tech     = 'tech',
  language = 'language',
  other    = 'other',
}

export enum DayOfWeekDto {
  monday    = 'monday',
  tuesday   = 'tuesday',
  wednesday = 'wednesday',
  thursday  = 'thursday',
  friday    = 'friday',
  saturday  = 'saturday',
  sunday    = 'sunday',
}

export class CreateClubDto {
  @ApiProperty({ example: 'Robototexnika' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Arduino va robotlar bilan ishlash' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ClubCategoryDto, example: 'tech' })
  @IsEnum(ClubCategoryDto)
  category: ClubCategoryDto;

  @ApiProperty({ description: 'Rahbar o\'qituvchi ID' })
  @IsUUID()
  leaderId: string;

  @ApiPropertyOptional({ description: 'Fan ID (ixtiyoriy)' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ example: 'Chorshanba 15:00-16:00', description: 'Display string (legacy)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schedule?: string;

  @ApiPropertyOptional({ type: [String], enum: DayOfWeekDto, example: ['wednesday', 'friday'] })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeekDto, { each: true })
  scheduleDays?: DayOfWeekDto[];

  @ApiPropertyOptional({ example: '15:00', description: 'HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'scheduleStartTime must be HH:mm' })
  scheduleStartTime?: string;

  @ApiPropertyOptional({ example: '16:00', description: 'HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'scheduleEndTime must be HH:mm' })
  scheduleEndTime?: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxMembers?: number;
}

export class UpdateClubDto extends PartialType(CreateClubDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ClubJoinRequestDto {
  @ApiPropertyOptional({ example: 'Iltimos qabul qiling, men juda qiziqaman!' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  message?: string;
}
