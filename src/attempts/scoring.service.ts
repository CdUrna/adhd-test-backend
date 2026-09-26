import { Injectable } from "@nestjs/common";
import {
  calculateScore,
  ScorableAnswer,
  ScoringResult,
} from "./scoring";

export type { ScorableAnswer, ScoringResult } from "./scoring";

@Injectable()
export class ScoringService {
  calculate(answers: ScorableAnswer[]): ScoringResult {
    return calculateScore(answers);
  }
}
