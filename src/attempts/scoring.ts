import { ResultType } from "../generated/prisma/enums";

export type ScorableAnswer = {
  value: string;
  points: number;
  maxPoints: number;
};

export type ScoringResult = {
  score: number;
  resultType: ResultType;
};

const positiveValues = new Set(["AGREE", "STRONGLY_AGREE"]);

export function calculateScore(answers: ScorableAnswer[]): ScoringResult {
  const totalPoints = answers.reduce((sum, answer) => sum + answer.points, 0);
  const maximumPoints = answers.reduce(
    (sum, answer) => sum + answer.maxPoints,
    0,
  );
  const positiveAnswers = answers.filter((answer) =>
    positiveValues.has(answer.value),
  ).length;

  const normalizedScore =
    maximumPoints === 0 ? 0 : Math.round((totalPoints / maximumPoints) * 100);

  return {
    score: Math.max(0, Math.min(100, normalizedScore)),
    resultType:
      positiveAnswers >= 2
        ? ResultType.HIGH_ADHD_TRAITS
        : ResultType.LOW_ADHD_TRAITS,
  };
}
