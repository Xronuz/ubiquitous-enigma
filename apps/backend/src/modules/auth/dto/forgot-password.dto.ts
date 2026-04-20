import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@school.uz' })
  @Transform(({ value }) => value?.toLowerCase?.()?.trim())
  @IsEmail({}, { message: 'Email noto\'g\'ri formatda' })
  email: string;
}
