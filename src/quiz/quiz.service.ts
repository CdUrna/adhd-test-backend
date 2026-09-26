import { Injectable, NotFoundException } from "@nestjs/common";
import { QuizVersionStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import {
  CurrentQuizResponse,
  QuizOptionResponse,
} from "./dto/current-quiz.response";

type StoredQuestionConfig = {
  options?: Array<{
    value?: unknown;
    label?: unknown;
    points?: unknown;
  }>;
};

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(): Promise<CurrentQuizResponse> {
    const quiz = await this.prisma.quizVersion.findFirst({
      where: { status: QuizVersionStatus.PUBLISHED },
      orderBy: { version: "desc" },
      include: {
        questions: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException("No published quiz is available");
    }

    return {
      id: quiz.id,
      version: quiz.version,
      questions: quiz.questions.map((question) => ({
        id: question.id,
        key: question.questionKey,
        type: question.type,
        title: question.title,
        position: question.position,
        options: this.toPublicOptions(question.config),
      })),
    };
  }

  private toPublicOptions(config: unknown): QuizOptionResponse[] {
    const stored = config as StoredQuestionConfig;

    if (!Array.isArray(stored.options)) {
      return [];
    }

    return stored.options.flatMap((option) => {
      if (typeof option.value !== "string" || typeof option.label !== "string") {
        return [];
      }

      return [{ value: option.value, label: option.label }];
    });
  }
}
