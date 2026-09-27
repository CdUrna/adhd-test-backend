import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac } from "node:crypto";
import { isUUID } from "class-validator";
import { Prisma } from "../../generated/prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CompleteAttemptDto } from "../dto/complete-attempt.dto";
import { CompleteAttemptResponse } from "../dto/complete-attempt.response";
import {
  AnonymousClaim,
  AttemptIdempotencyContext,
  StoredIdempotentAttempt,
} from "./attempt-idempotency.types";

@Injectable()
export class AttemptIdempotencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  createContext(
    input: CompleteAttemptDto,
    idempotencyKey: string | undefined,
    userId?: string,
  ): AttemptIdempotencyContext {
    if (!idempotencyKey || !isUUID(idempotencyKey, "4")) {
      throw new BadRequestException("Idempotency-Key must be a UUID v4");
    }

    return {
      key: idempotencyKey,
      keyHash: this.hash(idempotencyKey),
      requestHash: this.createRequestHash(input),
      actorKey: userId ? `user:${userId}` : "anonymous",
      isAnonymous: !userId,
    };
  }

  async replay(
    context: AttemptIdempotencyContext,
  ): Promise<CompleteAttemptResponse | null> {
    const attempt = await this.findAttempt(context.keyHash);
    return attempt ? this.toResponse(attempt, context) : null;
  }

  createAnonymousClaim(
    context: AttemptIdempotencyContext,
    completedAt: Date,
  ): AnonymousClaim | undefined {
    if (!context.isAnonymous) return undefined;

    const claimToken = this.createClaimToken(context.key);
    return {
      claimToken,
      claimTokenHash: this.hash(claimToken),
      claimTokenExpiresAt: this.getClaimTokenExpiry(completedAt),
    };
  }

  createResponse(
    attemptId: string,
    context: AttemptIdempotencyContext,
    completedAt: Date,
  ): CompleteAttemptResponse {
    if (!context.isAnonymous) {
      return { attemptId, nextStep: "REPORT_READY" };
    }

    return {
      attemptId,
      claimToken: this.createClaimToken(context.key),
      claimTokenExpiresAt: this.getClaimTokenExpiry(completedAt).toISOString(),
      nextStep: "AUTH_REQUIRED",
    };
  }

  isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    );
  }

  private findAttempt(keyHash: string) {
    return this.prisma.quizAttempt.findUnique({
      where: { idempotencyKeyHash: keyHash },
      select: {
        id: true,
        completedAt: true,
        idempotencyRequestHash: true,
        idempotencyActorKey: true,
      },
    });
  }

  private toResponse(
    attempt: StoredIdempotentAttempt,
    context: AttemptIdempotencyContext,
  ): CompleteAttemptResponse {
    if (
      attempt.idempotencyRequestHash !== context.requestHash ||
      attempt.idempotencyActorKey !== context.actorKey
    ) {
      throw new ConflictException(
        "Idempotency key was already used for another request",
      );
    }

    if (!context.isAnonymous) {
      return { attemptId: attempt.id, nextStep: "REPORT_READY" };
    }

    if (!attempt.completedAt) {
      throw new InternalServerErrorException(
        "Idempotent attempt is missing completion data",
      );
    }

    return this.createResponse(attempt.id, context, attempt.completedAt);
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

  private getClaimTokenExpiry(baseTime: Date): Date {
    const configuredTtl = Number(
      this.config.get<string>("CLAIM_TOKEN_TTL_MINUTES", "30"),
    );
    const ttlMinutes =
      Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : 30;

    return new Date(baseTime.getTime() + ttlMinutes * 60_000);
  }
}
