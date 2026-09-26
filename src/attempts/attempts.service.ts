import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import {
  AttemptStatus,
  QuizVersionStatus,
} from "../generated/prisma/enums";
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
    userId?: string,
  ): Promise<CompleteAttemptResponse> {
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
      throw new BadRequestException("Quiz version is not available for completion");
    }

    const answersByQuestion = new Map(
      input.answers.map((answer) => [answer.questionId, answer]),
    );

    if (
      answersByQuestion.size !== input.answers.length ||
      input.answers.length !== quizVersion.questions.length
    ) {
      throw new BadRequestException("Every question must have exactly one answer");
    }

    const validatedAnswers = quizVersion.questions.map((question) => {
      const submitted = answersByQuestion.get(question.id);

      if (!submitted) {
        throw new BadRequestException("Every question must have exactly one answer");
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
    const claimToken = userId ? undefined : randomBytes(32).toString("base64url");
    const claimTokenHash = claimToken
      ? createHash("sha256").update(claimToken).digest("hex")
      : undefined;
    const claimTokenExpiresAt = userId ? undefined : this.getClaimTokenExpiry();
    const completedAt = new Date();

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
  }

  private getStoredOptions(config: unknown): Array<{
    value: string;
    label: string;
    points: number;
  }> {
    const stored = config as StoredQuestionConfig;

    if (!Array.isArray(stored.options)) {
      throw new InternalServerErrorException("Question options are misconfigured");
    }

    const options = stored.options.flatMap((option) => {
      if (
        typeof option.value !== "string" ||
        typeof option.label !== "string" ||
        typeof option.points !== "number"
      ) {
        return [];
      }

      return [{ value: option.value, label: option.label, points: option.points }];
    });

    const values = new Set(options.map((option) => option.value));
    if (
      options.length === 0 ||
      values.size !== options.length ||
      options.some((option) => !Number.isFinite(option.points))
    ) {
      throw new InternalServerErrorException("Question options are misconfigured");
    }

    return options;
  }

  private getClaimTokenExpiry(): Date {
    const configuredTtl = Number(
      this.config.get<string>("CLAIM_TOKEN_TTL_MINUTES", "30"),
    );
    const ttlMinutes = Number.isFinite(configuredTtl) && configuredTtl > 0
      ? configuredTtl
      : 30;

    return new Date(Date.now() + ttlMinutes * 60_000);
  }

}
