import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional,
  IsString, IsUUID, MinLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@eduplatform/types';

export class CreateUserDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Valiyev' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ali@school.uz' })
  @IsEmail({}, { message: 'Email noto\'g\'ri formatda' })
  email: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^[+\d][\d\s\-().]{5,18}$/, { message: 'phone raqam noto\'g\'ri formatda' })
  phone?: string;

  @ApiProperty({ example: 'Secret123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Parol katta va kichik harf hamda raqam o\'z ichiga olishi kerak',
  })
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole, { message: 'Rol noto\'g\'ri' })
  role: UserRole;

  @ApiPropertyOptional({ description: 'Maktab ID (UUID)' })
  @IsOptional()
  @IsUUID('4', { message: 'schoolId UUID formatida bo\'lishi kerak' })
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Filial ID (UUID) — director uchun null' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId UUID formatida bo\'lishi kerak' })
  branchId?: string;
}
