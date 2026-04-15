-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'essay');
CREATE TYPE "SessionStatus" AS ENUM ('not_started', 'in_progress', 'submitted', 'timed_out', 'graded');

-- CreateTable: ExamQuestion
CREATE TABLE IF NOT EXISTS "exam_questions" (
  "id"          TEXT         NOT NULL,
  "examId"      TEXT         NOT NULL,
  "type"        "QuestionType" NOT NULL DEFAULT 'multiple_choice',
  "text"        TEXT         NOT NULL,
  "points"      DOUBLE PRECISION NOT NULL DEFAULT 1,
  "order"       INTEGER      NOT NULL DEFAULT 0,
  "mediaUrl"    TEXT,
  "explanation" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamOption
CREATE TABLE IF NOT EXISTS "exam_options" (
  "id"         TEXT    NOT NULL,
  "questionId" TEXT    NOT NULL,
  "text"       TEXT    NOT NULL,
  "isCorrect"  BOOLEAN NOT NULL DEFAULT false,
  "order"      INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "exam_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamSession
CREATE TABLE IF NOT EXISTS "exam_sessions" (
  "id"          TEXT            NOT NULL,
  "examId"      TEXT            NOT NULL,
  "studentId"   TEXT            NOT NULL,
  "schoolId"    TEXT            NOT NULL,
  "startedAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "timedOutAt"  TIMESTAMP(3),
  "status"      "SessionStatus" NOT NULL DEFAULT 'in_progress',
  "score"       DOUBLE PRECISION,
  "percentage"  DOUBLE PRECISION,
  "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)    NOT NULL,

  CONSTRAINT "exam_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StudentAnswer
CREATE TABLE IF NOT EXISTS "student_answers" (
  "id"               TEXT             NOT NULL,
  "sessionId"        TEXT             NOT NULL,
  "questionId"       TEXT             NOT NULL,
  "selectedOptionId" TEXT,
  "textAnswer"       TEXT,
  "isCorrect"        BOOLEAN,
  "pointsEarned"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "exam_sessions_examId_studentId_key" ON "exam_sessions"("examId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "student_answers_sessionId_questionId_key" ON "student_answers"("sessionId", "questionId");

-- Indexes
CREATE INDEX IF NOT EXISTS "exam_questions_examId_order_idx" ON "exam_questions"("examId", "order");
CREATE INDEX IF NOT EXISTS "exam_options_questionId_idx" ON "exam_options"("questionId");
CREATE INDEX IF NOT EXISTS "exam_sessions_examId_status_idx" ON "exam_sessions"("examId", "status");

-- Foreign keys
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_options" ADD CONSTRAINT "exam_options_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_examId_fkey"
  FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "exam_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_selectedOptionId_fkey"
  FOREIGN KEY ("selectedOptionId") REFERENCES "exam_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
