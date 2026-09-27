export type AttemptIdempotencyContext = {
  key: string;
  keyHash: string;
  requestHash: string;
  actorKey: string;
  isAnonymous: boolean;
};

export type AnonymousClaim = {
  claimToken: string;
  claimTokenHash: string;
  claimTokenExpiresAt: Date;
};

export type StoredIdempotentAttempt = {
  id: string;
  completedAt: Date | null;
  idempotencyRequestHash: string | null;
  idempotencyActorKey: string | null;
};
