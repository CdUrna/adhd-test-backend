import "dotenv/config";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import pg from "pg";

const { Client } = pg;

export function getE2eDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const developmentUrl = new URL(process.env.DATABASE_URL);
  developmentUrl.pathname = "/adhd_test_e2e";
  return developmentUrl.toString();
}

export async function prepareE2eDatabase() {
  const databaseUrl = getValidatedE2eDatabaseUrl();
  await ensureDatabaseExists(databaseUrl);
  await resetPublicSchema(databaseUrl);
  runNode(["node_modules/prisma/build/index.js", "migrate", "deploy"], databaseUrl);
  await seedE2eDatabase(databaseUrl);
  console.log("E2E database prepared and seeded.");
}

export async function cleanE2eDatabase() {
  const databaseUrl = getValidatedE2eDatabaseUrl();
  await resetPublicSchema(databaseUrl);
  console.log("E2E database cleaned.");
}

export async function withE2eDatabase(callback) {
  const client = new Client({ connectionString: getValidatedE2eDatabaseUrl() });
  await client.connect();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

function getValidatedE2eDatabaseUrl() {
  const databaseUrl = getE2eDatabaseUrl();
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!/^[a-z0-9_]+_e2e$/i.test(databaseName)) {
    throw new Error(`Refusing to reset non-E2E database: ${databaseName}`);
  }
  return databaseUrl;
}

async function ensureDatabaseExists(databaseUrl) {
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    if (existing.rowCount === 0) {
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}

async function resetPublicSchema(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }
}

async function seedE2eDatabase(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  const options = [
    { value: "STRONGLY_AGREE", label: "Strongly agree", points: 4 },
    { value: "AGREE", label: "Agree", points: 3 },
    { value: "NEUTRAL", label: "Neutral", points: 2 },
    { value: "DISAGREE", label: "Disagree", points: 1 },
    { value: "STRONGLY_DISAGREE", label: "Strongly disagree", points: 0 },
  ];
  const questions = [
    ["loses_track_of_time", "I easily lose track of time when doing something I enjoy"],
    ["misplaces_everyday_items", "I often misplace things like my phone, keys, or wallet"],
    ["struggles_to_finish_tasks", "I frequently start tasks but struggle to finish them"],
    ["loses_focus_in_conversations", "I find it hard to stay focused during conversations or meetings"],
    ["forgets_daily_tasks", "I often forget about daily tasks like appointments or returning calls"],
  ];

  await client.connect();
  try {
    await client.query("BEGIN");
    const quiz = await client.query(
      `INSERT INTO quiz_versions
        (id, version, status, published_at, created_at, updated_at)
       VALUES (gen_random_uuid(), 1, 'PUBLISHED', NOW(), NOW(), NOW())
       RETURNING id`,
    );
    for (const [index, [questionKey, title]] of questions.entries()) {
      await client.query(
        `INSERT INTO questions
          (id, quiz_version_id, question_key, type, title, position, config, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'SINGLE_CHOICE', $3, $4, $5::jsonb, NOW())`,
        [quiz.rows[0].id, questionKey, title, index + 1, JSON.stringify({ options })],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

function runNode(args, databaseUrl) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: node ${args.join(" ")}`);
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const action = process.argv[2];
  if (action === "prepare") await prepareE2eDatabase();
  else if (action === "clean") await cleanE2eDatabase();
  else throw new Error("Expected action: prepare or clean");
}
