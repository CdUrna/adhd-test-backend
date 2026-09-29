import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { AttemptStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { isUniqueConstraintError } from "../prisma/prisma-error.utils";
import { ReportGeneratorService } from "../reports/generation/report-generator.service";
import { CompleteAttemptResponse } from "./dto/complete-attempt.response";
import type { CompleteAttemptInput } from "./attempts.types";
import { AttemptIdempotencyService } from "./idempotency/attempt-idempotency.service";
import { ScorableAnswer, ScoringService } from "./scoring.service";
import { AttemptValidatorService } from "./validation/attempt-validator.service";

@Injectable()
export class AttemptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly reportGenerator: ReportGeneratorService,
    private readonly validator: AttemptValidatorService,
    private readonly idempotency: AttemptIdempotencyService,
  ) {}

  async complete(
    input: CompleteAttemptInput,
    idempotencyKey: string | undefined,
    userId?: string,
  ): Promise<CompleteAttemptResponse> {
    const idempotency = this.idempotency.createContext(
      input,
      idempotencyKey,
      userId,
    );
    const replayedResponse = await this.idempotency.replay(idempotency);
    if (replayedResponse) return replayedResponse;

    const validatedAttempt = await this.validator.validate(input);
    const scoringInput: ScorableAnswer[] = validatedAttempt.answers.map(
      ({ value, points, maxPoints }) => ({ value, points, maxPoints }),
    );
    const result = this.scoring.calculate(scoringInput);
    const report = this.reportGenerator.generate(result.resultType);
    const completedAt = new Date();
    const claim = this.idempotency.createAnonymousClaim(
      idempotency,
      completedAt,
    );

    try {
      const attempt = await this.prisma.quizAttempt.create({
        data: {
          userId,
          quizVersionId: validatedAttempt.quizVersionId,
          gender: input.gender,
          status: AttemptStatus.COMPLETED,
          score: result.score,
          resultType: result.resultType,
          completedAt,
          claimTokenHash: claim?.claimTokenHash,
          claimTokenExpiresAt: claim?.claimTokenExpiresAt,
          idempotencyKeyHash: idempotency.keyHash,
          idempotencyRequestHash: idempotency.requestHash,
          idempotencyActorKey: idempotency.actorKey,
          answers: {
            create: validatedAttempt.answers.map((answer) => ({
              questionId: answer.questionId,
              questionKey: answer.questionKey,
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

      return this.idempotency.createResponse(
        attempt.id,
        idempotency,
        completedAt,
      );
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;

      const concurrentResponse = await this.idempotency.replay(idempotency);
      if (!concurrentResponse) throw error;
      return concurrentResponse;
    }
  }
}
