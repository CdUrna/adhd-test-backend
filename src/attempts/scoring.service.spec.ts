import { ResultType } from "../generated/prisma/enums";
import { calculateScore } from "./scoring";

describe("calculateScore", () => {
  it("classifies two positive answers as high traits", () => {
    const result = calculateScore([
      { value: "STRONGLY_AGREE", points: 4, maxPoints: 4 },
      { value: "AGREE", points: 3, maxPoints: 4 },
      { value: "NEUTRAL", points: 2, maxPoints: 4 },
      { value: "DISAGREE", points: 1, maxPoints: 4 },
      { value: "STRONGLY_DISAGREE", points: 0, maxPoints: 4 },
    ]);

    expect(result).toEqual({
      score: 50,
      resultType: ResultType.HIGH_ADHD_TRAITS,
    });
  });

  it("classifies fewer than two positive answers as low traits", () => {
    const result = calculateScore([
      { value: "AGREE", points: 3, maxPoints: 4 },
      { value: "NEUTRAL", points: 2, maxPoints: 4 },
      { value: "DISAGREE", points: 1, maxPoints: 4 },
      { value: "DISAGREE", points: 1, maxPoints: 4 },
      { value: "STRONGLY_DISAGREE", points: 0, maxPoints: 4 },
    ]);

    expect(result).toEqual({
      score: 35,
      resultType: ResultType.LOW_ADHD_TRAITS,
    });
  });

  it("keeps the score in the zero to one-hundred range", () => {
    expect(
      calculateScore([{ value: "AGREE", points: 8, maxPoints: 4 }]).score,
    ).toBe(100);
  });
});
