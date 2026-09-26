import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  QuestionType,
  QuizVersionStatus,
} from "../src/generated/prisma/enums";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const options = [
  { value: "STRONGLY_AGREE", label: "Strongly agree", points: 4 },
  { value: "AGREE", label: "Agree", points: 3 },
  { value: "NEUTRAL", label: "Neutral", points: 2 },
  { value: "DISAGREE", label: "Disagree", points: 1 },
  { value: "STRONGLY_DISAGREE", label: "Strongly disagree", points: 0 },
];

const questions = [
  {
    questionKey: "loses_track_of_time",
    title: "I easily lose track of time when doing something I enjoy",
    position: 1,
  },
  {
    questionKey: "misplaces_everyday_items",
    title: "I often misplace things like my phone, keys, or wallet",
    position: 2,
  },
  {
    questionKey: "struggles_to_finish_tasks",
    title: "I frequently start tasks but struggle to finish them",
    position: 3,
  },
  {
    questionKey: "loses_focus_in_conversations",
    title: "I find it hard to stay focused during conversations or meetings",
    position: 4,
  },
  {
    questionKey: "forgets_daily_tasks",
    title: "I often forget about daily tasks like appointments or returning calls",
    position: 5,
  },
];

async function main(): Promise<void> {
  const existing = await prisma.quizVersion.findUnique({
    where: { version: 1 },
  });

  if (existing) {
    console.log("Quiz version 1 already exists; seed skipped.");
    return;
  }

  await prisma.quizVersion.create({
    data: {
      version: 1,
      status: QuizVersionStatus.PUBLISHED,
      publishedAt: new Date(),
      questions: {
        create: questions.map((question) => ({
          ...question,
          type: QuestionType.SINGLE_CHOICE,
          config: { options },
        })),
      },
    },
  });

  console.log("Published quiz version 1 with five questions.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
