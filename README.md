# ADHD Test Backend

Independent NestJS API for the ADHD test funnel.

Frontend repository: [CdUrna/adhd-test-frontend](https://github.com/CdUrna/adhd-test-frontend)

## Prerequisites

- Node.js 24+
- pnpm 11+
- Docker

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up -d`. The project database is exposed
   on port `55432` to avoid conflicts with an existing local PostgreSQL service.
3. Install dependencies with `pnpm install`.
4. Generate Prisma Client with `pnpm prisma:generate`.
5. Apply committed migrations with `pnpm prisma:deploy`.
6. Seed the published quiz with `pnpm prisma:seed`.
7. Start the API with `pnpm start:dev`.

## Quality checks

Run `pnpm quality` while PostgreSQL is running. It executes lint, production
build, unit tests, and the API E2E suite.

E2E uses the separate `adhd_test_e2e` database from `TEST_DATABASE_URL`. The
runner validates the `_e2e` suffix before destructive setup, applies committed
migrations, inserts its own quiz fixture, and clears the test schema afterward.
Development data in `adhd_test` is not modified.

The suite covers registration and login claim flows, a regular login,
authenticated retakes, protected reports, archived quiz rejection, incomplete or
invalid answers, invalid/expired/reused claim tokens, duplicate email, wrong
password, invalid/expired sessions, transaction rollback, and score/result
non-disclosure. It also verifies sequential and concurrent completion retries,
payload conflicts, and reuse from a different authentication context.

The API is available at `http://localhost:4000/api/v1` and Swagger at
`http://localhost:4000/api/docs`.

## Available API

- `GET /api/v1/health`
- `GET /api/v1/quiz/current`
- `POST /api/v1/attempts/complete`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/reports/current`

The public quiz response intentionally omits scoring points.
Completion validates all answers against the stored quiz version and calculates
the score on the server. `POST /attempts/complete` requires a UUID v4
`Idempotency-Key` header. Retrying the same payload and authentication context
with the same key returns the original completion response; reusing the key for
another payload or user returns `409 Conflict`. For a guest, completion returns
`AUTH_REQUIRED` plus an expiring one-time claim token. For a user with a valid
session it attaches the new attempt to that account and returns `REPORT_READY`,
so a retake does not require another login. Neither response exposes the score
or High/Low result.

Registration requires the one-time claim token returned by anonymous attempt
completion. Login can optionally claim a newly completed attempt for an existing
account. Successful authentication is stored in an HTTP-only cookie; JWT values
are never returned in response bodies.

The current report endpoint is cookie-protected and returns the report snapshot
for the user's latest completed attempt. Every retake creates a new row;
historical attempts and their snapshots remain unchanged.

## Architecture

- Published quiz versions are immutable.
- Only a `PUBLISHED` quiz version accepts new completions.
- Every retake creates a new attempt.
- Anonymous attempts are claimed only through a hashed, expiring one-time token.
- Completion retries are deduplicated by a hashed idempotency key bound to the
  submitted payload and original authentication context.
- Attempt, answers, and the generated report snapshot are created atomically.
- Report generation and snapshot parsing are isolated from attempt orchestration.
  Snapshots carry a version, and unknown or malformed versions fail explicitly
  instead of returning partial report data.
- High/Low and the numeric score remain hidden until the attempt belongs to an authenticated user.
- Database checks enforce valid scores, positive ordering/version values, and
  consistency between attempt status and completion data.

The top level is organized by domain (`auth`, `quiz`, `attempts`, `reports`).
Nested folders are used only where a domain has a separate change boundary, such
as report `generation` and `parsing`; service-only folders would add navigation
without improving ownership.

`POST /attempts/complete` currently persists only completed attempts. The
`IN_PROGRESS` enum value is reserved for a future incremental-save flow. The
single `QuizVersion` aggregate is intentional for this test scope; a separate
`Quiz` parent should be introduced only when multiple independent tests are
required.

Completion idempotency is scoped to one submitted payload and its original
authentication context. A deliberate retake receives a new key and therefore
creates a new attempt, while a network retry reuses its persisted key.

## Design decisions and trade-offs

The data model is designed around one constraint: publishing a new quiz or
report implementation must not change the meaning of an attempt that has already
been completed.

| Decision | Why it was chosen | Advantages | Trade-offs |
| --- | --- | --- | --- |
| PostgreSQL with Prisma and committed migrations | Quiz attempts, users, answers, and report snapshots have relational invariants and must be reproducible in another environment. | Transactions, foreign keys, constraints, typed access, and deterministic schema deployment. | JSON fields are less convenient to query than fully normalized tables, and Prisma adds generated code and a migration workflow. |
| Immutable `QuizVersion` records with lifecycle states | Editing published questions in place would make historical answers ambiguous. | Every attempt points to the exact question set it used, while draft and archived versions remain explicit. | Correcting a published question requires a new version and operational discipline around publishing. |
| Store both `questionId` and stable `questionKey` on each answer | The relation validates the submitted question, while the stable key lets future report logic locate the same concept across quiz versions. | Supports historical analysis and future sections based on previous answers. | This is intentional denormalization, so write-time validation is required to keep both values consistent. |
| Store awarded points with the raw answer | Scoring rules may change after an attempt is completed. | Old scores remain explainable and do not need to be recalculated with new rules. | More data is duplicated, and changing a scoring bug does not automatically rewrite historical results. |
| Generate a versioned `ReportSnapshot` when completing an attempt | Report copy, structure, and generation rules are expected to evolve. | A user always sees the report that was produced for that attempt, and new payload versions can coexist with old ones. | Snapshots duplicate derived data and require a version-aware parser and migration strategy. |
| Create guest attempts and claim them with a hashed, expiring, one-time token | The quiz must work before registration without exposing result data. | Registration and sign-in can attach an already completed attempt; a database leak does not reveal usable raw claim tokens. | Expiration and one-time consumption add lifecycle handling, and abandoned guest attempts need a future retention policy. |
| Hash and persist an `Idempotency-Key` with the request and actor fingerprints | A successful completion response can be lost, causing the browser to retry an operation that already committed. | Sequential and concurrent retries return the same attempt, while changed payloads or users cannot reuse the key. The guest claim token is reconstructed with HMAC instead of being stored in plaintext. | The frontend must persist the key until it receives a response, old idempotency records need the same retention policy as attempts, and a deliberate retake must create a new key. |
| Calculate the score only on the server and omit points from the public quiz | Client input is untrusted and the result is gated until authentication. | A modified frontend cannot choose its score, and anonymous responses reveal neither score nor High/Low. | Completing the quiz requires backend availability; offline scoring is intentionally unsupported. |
| Persist the attempt, answers, and report snapshot in one transaction | A partial completion would leave contradictory data. | The system either stores the entire completed result or nothing. | The transaction contains more work and must remain short as report generation grows. |
| Keep every retake as a new attempt and select the latest completed report | Future report sections may need previous answers, and the task says the current result should update. | The latest report changes without destroying history, enabling trends and future longitudinal logic. | Storage grows over time and product rules must define what “latest” means if attempts can be completed concurrently. |
| Use an HTTP-only JWT cookie instead of returning a token in JSON | The browser application does not need direct access to authentication credentials. | Simple stateless authentication with less exposure to token-reading client code. | Immediate global revocation needs additional state, and cross-site cookies require HTTPS, CSRF protection, and stricter configuration. |
| Start with one `QuizVersion` aggregate and a simple High/Low threshold | The test task contains one quiz and explicitly allows custom result logic. | Small, understandable implementation with clear extension points. | Multiple independent tests would require a parent `Quiz` entity, and clinically meaningful scoring would require validated domain rules. |
| Do not implement email verification, password reset, or incremental answer saving | These features are outside the requested scope and would add infrastructure unrelated to demonstrating the core flow. | Keeps the solution reviewable and focused on the required journey. | Accounts are not email-verified, passwords cannot be recovered, and an unfinished quiz exists only in browser storage. |

The main rejected alternative was recalculating reports from the current quiz and
current generator on every read. It would store less data, but any future rule or
content change could silently alter an old user's report, which conflicts with
the evolution requirements of the task.

## Data model

- `User` stores normalized email and a bcrypt password hash.
- `QuizVersion` represents an immutable version of the test and has a lifecycle
  status (`DRAFT`, `PUBLISHED`, or `ARCHIVED`).
- `Question` belongs to a specific quiz version and stores stable keys, display
  order, and answer configuration.
- `QuizAttempt` belongs to a quiz version and optionally to a user. Every retake
  creates a new attempt, preserving the previous result. Optional idempotency
  fingerprints are nullable only for attempts created before the feature was
  introduced.
- `Answer` stores both the question relation and stable question key together
  with the submitted value and awarded points.
- `ReportSnapshot` is a one-to-one, versioned report payload for an attempt. It
  freezes the score, result type, sections, and FAQ shown for that completion.

Relations use restrictive deletion rules so historical attempts cannot silently
lose the quiz questions or users they depend on.

## Evolution strategy

- Question changes are published as a new `QuizVersion`; existing attempts stay
  linked to the exact version that was completed.
- Raw answers are retained for every attempt, including stable question keys,
  so future report sections can use answers from current or previous attempts.
- Each completed attempt stores a `ReportSnapshot`. Updating report copy or
  generation rules therefore does not rewrite reports produced by older logic.
- The snapshot has an explicit `reportVersion` and a strict version-aware
  parser. A future payload shape can be introduced alongside the current one.
- The current generator uses the calculated High/Low result. Its isolated
  generation boundary can later receive individual answers or user history
  without changing attempt orchestration or public API contracts.

## Environment

- `DATABASE_URL` — development/runtime PostgreSQL connection.
- `TEST_DATABASE_URL` — disposable E2E PostgreSQL database; its database name
  must end in `_e2e`.
- `AUTH_SECRET` — JWT signing secret.
- `AUTH_TOKEN_TTL_SECONDS` — session lifetime in seconds.
- `CLAIM_TOKEN_TTL_MINUTES` — anonymous claim-token lifetime in minutes.
- `FRONTEND_URL` — allowed credentialed CORS origin.
- `AUTH_COOKIE_SAME_SITE` — `lax`, `strict`, or `none`.
- `AUTH_COOKIE_SECURE` — whether the session cookie requires HTTPS. It must be
  `true` when `AUTH_COOKIE_SAME_SITE=none`.

Runtime configuration is validated during application startup. For a same-site
deployment, the default `SameSite=lax` policy is sufficient. A cross-site
deployment needs `SameSite=none`, HTTPS, and an explicit CSRF strategy before it
is production-ready.
