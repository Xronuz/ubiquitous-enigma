import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  originalName: string;
}

// Ruxsat etilgan MIME turlar
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private minioClient: Minio.Client | null = null;
  private bucket: string;
  private useLocal: boolean;
  private localUploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('MINIO_BUCKET', 'eduplatform');
    this.localUploadDir = path.join(process.cwd(), 'uploads');

    const endpoint = config.get('MINIO_ENDPOINT', 'localhost');
    const port = config.get<number>('MINIO_PORT', 9000);
    const accessKey = config.get('MINIO_ACCESS_KEY', '');
    const secretKey = config.get('MINIO_SECRET_KEY', '');

    // Agar MinIO credentials berilgan bo'lsa, MinIO ishlatiladi; aks holda local
    if (accessKey && secretKey && endpoint !== 'localhost') {
      try {
        this.minioClient = new Minio.Client({
          endPoint: endpoint,
          port: Number(port),
          useSSL: config.get('MINIO_USE_SSL', 'false') === 'true',
          accessKey,
          secretKey,
        });
        this.useLocal = false;
        this.logger.log('MinIO storage ishlatiladi');
      } catch {
        this.useLocal = true;
        this.logger.warn('MinIO ulanmadi — lokal storage ishlatiladi');
      }
    } else {
      this.useLocal = true;
      this.logger.log('Lokal fayl storage ishlatiladi');
      this.ensureLocalDir();
    }
  }

  private ensureLocalDir() {
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
  }

  /**
   * Faylni yuklash (rasm yoki hujjat)
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'general',
  ): Promise<UploadResult> {
    this.validateFile(file);

    const ext = path.extname(file.originalname).toLowerCase();
    const key = `${folder}/${uuidv4()}${ext}`;

    if (this.useLocal) {
      return this.uploadLocal(file, key, folder);
    }
    return this.uploadMinio(file, key);
  }

  /**
   * Faylni o'chirish
   */
  async deleteFile(key: string): Promise<void> {
    if (this.useLocal) {
      const filePath = path.join(this.localUploadDir, key);
      try {
        await fsPromises.unlink(filePath);
      } catch {
        this.logger.warn(`Fayl o'chirilamadi: ${key}`);
      }
      return;
    }

    try {
      await this.minioClient!.removeObject(this.bucket, key);
    } catch (err) {
      this.logger.warn(`MinIO dan fayl o'chirilamadi: ${key}`, err);
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private validateFile(file: Express.Multer.File) {
    const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES];

    if (!allAllowed.includes(file.mimetype)) {
      throw new InternalServerErrorException(
        `Ruxsat etilmagan fayl turi: ${file.mimetype}. Ruxsat: ${allAllowed.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new InternalServerErrorException(
        `Fayl hajmi ${MAX_FILE_SIZE / 1024 / 1024}MB dan oshmasligi kerak`,
      );
    }
  }

  private async uploadLocal(
    file: Express.Multer.File,
    key: string,
    folder: string,
  ): Promise<UploadResult> {
    this.ensureLocalDir();
    const dir = path.join(this.localUploadDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(this.localUploadDir, key);
    await fsPromises.writeFile(filePath, file.buffer);

    const baseUrl = this.config.get('APP_URL', 'http://localhost:3001');
    const url = `${baseUrl}/uploads/${key}`;

    this.logger.log(`Fayl lokal saqlandi: ${key}`);
    return {
      url,
      key,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  }

  private async uploadMinio(
    file: Express.Multer.File,
    key: string,
  ): Promise<UploadResult> {
    try {
      // Bucket mavjudligini tekshirish
      const exists = await this.minioClient!.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient!.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`MinIO bucket yaratildi: ${this.bucket}`);
      }

      await this.minioClient!.putObject(
        this.bucket,
        key,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

      const endpoint = this.config.get('MINIO_ENDPOINT', 'localhost');
      const port = this.config.get('MINIO_PORT', '9000');
      const ssl = this.config.get('MINIO_USE_SSL', 'false') === 'true';
      const protocol = ssl ? 'https' : 'http';
      const url = `${protocol}://${endpoint}:${port}/${this.bucket}/${key}`;

      this.logger.log(`Fayl MinIO ga yuklandi: ${key}`);
      return {
        url,
        key,
        size: file.size,
        mimeType: file.mimetype,
        originalName: file.originalname,
      };
    } catch (err) {
      this.logger.error('MinIO yuklash xatosi:', err);
      throw new InternalServerErrorException("Faylni saqlashda xatolik yuz berdi");
    }
  }
}
