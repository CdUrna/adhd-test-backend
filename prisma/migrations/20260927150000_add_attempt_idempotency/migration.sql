ALTER TABLE "quiz_attempts"
ADD COLUMN "idempotency_key_hash" VARCHAR(64),
ADD COLUMN "idempotency_request_hash" VARCHAR(64),
ADD COLUMN "idempotency_actor_key" VARCHAR(100);

CREATE UNIQUE INDEX "quiz_attempts_idempotency_key_hash_key"
ON "quiz_attempts"("idempotency_key_hash");

ALTER TABLE "quiz_attempts"
ADD CONSTRAINT "quiz_attempts_idempotency_fields_check"
CHECK (
  ("idempotency_key_hash" IS NULL
    AND "idempotency_request_hash" IS NULL
    AND "idempotency_actor_key" IS NULL)
  OR
  ("idempotency_key_hash" IS NOT NULL
    AND "idempotency_request_hash" IS NOT NULL
    AND "idempotency_actor_key" IS NOT NULL)
);
