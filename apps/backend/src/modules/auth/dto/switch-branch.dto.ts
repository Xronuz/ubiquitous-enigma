import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SwitchBranchDto {
  /**
   * Yangi aktiv filial ID. null yoki yo'q bo'lsa — school-wide view (barcha filiallar).
   * Faqat director, super_admin, branch_admin uchun ishlaydi.
   */
  @ApiPropertyOptional({ description: 'Filial IDsi. Null = barcha filiallar ko\'rish (school-wide).' })
  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}
