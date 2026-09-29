import type { Gender } from "../generated/prisma/enums";

export type CompleteAttemptAnswer = {
  questionId: string;
  value: string;
};

export type CompleteAttemptInput = {
  quizVersionId: string;
  gender: Gender;
  answers: CompleteAttemptAnswer[];
};
