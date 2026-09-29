import type { Prisma } from "../../generated/prisma/client";

export type ClaimAttemptInput = {
  claimToken: string;
  userId: string;
};

export type AttemptClaimTransaction = Prisma.TransactionClient;
