import { IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SwitchBranchDto {
  /**
   * Yangi aktiv filial ID. null yoki yo'q bo'lsa — school-wide view (barcha filiallar).
   * Faqat director, super_admin uchun null ruxsat etiladi.
   */
  @ApiPropertyOptional({ description: 'Filial IDsi. Null = barcha filiallar ko\'rish (school-wide).' })
  @ValidateIf((o) => o.branchId !== null && o.branchId !== undefined)
  @IsUUID()
  @IsOptional()
  branchId?: string | null;
}
