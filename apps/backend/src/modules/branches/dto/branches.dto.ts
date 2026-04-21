import {
  IsString, IsOptional, IsEmail, IsBoolean,
  MinLength, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'Chilonzor filiali', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'CHI', description: 'Qisqa kod (2-10 belgi, faqat harflar va raqamlar)' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{2,10}$/, { message: 'code faqat katta harflar va raqamlardan iborat bo\'lishi kerak (2-10 ta)' })
  code?: string;

  @ApiPropertyOptional({ example: 'Toshkent sh., Chilonzor tumani, 5-ko\'cha 12-uy' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'chilonzor@school.uz' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @ApiPropertyOptional({ example: true, description: 'Filialni faollashtirish / o\'chirish' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
