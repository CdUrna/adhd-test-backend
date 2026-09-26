import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { AttemptStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import {
  CurrentReportResponse,
  ReportFaqResponse,
  ReportSectionResponse,
} from "./dto/current-report.response";

type StoredReportPayload = {
  disclaimer?: unknown;
  sections?: unknown;
  faq?: unknown;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(userId: string): Promise<CurrentReportResponse> {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: {
        userId,
        status: AttemptStatus.COMPLETED,
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      include: { reportSnapshot: true },
    });

    if (!attempt) {
      throw new NotFoundException("No completed test report was found");
    }

    if (
      !attempt.reportSnapshot ||
      attempt.score === null ||
      attempt.resultType === null ||
      attempt.completedAt === null
    ) {
      throw new InternalServerErrorException("Report data is incomplete");
    }

    const payload = attempt.reportSnapshot.payload as StoredReportPayload;

    return {
      attemptId: attempt.id,
      score: attempt.score,
      resultType: attempt.resultType,
      completedAt: attempt.completedAt.toISOString(),
      disclaimer: this.readDisclaimer(payload),
      sections: this.readSections(payload),
      faq: this.readFaq(payload),
    };
  }

  private readDisclaimer(payload: StoredReportPayload): string {
    return typeof payload.disclaimer === "string" ? payload.disclaimer : "";
  }

  private readSections(payload: StoredReportPayload): ReportSectionResponse[] {
    if (!Array.isArray(payload.sections)) {
      return [];
    }

    return payload.sections.flatMap((section) => {
      if (!this.isRecord(section)) {
        return [];
      }

      const { key, type, title, content, items, outro } = section;
      if (
        typeof key !== "string" ||
        typeof type !== "string" ||
        typeof title !== "string" ||
        typeof content !== "string"
      ) {
        return [];
      }

      return [{
        key,
        type,
        title,
        content,
        items: Array.isArray(items)
          ? items.filter((item): item is string => typeof item === "string")
          : undefined,
        outro: typeof outro === "string" ? outro : undefined,
      }];
    });
  }

  private readFaq(payload: StoredReportPayload): ReportFaqResponse[] {
    if (!Array.isArray(payload.faq)) {
      return [];
    }

    return payload.faq.flatMap((entry) => {
      if (!this.isRecord(entry)) {
        return [];
      }

      return typeof entry.question === "string" && typeof entry.answer === "string"
        ? [{ question: entry.question, answer: entry.answer }]
        : [];
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
