import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { QuizVersionStatus } from "../../generated/prisma/enums";
import { PrismaService } from "../../prisma/prisma.service";
import type { CompleteAttemptInput } from "../attempts.types";
import { ValidatedAttempt } from "./attempt-validator.types";
import { parseQuestionOptions } from "./question-options.parser";

@Injectable()
export class AttemptValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(input: CompleteAttemptInput): Promise<ValidatedAttempt> {
    const quizVersion = await this.prisma.quizVersion.findUnique({
      where: { id: input.quizVersionId },
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!quizVersion) {
      throw new NotFoundException("Quiz version was not found");
    }

    if (quizVersion.status !== QuizVersionStatus.PUBLISHED) {
      throw new BadRequestException(
        "Quiz version is not available for completion",
      );
    }

    const answersByQuestion = new Map(
      input.answers.map((answer) => [answer.questionId, answer]),
    );

    if (
      answersByQuestion.size !== input.answers.length ||
      input.answers.length !== quizVersion.questions.length
    ) {
      throw new BadRequestException(
        "Every question must have exactly one answer",
      );
    }

    const answers = quizVersion.questions.map((question) => {
      const submitted = answersByQuestion.get(question.id);

      if (!submitted) {
        throw new BadRequestException(
          "Every question must have exactly one answer",
        );
      }

      const options = parseQuestionOptions(question.config);
      const selectedOption = options.find(
        (option) => option.value === submitted.value,
      );

      if (!selectedOption) {
        throw new BadRequestException(
          `Invalid answer for question ${question.questionKey}`,
        );
      }

      return {
        questionId: question.id,
        questionKey: question.questionKey,
        value: selectedOption.value,
        points: selectedOption.points,
        maxPoints: Math.max(...options.map((option) => option.points)),
      };
    });

    return { quizVersionId: quizVersion.id, answers };
  }
}
