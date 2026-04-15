import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Optional,
} from '@nestjs/common';
import {
  IsString, IsNumber, IsOptional, IsBoolean, IsArray,
  IsIn, Min, Max, MinLength, MaxLength,
} from 'class-validator';
import * as mammoth from 'mammoth';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { AuditService } from '@/common/audit/audit.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateQuestionDto {
  @IsIn(['multiple_choice', 'true_false', 'short_answer', 'essay'])
  type: string;

  @IsString() @MinLength(3) @MaxLength(2000)
  text: string;

  @IsOptional() @IsNumber() @Min(0.5) @Max(100)
  points?: number;

  @IsOptional() @IsNumber() @Min(0)
  order?: number;

  @IsOptional() @IsString()
  explanation?: string;

  @IsOptional() @IsArray()
  options?: CreateOptionDto[];
}

export class CreateOptionDto {
  @IsString() @MinLength(1) @MaxLength(500)
  text: string;

  @IsOptional() @IsBoolean()
  isCorrect?: boolean;

  @IsOptional() @IsNumber() @Min(0)
  order?: number;
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() @MinLength(3)
  text?: string;

  @IsOptional() @IsNumber() @Min(0.5)
  points?: number;

  @IsOptional() @IsNumber() @Min(0)
  order?: number;

  @IsOptional() @IsString()
  explanation?: string;
}

export class StartSessionDto {
  // Hech qanday maydon talab qilinmaydi — studentId JWT'dan olinadi
}

export class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsOptional() @IsString()
  selectedOptionId?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  textAnswer?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const TEACHER_ROLES = [
  UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.SCHOOL_ADMIN, UserRole.VICE_PRINCIPAL,
];

@Injectable()
export class OnlineExamService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway: EventsGateway,
    @Optional() private readonly auditService: AuditService,
  ) {}

  // ─── Question Management ──────────────────────────────────────────────────

  async getQuestions(examId: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId: currentUser.schoolId! },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    return this.prisma.examQuestion.findMany({
      where: { examId },
      include: { options: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
  }

  async addQuestion(examId: string, dto: CreateQuestionDto, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId: currentUser.schoolId! },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    if (!TEACHER_ROLES.includes(currentUser.role as any)) {
      throw new ForbiddenException("Savol qo'shish huquqi yo'q");
    }

    // Order: mavjud savollar oxiriga qo'shish
    const lastOrder = await this.prisma.examQuestion.aggregate({
      where: { examId },
      _max: { order: true },
    });
    const order = dto.order ?? (lastOrder._max.order ?? 0) + 1;

    const question = await this.prisma.examQuestion.create({
      data: {
        examId,
        type:   dto.type as any,
        text:   dto.text,
        points: dto.points ?? 1,
        order,
        explanation: dto.explanation,
        options: dto.options?.length
          ? {
              create: dto.options.map((o, i) => ({
                text:      o.text,
                isCorrect: o.isCorrect ?? false,
                order:     o.order ?? i,
              })),
            }
          : undefined,
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    return question;
  }

  async updateQuestion(qId: string, dto: UpdateQuestionDto, currentUser: JwtPayload) {
    const q = await this.prisma.examQuestion.findFirst({
      where: { id: qId },
      include: { exam: { select: { schoolId: true } } },
    });
    if (!q || q.exam.schoolId !== currentUser.schoolId) throw new NotFoundException('Savol topilmadi');
    return this.prisma.examQuestion.update({ where: { id: qId }, data: dto });
  }

  async deleteQuestion(qId: string, currentUser: JwtPayload) {
    const q = await this.prisma.examQuestion.findFirst({
      where: { id: qId },
      include: { exam: { select: { schoolId: true } } },
    });
    if (!q || q.exam.schoolId !== currentUser.schoolId) throw new NotFoundException('Savol topilmadi');
    await this.prisma.examQuestion.delete({ where: { id: qId } });
    return { message: 'Savol o\'chirildi' };
  }

  // ─── DocX Import ──────────────────────────────────────────────────────────

  /**
   * Word hujjatidan savollarni avtomatik ajratib olish
   *
   * Format (qo'llab-quvvatlanadigan):
   * 1. Savol matni?
   * A) Variant 1
   * B) Variant 2
   * C) Variant 3 *       <- * belgisi to'g'ri javobni bildiradi
   * D) Variant 4
   *
   * To'g'ri / Noto'g'ri:
   * 2. Bu jumla to'g'rimi? [to'g'ri]
   */
  async importFromDocx(
    examId: string,
    buffer: Buffer,
    currentUser: JwtPayload,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId: currentUser.schoolId! },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    // DocX → raw text
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;

    const questions = this.parseDocxQuestions(rawText);
    if (questions.length === 0) {
      throw new BadRequestException(
        "Hujjatdan savollar topilmadi. Format: '1. Savol?' keyin A) B) C) D) variantlar",
      );
    }

    // Bazaga saqlash
    const lastOrder = await this.prisma.examQuestion.aggregate({
      where: { examId },
      _max: { order: true },
    });
    let order = (lastOrder._max.order ?? 0) + 1;

    const created: any[] = [];
    for (const q of questions) {
      const question = await this.prisma.examQuestion.create({
        data: {
          examId,
          type:    q.type as any,
          text:    q.text,
          points:  1,
          order:   order++,
          options: q.options?.length
            ? {
                create: q.options.map((o: any, i: number) => ({
                  text:      o.text,
                  isCorrect: o.isCorrect,
                  order:     i,
                })),
              }
            : undefined,
        },
        include: { options: true },
      });
      created.push(question);
    }

    return { imported: created.length, questions: created };
  }

  private parseDocxQuestions(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const questions: any[] = [];
    let current: any = null;

    const questionRe = /^(\d+)[.)]\s+(.+)/;
    const optionRe   = /^([A-D])[.)]\s+(.+)/i;
    const tfRe       = /\[(to'g'ri|noto'g'ri|true|false|ha|yo'q)\]/i;

    for (const line of lines) {
      // Yangi savol
      const qm = line.match(questionRe);
      if (qm) {
        if (current) questions.push(current);
        const text = qm[2];

        // To'g'ri/noto'g'ri savol?
        if (tfRe.test(text)) {
          const match = text.match(tfRe);
          const correct = /to'g'ri|true|ha/i.test(match![1]);
          current = {
            type: 'true_false',
            text: text.replace(tfRe, '').trim(),
            options: [
              { text: "To'g'ri",   isCorrect: correct },
              { text: "Noto'g'ri", isCorrect: !correct },
            ],
          };
        } else {
          current = { type: 'multiple_choice', text, options: [] };
        }
        continue;
      }

      // Variant
      if (current?.type === 'multiple_choice') {
        const om = line.match(optionRe);
        if (om) {
          const raw = om[2];
          const isCorrect = raw.endsWith('*');
          current.options.push({
            text:      isCorrect ? raw.slice(0, -1).trim() : raw.trim(),
            isCorrect,
          });
          continue;
        }
      }
    }
    if (current) questions.push(current);

    return questions;
  }

  // ─── Exam Sessions ────────────────────────────────────────────────────────

  async startSession(examId: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId: currentUser.schoolId!, isPublished: true },
      include: { questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi yoki nashr qilinmagan');
    if (!exam.questions.length) throw new BadRequestException('Imtihonda savollar yo\'q');

    // Avvalgi session bor?
    const existing = await this.prisma.examSession.findUnique({
      where: { examId_studentId: { examId, studentId: currentUser.sub } },
    });
    if (existing) {
      if (existing.status === 'submitted' || existing.status === 'graded') {
        throw new ConflictException('Siz bu imtihonni allaqachon topshirgansiz');
      }
      // in_progress: davom ettirish
      return {
        session: existing,
        questions: exam.questions.map(q => ({
          id: q.id, type: q.type, text: q.text, points: q.points, order: q.order,
          options: q.options.map(o => ({ id: o.id, text: o.text, order: o.order })),
          // isCorrect ko'rsatilmaydi
        })),
        exam: {
          id: exam.id, title: exam.title, duration: exam.duration,
          maxScore: exam.maxScore, scheduledAt: exam.scheduledAt,
        },
      };
    }

    // Yangi session
    const session = await this.prisma.examSession.create({
      data: {
        examId,
        studentId: currentUser.sub,
        schoolId:  currentUser.schoolId!,
        status:    'in_progress',
      },
    });

    // Real-time: teacher'ga bildiruv
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'exam:session:started', {
      examId,
      sessionId: session.id,
      studentId: currentUser.sub,
    });

    return {
      session,
      questions: exam.questions.map(q => ({
        id: q.id, type: q.type, text: q.text, points: q.points, order: q.order,
        options: q.options.map(o => ({ id: o.id, text: o.text, order: o.order })),
      })),
      exam: {
        id: exam.id, title: exam.title, duration: exam.duration,
        maxScore: exam.maxScore, scheduledAt: exam.scheduledAt,
      },
    };
  }

  async saveAnswer(sessionId: string, dto: SubmitAnswerDto, currentUser: JwtPayload) {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, studentId: currentUser.sub },
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    if (session.status !== 'in_progress') {
      throw new BadRequestException('Imtihon topshirilgan, javob o\'zgartirish mumkin emas');
    }

    return this.prisma.studentAnswer.upsert({
      where: { sessionId_questionId: { sessionId, questionId: dto.questionId } },
      create: {
        sessionId,
        questionId:      dto.questionId,
        selectedOptionId: dto.selectedOptionId,
        textAnswer:      dto.textAnswer,
        pointsEarned:    0,
      },
      update: {
        selectedOptionId: dto.selectedOptionId,
        textAnswer:       dto.textAnswer,
      },
    });
  }

  async submitSession(sessionId: string, currentUser: JwtPayload) {
    const session = await this.prisma.examSession.findFirst({
      where: { id: sessionId, studentId: currentUser.sub },
      include: {
        answers:  true,
        exam: {
          include: {
            questions: { include: { options: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Sessiya topilmadi');
    if (session.status !== 'in_progress') throw new BadRequestException('Imtihon allaqachon topshirilgan');

    // Auto-grading: multiple_choice va true_false
    let totalScore = 0;
    let totalPossible = 0;

    for (const q of session.exam.questions) {
      totalPossible += q.points;
      const answer = session.answers.find(a => a.questionId === q.id);
      if (!answer) continue;

      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        const correctOption = q.options.find(o => o.isCorrect);
        const isCorrect = correctOption?.id === answer.selectedOptionId;
        const earned = isCorrect ? q.points : 0;
        totalScore += earned;

        await this.prisma.studentAnswer.update({
          where: { id: answer.id },
          data: { isCorrect, pointsEarned: earned },
        });
      }
      // short_answer va essay → teacher qo'lda tekshiradi
    }

    const percentage = totalPossible > 0
      ? Math.round((totalScore / totalPossible) * 100 * 10) / 10
      : 0;

    const updated = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status:      'submitted',
        submittedAt: new Date(),
        score:       totalScore,
        percentage,
      },
    });

    // Real-time: teacher dashboard
    this.eventsGateway?.emitToSchool(session.schoolId, 'exam:session:submitted', {
      examId:    session.examId,
      sessionId: session.id,
      studentId: currentUser.sub,
      score:     totalScore,
      percentage,
    });

    return {
      session: updated,
      score:   totalScore,
      total:   totalPossible,
      percentage,
      message: 'Imtihon muvaffaqiyatli topshirildi!',
    };
  }

  async getSessionResult(sessionId: string, currentUser: JwtPayload) {
    const isTeacher = TEACHER_ROLES.includes(currentUser.role as any);

    const session = await this.prisma.examSession.findFirst({
      where: {
        id: sessionId,
        ...(!isTeacher ? { studentId: currentUser.sub } : { schoolId: currentUser.schoolId! }),
      },
      include: {
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
        },
        student: { select: { id: true, firstName: true, lastName: true } },
        exam:    { select: { id: true, title: true, maxScore: true } },
      },
    });
    if (!session) throw new NotFoundException('Natija topilmadi');

    return session;
  }

  async getExamSessions(examId: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId: currentUser.schoolId! },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    return this.prisma.examSession.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ status: 'asc' }, { submittedAt: 'asc' }],
    });
  }
}
