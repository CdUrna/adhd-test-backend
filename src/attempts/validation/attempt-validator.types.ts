export type StoredOption = {
  value?: unknown;
  label?: unknown;
  points?: unknown;
};

export type StoredQuestionConfig = {
  options?: StoredOption[];
};

export type ValidatedAttemptAnswer = {
  questionId: string;
  questionKey: string;
  value: string;
  points: number;
  maxPoints: number;
};

export type ValidatedAttempt = {
  quizVersionId: string;
  answers: ValidatedAttemptAnswer[];
};
