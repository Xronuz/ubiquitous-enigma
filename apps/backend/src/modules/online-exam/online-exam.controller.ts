import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UseGuards, UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator, Req, HttpCode, HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@eduplatform/types';
import {
  OnlineExamService,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAnswerDto,
} from './online-exam.service';

@UseGuards(JwtAuthGuard)
@Controller('online-exam')
export class OnlineExamController {
  constructor(private readonly service: OnlineExamService) {}

  // ─── Question Management ───────────────────────────────────────────────────

  /** GET /online-exam/:examId/questions — barcha savollar (teacher) */
  @Get(':examId/questions')
  getQuestions(
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getQuestions(examId, user);
  }

  /** POST /online-exam/:examId/questions — yangi savol qo'shish */
  @Post(':examId/questions')
  addQuestion(
    @Param('examId') examId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.addQuestion(examId, dto, user);
  }

  /** PUT /online-exam/:examId/questions/:qId — savolni tahrirlash */
  @Put(':examId/questions/:qId')
  updateQuestion(
    @Param('qId') qId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateQuestion(qId, dto, user);
  }

  /** DELETE /online-exam/:examId/questions/:qId — savolni o'chirish */
  @Delete(':examId/questions/:qId')
  @HttpCode(HttpStatus.OK)
  deleteQuestion(
    @Param('qId') qId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteQuestion(qId, user);
  }

  // ─── DocX Import ──────────────────────────────────────────────────────────

  /**
   * POST /online-exam/:examId/import-docx
   * multipart/form-data: file — .docx fayl
   */
  @Post(':examId/import-docx')
  @UseInterceptors(FileInterceptor('file'))
  importFromDocx(
    @Param('examId') examId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10 MB
          // .docx fayllari turli MIME yuborishi mumkin (macOS → application/zip)
          // Shuning uchun keng regex ishlatamiz; kengayma tekshirish servisda
          new FileTypeValidator({
            fileType: /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/msword|application\/zip|application\/x-zip|application\/octet-stream/,
          }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    // Kengaytma bo'yicha tekshirish (MIME turi ishonchsiz bo'lishi mumkin)
    const originalName = file.originalname?.toLowerCase() ?? '';
    if (!originalName.endsWith('.docx') && !originalName.endsWith('.doc')) {
      throw new BadRequestException('Faqat .docx yoki .doc fayl yuklansin');
    }
    return this.service.importFromDocx(examId, file.buffer, user);
  }

  // ─── Exam Sessions ────────────────────────────────────────────────────────

  /**
   * GET /online-exam/:examId/sessions — barcha sessiyalar (teacher)
   */
  @Get(':examId/sessions')
  getExamSessions(
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getExamSessions(examId, user);
  }

  /**
   * POST /online-exam/:examId/sessions/start — student imtihon boshlaydi
   */
  @Post(':examId/sessions/start')
  @HttpCode(HttpStatus.CREATED)
  startSession(
    @Param('examId') examId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.startSession(examId, user);
  }

  /**
   * POST /online-exam/sessions/:sessionId/answer — javob saqlash
   */
  @Post('sessions/:sessionId/answer')
  @HttpCode(HttpStatus.OK)
  saveAnswer(
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitAnswerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.saveAnswer(sessionId, dto, user);
  }

  /**
   * POST /online-exam/sessions/:sessionId/submit — imtihon topshirish
   */
  @Post('sessions/:sessionId/submit')
  @HttpCode(HttpStatus.OK)
  submitSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.submitSession(sessionId, user);
  }

  /**
   * GET /online-exam/sessions/:sessionId/result — natija
   */
  @Get('sessions/:sessionId/result')
  getSessionResult(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getSessionResult(sessionId, user);
  }
}
