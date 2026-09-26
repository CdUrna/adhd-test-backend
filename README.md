# ADHD Test Backend

Independent NestJS API for the ADHD test funnel.

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

The suite covers the guest registration and claim flow, authenticated retakes,
protected reports, incomplete or invalid answers, invalid/expired/reused claim
tokens, duplicate email, wrong password, invalid/expired sessions, transaction
rollback, and score/result non-disclosure.

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
the score on the server. For a guest it returns `AUTH_REQUIRED` plus an expiring
one-time claim token. For a user with a valid session it attaches the new attempt
to that account and returns `REPORT_READY`, so a retake does not require another
login. Neither response exposes the score or High/Low result.

Registration requires the one-time claim token returned by anonymous attempt
completion. Login can optionally claim a newly completed attempt for an existing
account. Successful authentication is stored in an HTTP-only cookie; JWT values
are never returned in response bodies.

The current report endpoint is cookie-protected and returns the report snapshot
for the user's latest completed attempt. Every retake creates a new row;
historical attempts and their snapshots remain unchanged.

## Initial architecture

- Published quiz versions are immutable.
- Every retake creates a new attempt.
- Anonymous attempts are claimed only through a hashed, expiring one-time token.
- Raw answers and a generated report snapshot are stored separately.
- High/Low and the numeric score remain hidden until the attempt belongs to an authenticated user.

## Environment

- `DATABASE_URL` — development/runtime PostgreSQL connection.
- `TEST_DATABASE_URL` — disposable E2E PostgreSQL database; its database name
  must end in `_e2e`.
- `AUTH_SECRET` — JWT signing secret.
- `AUTH_TOKEN_TTL_SECONDS` — session lifetime in seconds.
- `CLAIM_TOKEN_TTL_MINUTES` — anonymous claim-token lifetime in minutes.
- `FRONTEND_URL` — allowed credentialed CORS origin.
