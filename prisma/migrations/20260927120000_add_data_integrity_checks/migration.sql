ALTER TABLE "quiz_versions"
ADD CONSTRAINT "quiz_versions_version_positive" CHECK ("version" > 0);

ALTER TABLE "questions"
ADD CONSTRAINT "questions_position_positive" CHECK ("position" > 0);

ALTER TABLE "quiz_attempts"
ADD CONSTRAINT "quiz_attempts_score_range"
CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100);

ALTER TABLE "quiz_attempts"
ADD CONSTRAINT "quiz_attempts_completion_consistency"
CHECK (
  (
    "status" = 'IN_PROGRESS'
    AND "completed_at" IS NULL
    AND "score" IS NULL
    AND "result_type" IS NULL
  )
  OR
  (
    "status" = 'COMPLETED'
    AND "completed_at" IS NOT NULL
    AND "score" IS NOT NULL
    AND "result_type" IS NOT NULL
  )
);

ALTER TABLE "report_snapshots"
ADD CONSTRAINT "report_snapshots_version_positive" CHECK ("report_version" > 0);

ALTER TABLE "report_snapshots"
ADD CONSTRAINT "report_snapshots_score_range" CHECK ("score" BETWEEN 0 AND 100);
