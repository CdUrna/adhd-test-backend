import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { AttemptStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { CurrentReportResponse } from "./dto/current-report.response";
import { ReportSnapshotParser } from "./parsing/report-snapshot.parser";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshotParser: ReportSnapshotParser,
  ) {}

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

    if (
      attempt.score !== attempt.reportSnapshot.score ||
      attempt.resultType !== attempt.reportSnapshot.resultType
    ) {
      throw new InternalServerErrorException("Report snapshot is inconsistent");
    }

    const payload = this.snapshotParser.parse(
      attempt.reportSnapshot.reportVersion,
      attempt.reportSnapshot.payload,
    );

    return {
      attemptId: attempt.id,
      score: attempt.score,
      resultType: attempt.resultType,
      completedAt: attempt.completedAt.toISOString(),
      disclaimer: payload.disclaimer,
      sections: payload.sections,
      faq: payload.faq,
    };
  }
}
