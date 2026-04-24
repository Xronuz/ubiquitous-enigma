import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SpendCoinsDto {
  @ApiProperty({ example: 'free_lesson', description: 'Do\'on mahsuloti ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;
}
