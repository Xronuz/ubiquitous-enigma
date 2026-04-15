import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsInt, IsEnum, IsBoolean, MaxLength, Min } from 'class-validator';

export enum ClubCategoryDto {
  sport    = 'sport',
  art      = 'art',
  science  = 'science',
  music    = 'music',
  tech     = 'tech',
  language = 'language',
  other    = 'other',
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

  @ApiPropertyOptional({ example: 'Chorshanba 15:00-16:00' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schedule?: string;

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
