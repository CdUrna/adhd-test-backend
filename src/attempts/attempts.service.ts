import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac } from "node:crypto";
import { isUUID } from "class-validator";
import { AttemptStatus, QuizVersionStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ReportGeneratorService } from "../reports/generation/report-generator.service";
import { CompleteAttemptDto } from "./dto/complete-attempt.dto";
import { CompleteAttemptResponse } from "./dto/complete-attempt.response";
import { ScorableAnswer, ScoringService } from "./scoring.service";

type StoredOption = {
  value?: unknown;
  label?: unknown;
  points?: unknown;
};

type StoredQuestionConfig = {
  options?: StoredOption[];
};

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly scoring: ScoringService,
    private readonly reportGenerator: ReportGeneratorService,
  ) {}

  async complete(
    input: CompleteAttemptDto,
    idempotencyKey: string | undefined,
    userId?: string,
  ): Promise<CompleteAttemptResponse> {
    if (!idempotencyKey || !isUUID(idempotencyKey, "4")) {
      throw new BadRequestException("Idempotency-Key must be a UUID v4");
    }

    const idempotencyKeyHash = this.hash(idempotencyKey);
    const requestHash = this.createRequestHash(input);
    const actorKey = userId ? `user:${userId}` : "anonymous";
    const existingAttempt =
      await this.findIdempotentAttempt(idempotencyKeyHash);

    if (existingAttempt) {
      return this.replayIdempotentResponse(
        existingAttempt,
        idempotencyKey,
        requestHash,
        actorKey,
      );
    }

    const quizVersion = await this.prisma.quizVersion.findUnique({
      where: { id: input.quizVersionId },
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!quizVersion) {
      throw new NotFoundException("Quiz version was not found");
    }

    if (quizVersion.status !== QuizVersionStatus.PUBLISHED) {
      throw new BadRequestException(
        "Quiz version is not available for completion",
      );
    }

    const answersByQuestion = new Map(
      input.answers.map((answer) => [answer.questionId, answer]),
    );

    if (
      answersByQuestion.size !== input.answers.length ||
      input.answers.length !== quizVersion.questions.length
    ) {
      throw new BadRequestException(
        "Every question must have exactly one answer",
      );
    }

    const validatedAnswers = quizVersion.questions.map((question) => {
      const submitted = answersByQuestion.get(question.id);

      if (!submitted) {
        throw new BadRequestException(
          "Every question must have exactly one answer",
        );
      }

      const options = this.getStoredOptions(question.config);
      const selectedOption = options.find(
        (option) => option.value === submitted.value,
      );

      if (!selectedOption) {
        throw new BadRequestException(
          `Invalid answer for question ${question.questionKey}`,
        );
      }

      return {
        question,
        value: selectedOption.value,
        points: selectedOption.points,
        maxPoints: Math.max(...options.map((option) => option.points)),
      };
    });

    const scoringInput: ScorableAnswer[] = validatedAnswers.map((answer) => ({
      value: answer.value,
      points: answer.points,
      maxPoints: answer.maxPoints,
    }));
    const result = this.scoring.calculate(scoringInput);
    const report = this.reportGenerator.generate(result.resultType);
    const completedAt = new Date();
    const claimToken = userId
      ? undefined
      : this.createClaimToken(idempotencyKey);
    const claimTokenHash = claimToken ? this.hash(claimToken) : undefined;
    const claimTokenExpiresAt = userId
      ? undefined
      : this.getClaimTokenExpiry(completedAt);

    try {
      const attempt = await this.prisma.quizAttempt.create({
        data: {
          userId,
          quizVersionId: quizVersion.id,
          gender: input.gender,
          status: AttemptStatus.COMPLETED,
          score: result.score,
          resultType: result.resultType,
          completedAt,
          claimTokenHash,
          claimTokenExpiresAt,
          idempotencyKeyHash,
          idempotencyRequestHash: requestHash,
          idempotencyActorKey: actorKey,
          answers: {
            create: validatedAnswers.map((answer) => ({
              questionId: answer.question.id,
              questionKey: answer.question.questionKey,
              value: answer.value,
              points: answer.points,
            })),
          },
          reportSnapshot: {
            create: {
              reportVersion: report.reportVersion,
              resultType: result.resultType,
              score: result.score,
              payload: report.payload as Prisma.InputJsonValue,
            },
          },
        },
        select: { id: true },
      });

      if (userId) {
        return { attemptId: attempt.id, nextStep: "REPORT_READY" };
      }

      return {
        attemptId: attempt.id,
        claimToken,
        claimTokenExpiresAt: claimTokenExpiresAt?.toISOString(),
        nextStep: "AUTH_REQUIRED",
      };
    } catch (error) {
      if (!this.isUniqueConstraintError(error)) throw error;

      const concurrentAttempt =
        await this.findIdempotentAttempt(idempotencyKeyHash);
      if (!concurrentAttempt) throw error;

      return this.replayIdempotentResponse(
        concurrentAttempt,
        idempotencyKey,
        requestHash,
        actorKey,
      );
    }
  }

  private findIdempotentAttempt(idempotencyKeyHash: string) {
    return this.prisma.quizAttempt.findUnique({
      where: { idempotencyKeyHash },
      select: {
        id: true,
        completedAt: true,
        idempotencyRequestHash: true,
        idempotencyActorKey: true,
      },
    });
  }

  private replayIdempotentResponse(
    attempt: {
      id: string;
      completedAt: Date | null;
      idempotencyRequestHash: string | null;
      idempotencyActorKey: string | null;
    },
    idempotencyKey: string,
    requestHash: string,
    actorKey: string,
  ): CompleteAttemptResponse {
    if (
      attempt.idempotencyRequestHash !== requestHash ||
      attempt.idempotencyActorKey !== actorKey
    ) {
      throw new ConflictException(
        "Idempotency key was already used for another request",
      );
    }

    if (actorKey !== "anonymous") {
      return { attemptId: attempt.id, nextStep: "REPORT_READY" };
    }

    if (!attempt.completedAt) {
      throw new InternalServerErrorException(
        "Idempotent attempt is missing completion data",
      );
    }

    return {
      attemptId: attempt.id,
      claimToken: this.createClaimToken(idempotencyKey),
      claimTokenExpiresAt: this.getClaimTokenExpiry(
        attempt.completedAt,
      ).toISOString(),
      nextStep: "AUTH_REQUIRED",
    };
  }

  private createRequestHash(input: CompleteAttemptDto): string {
    const canonicalPayload = {
      quizVersionId: input.quizVersionId,
      gender: input.gender,
      answers: [...input.answers]
        .sort((left, right) => left.questionId.localeCompare(right.questionId))
        .map(({ questionId, value }) => ({ questionId, value })),
    };

    return this.hash(JSON.stringify(canonicalPayload));
  }

  private createClaimToken(idempotencyKey: string): string {
    return createHmac("sha256", this.config.getOrThrow<string>("AUTH_SECRET"))
      .update(`attempt-claim:${idempotencyKey}`)
      .digest("base64url");
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private getStoredOptions(config: unknown): Array<{
    value: string;
    label: string;
    points: number;
  }> {
    const stored = config as StoredQuestionConfig;

    if (!Array.isArray(stored.options)) {
      throw new InternalServerErrorException(
        "Question options are misconfigured",
      );
    }

    const options = stored.options.flatMap((option) => {
      if (
        typeof option.value !== "string" ||
        typeof option.label !== "string" ||
        typeof option.points !== "number"
      ) {
        return [];
      }

      return [
        { value: option.value, label: option.label, points: option.points },
      ];
    });

    const values = new Set(options.map((option) => option.value));
    if (
      options.length === 0 ||
      values.size !== options.length ||
      options.some((option) => !Number.isFinite(option.points))
    ) {
      throw new InternalServerErrorException(
        "Question options are misconfigured",
      );
    }

    return options;
  }

  private getClaimTokenExpiry(baseTime = new Date()): Date {
    const configuredTtl = Number(
      this.config.get<string>("CLAIM_TOKEN_TTL_MINUTES", "30"),
    );
    const ttlMinutes =
      Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 30;

    return new Date(baseTime.getTime() + ttlMinutes * 60_000);
  }
}
