import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@school.uz' })
  @IsEmail({}, { message: 'Email noto\'g\'ri formatda' })
  email: string;
}
