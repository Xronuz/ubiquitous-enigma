import {
  Controller, Post, UseInterceptors, UploadedFile,
  ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UploadService } from './upload.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@eduplatform/types';

@ApiTags('upload')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'upload', version: '1' })
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Avatar yuklash — foydalanuvchi profil rasmi
   */
  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Profil rasmi yuklash (max 5MB, JPEG/PNG/WebP)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.uploadService.uploadFile(file, 'avatars');
    return {
      message: 'Avatar muvaffaqiyatli yuklandi',
      url: result.url,
      key: result.key,
    };
  }

  /**
   * Umumiy hujjat yuklash (PDF, Excel, Word, CSV)
   */
  @Post('document')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiOperation({ summary: 'Hujjat yuklash (max 10MB, PDF/Excel/Word/CSV)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.uploadService.uploadFile(file, 'documents');
    return {
      message: 'Hujjat muvaffaqiyatli yuklandi',
      url: result.url,
      key: result.key,
      size: result.size,
      mimeType: result.mimeType,
    };
  }
}
