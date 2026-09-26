import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import {
  cleanE2eDatabase,
  getE2eDatabaseUrl,
  prepareE2eDatabase,
  withE2eDatabase,
} from "./e2e-database.mjs";

const port = 4010;
const apiUrl = `http://localhost:${port}/api/v1`;
let serverOutput = "";
let server;

try {
  await prepareE2eDatabase();
  server = spawn(process.execPath, ["dist/main.js"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: getE2eDatabaseUrl(), PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  server.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
  await waitForApi();

  await expectStatus("/reports/current", 401);
  const quiz = await request("/quiz/current");
  assert.equal(quiz.questions.length > 0, true);
  assert.equal(JSON.stringify(quiz).includes("points"), false);

  await expectStatus("/attempts/complete", 400, {
    method: "POST",
    body: JSON.stringify({ quizVersionId: quiz.id, gender: "FEMALE", answers: [] }),
  });
  await expectStatus("/attempts/complete", 400, {
    method: "POST",
    body: JSON.stringify({
      quizVersionId: quiz.id,
      gender: "MALE",
      answers: quiz.questions.map((question) => ({
        questionId: question.id,
        value: "NOT_A_REAL_OPTION",
      })),
    }),
  });

  await withE2eDatabase((client) =>
    client.query("UPDATE quiz_versions SET status = 'ARCHIVED' WHERE id = $1", [
      quiz.id,
    ]),
  );
  try {
    await expectStatus("/attempts/complete", 400, {
      method: "POST",
      body: JSON.stringify(createCompletionBody(quiz, "MALE", 0)),
    });
  } finally {
    await withE2eDatabase((client) =>
      client.query("UPDATE quiz_versions SET status = 'PUBLISHED' WHERE id = $1", [
        quiz.id,
      ]),
    );
  }

  const guestCompletion = await completeQuiz(quiz, "FEMALE", 0);
  assert.equal(guestCompletion.nextStep, "AUTH_REQUIRED");
  assert.equal(typeof guestCompletion.claimToken, "string");
  assertNoResultLeak(guestCompletion);

  await expectStatus("/auth/register", 400, {
    method: "POST",
    body: JSON.stringify({
      email: `invalid-${crypto.randomUUID()}@example.com`,
      password: "StrongPass123!",
      claimToken: "invalid-claim-token",
    }),
  });
  await assertUserMissing("invalid-");

  const email = `e2e-${crypto.randomUUID()}@example.com`;
  const password = "StrongPass123!";
  const registrationResponse = await fetch(`${apiUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, claimToken: guestCompletion.claimToken }),
  });
  assert.equal(registrationResponse.status, 201);
  assert.equal((await registrationResponse.json()).attemptClaimed, true);
  assert.equal(registrationResponse.headers.getSetCookie().length > 0, true);

  const loginResponse = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(loginResponse.status, 200);
  assert.equal((await loginResponse.json()).attemptClaimed, false);
  assert.equal(loginResponse.headers.getSetCookie().length > 0, true);

  await expectStatus("/auth/login", 401, {
    method: "POST",
    body: JSON.stringify({ email, password: "WrongPass123!" }),
  });
  await expectStatus("/auth/register", 409, {
    method: "POST",
    body: JSON.stringify({ email, password, claimToken: guestCompletion.claimToken }),
  });
  await expectStatus("/auth/login", 400, {
    method: "POST",
    body: JSON.stringify({ email, password, claimToken: guestCompletion.claimToken }),
  });
  await expectStatus("/reports/current", 401, {
    headers: { Cookie: "adhd_session=invalid-token" },
  });
  await expectStatus("/reports/current", 401, {
    headers: { Cookie: createExpiredSessionCookie() },
  });

  const loginClaimCompletion = await completeQuiz(quiz, "FEMALE", 0);
  const loginClaimResponse = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      claimToken: loginClaimCompletion.claimToken,
    }),
  });
  assert.equal(loginClaimResponse.status, 200);
  assert.equal((await loginClaimResponse.json()).attemptClaimed, true);
  const loginSessionCookie = loginClaimResponse.headers
    .getSetCookie()[0]
    .split(";", 1)[0];

  const claimedReport = await request("/reports/current", {
    headers: { Cookie: loginSessionCookie },
  });
  assert.equal(claimedReport.attemptId, loginClaimCompletion.attemptId);
  assert.equal(claimedReport.resultType, "HIGH_ADHD_TRAITS");

  const retakeCompletion = await completeQuiz(
    quiz,
    "MALE",
    -1,
    loginSessionCookie,
  );
  assert.equal(retakeCompletion.nextStep, "REPORT_READY");
  assert.equal("claimToken" in retakeCompletion, false);
  assertNoResultLeak(retakeCompletion);

  const report = await request("/reports/current", {
    headers: { Cookie: loginSessionCookie },
  });
  assert.equal(report.attemptId, retakeCompletion.attemptId);
  assert.equal(report.score, 0);
  assert.equal(report.resultType, "LOW_ADHD_TRAITS");

  const expiringAttempt = await completeQuiz(quiz, "FEMALE", 0);
  await withE2eDatabase((client) =>
    client.query(
      "UPDATE quiz_attempts SET claim_token_expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1",
      [expiringAttempt.attemptId],
    ),
  );
  await expectStatus("/auth/register", 400, {
    method: "POST",
    body: JSON.stringify({
      email: `expired-${crypto.randomUUID()}@example.com`,
      password,
      claimToken: expiringAttempt.claimToken,
    }),
  });
  await assertUserMissing("expired-");

  console.log("E2E passed: positive flow, isolation, and negative security cases.");
} catch (error) {
  if (serverOutput) console.error(serverOutput);
  throw error;
} finally {
  await stopServer();
  await cleanE2eDatabase();
}

function completeQuiz(quiz, gender, optionIndex, cookie) {
  return request("/attempts/complete", {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : undefined,
    body: JSON.stringify(createCompletionBody(quiz, gender, optionIndex)),
  });
}

function createCompletionBody(quiz, gender, optionIndex) {
  return {
    quizVersionId: quiz.id,
    gender,
    answers: quiz.questions.map((question) => ({
      questionId: question.id,
      value: question.options.at(optionIndex).value,
    })),
  };
}

function assertNoResultLeak(body) {
  assert.equal("score" in body, false);
  assert.equal("resultType" in body, false);
}

async function assertUserMissing(emailPrefix) {
  const result = await withE2eDatabase((client) =>
    client.query("SELECT COUNT(*)::int AS count FROM users WHERE email LIKE $1", [
      `${emailPrefix}%`,
    ]),
  );
  assert.equal(result.rows[0].count, 0);
}

function createExpiredSessionCookie() {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: crypto.randomUUID(),
    email: "expired-session@example.com",
    iat: Math.floor(Date.now() / 1000) - 120,
    exp: Math.floor(Date.now() / 1000) - 60,
  });
  const signature = createHmac("sha256", process.env.AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  const cookieName = process.env.AUTH_COOKIE_NAME ?? "adhd_session";
  return `${cookieName}=${header}.${payload}.${signature}`;
}

async function request(path, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  assert.equal(response.ok, true, `${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function expectStatus(path, expectedStatus, init = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}`);
}

async function waitForApi() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`API exited before startup with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(`${apiUrl}/health`);
      if (response.ok) return;
    } catch {
      // The process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("API did not become ready in time");
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}
