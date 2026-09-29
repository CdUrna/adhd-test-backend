import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { AttemptStatus } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";
import type {
  AttemptClaimTransaction,
  ClaimAttemptInput,
} from "./attempt-claim.types";

@Injectable()
export class AttemptClaimService {
  constructor(private readonly prisma: PrismaService) {}

  claim(
    input: ClaimAttemptInput,
    transaction?: AttemptClaimTransaction,
  ): Promise<boolean> {
    const client = transaction ?? this.prisma;
    return this.claimWithClient(client, input);
  }

  private async claimWithClient(
    client: AttemptClaimTransaction | PrismaService,
    input: ClaimAttemptInput,
  ): Promise<boolean> {
    const claimTokenHash = createHash("sha256")
      .update(input.claimToken)
      .digest("hex");
    const attempt = await client.quizAttempt.findFirst({
      where: {
        claimTokenHash,
        claimTokenExpiresAt: { gt: new Date() },
        status: AttemptStatus.COMPLETED,
        userId: null,
      },
      select: { id: true },
    });

    if (!attempt) this.throwInvalidClaim();

    const claimed = await client.quizAttempt.updateMany({
      where: { id: attempt.id, userId: null, claimTokenHash },
      data: {
        userId: input.userId,
        claimTokenHash: null,
        claimTokenExpiresAt: null,
      },
    });

    if (claimed.count !== 1) this.throwInvalidClaim();
    return true;
  }

  private throwInvalidClaim(): never {
    throw new BadRequestException(
      "Claim token is invalid, expired, or already used",
    );
  }
}
