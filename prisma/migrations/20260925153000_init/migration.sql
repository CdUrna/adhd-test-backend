-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "QuizVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE');
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');
CREATE TYPE "ResultType" AS ENUM ('HIGH_ADHD_TRAITS', 'LOW_ADHD_TRAITS');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_versions" (
    "id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "QuizVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quiz_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "quiz_version_id" UUID NOT NULL,
    "question_key" VARCHAR(100) NOT NULL,
    "type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "quiz_version_id" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "gender" "Gender" NOT NULL,
    "score" INTEGER,
    "result_type" "ResultType",
    "claim_token_hash" TEXT,
    "claim_token_expires_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "question_key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "report_snapshots" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "report_version" INTEGER NOT NULL,
    "result_type" "ResultType" NOT NULL,
    "score" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "quiz_versions_version_key" ON "quiz_versions"("version");
CREATE INDEX "quiz_versions_status_idx" ON "quiz_versions"("status");
CREATE UNIQUE INDEX "quiz_versions_one_published_idx"
    ON "quiz_versions"("status") WHERE "status" = 'PUBLISHED';
CREATE INDEX "questions_question_key_idx" ON "questions"("question_key");
CREATE UNIQUE INDEX "questions_quiz_version_id_question_key_key"
    ON "questions"("quiz_version_id", "question_key");
CREATE UNIQUE INDEX "questions_quiz_version_id_position_key"
    ON "questions"("quiz_version_id", "position");
CREATE UNIQUE INDEX "quiz_attempts_claim_token_hash_key"
    ON "quiz_attempts"("claim_token_hash");
CREATE INDEX "quiz_attempts_user_id_completed_at_idx"
    ON "quiz_attempts"("user_id", "completed_at");
CREATE INDEX "quiz_attempts_quiz_version_id_idx"
    ON "quiz_attempts"("quiz_version_id");
CREATE INDEX "answers_attempt_id_idx" ON "answers"("attempt_id");
CREATE INDEX "answers_question_key_idx" ON "answers"("question_key");
CREATE UNIQUE INDEX "answers_attempt_id_question_id_key"
    ON "answers"("attempt_id", "question_id");
CREATE UNIQUE INDEX "report_snapshots_attempt_id_key"
    ON "report_snapshots"("attempt_id");

-- AddForeignKey
ALTER TABLE "questions"
    ADD CONSTRAINT "questions_quiz_version_id_fkey"
    FOREIGN KEY ("quiz_version_id") REFERENCES "quiz_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_version_id_fkey"
    FOREIGN KEY ("quiz_version_id") REFERENCES "quiz_versions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "answers"
    ADD CONSTRAINT "answers_attempt_id_fkey"
    FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "answers"
    ADD CONSTRAINT "answers_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "questions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "report_snapshots"
    ADD CONSTRAINT "report_snapshots_attempt_id_fkey"
    FOREIGN KEY ("attempt_id") REFERENCES "quiz_attempts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
