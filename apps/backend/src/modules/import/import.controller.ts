import {
  Controller, Post, Get, Param, Body, UploadedFile,
  UseInterceptors, Res, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ImportService, ImportRow } from './import.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BranchContext } from '@/common/decorators/branch-context.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

const MANAGERS = [UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL];

@ApiTags('import')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'import', version: '1' })
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  // ─── Namuna Excel fayllar ─────────────────────────────────────────────────

  @Get('templates/:type')
  @Roles(...MANAGERS, UserRole.ACCOUNTANT, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'Namuna Excel fayl yuklab olish' })
  async downloadTemplate(
    @Param('type') type: 'students' | 'users' | 'schedule' | 'grades' | 'attendance',
    @Res() res: Response,
  ) {
    const buffer = await this.importService.generateTemplate(type);
    const filename = `namuna_${type}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ─── O'quvchilar import ───────────────────────────────────────────────────

  @Post('students/parse')
  @Roles(...MANAGERS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "O'quvchilar Excel faylini tekshirish (preview)" })
  parseStudents(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseStudents(file.buffer);
  }

  @Post('students/commit')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "O'quvchilarni bazaga saqlash" })
  commitStudents(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.importService.commitStudents(body.rows, user, body.branchId ?? branchCtx);
  }

  // ─── Xodimlar import ──────────────────────────────────────────────────────

  @Post('users/parse')
  @Roles(UserRole.SCHOOL_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Xodimlar Excel faylini tekshirish (preview)' })
  parseUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseUsers(file.buffer);
  }

  @Post('users/commit')
  @Roles(UserRole.SCHOOL_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xodimlarni bazaga saqlash' })
  commitUsers(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.importService.commitUsers(body.rows, user, body.branchId ?? branchCtx);
  }

  // ─── Jadval import ────────────────────────────────────────────────────────

  @Post('schedule/parse')
  @Roles(...MANAGERS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Jadval Excel faylini tekshirish (preview)' })
  parseSchedule(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseSchedule(file.buffer, user);
  }

  @Post('schedule/commit')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Jadvalni bazaga saqlash' })
  commitSchedule(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.importService.commitSchedule(body.rows, user, body.branchId ?? branchCtx);
  }

  // ─── Baholar import ───────────────────────────────────────────────────────

  @Post('grades/parse')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Baholar Excel faylini tekshirish (preview)' })
  parseGrades(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseGrades(file.buffer);
  }

  @Post('grades/commit')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Baholarni bazaga saqlash' })
  commitGrades(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.importService.commitGrades(body.rows, user, body.branchId ?? branchCtx);
  }

  // ─── Davomat import ───────────────────────────────────────────────────────

  @Post('attendance/parse')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Davomat Excel faylini tekshirish (preview)' })
  parseAttendance(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseAttendance(file.buffer);
  }

  @Post('attendance/commit')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Davomatni bazaga saqlash' })
  commitAttendance(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload, @BranchContext() branchCtx: string | null) {
    return this.importService.commitAttendance(body.rows, user, body.branchId ?? branchCtx);
  }
}
