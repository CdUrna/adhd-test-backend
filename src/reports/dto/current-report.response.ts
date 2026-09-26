import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ResultType } from "../../generated/prisma/enums";

export class ReportSectionResponse {
  @ApiProperty({ example: "understanding-score" })
  key!: string;

  @ApiProperty({ example: "text" })
  type!: string;

  @ApiProperty({ example: "Understanding Your Score" })
  title!: string;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional({ type: [String] })
  items?: string[];

  @ApiPropertyOptional()
  outro?: string;
}

export class ReportFaqResponse {
  @ApiProperty()
  question!: string;

  @ApiProperty()
  answer!: string;
}

export class CurrentReportResponse {
  @ApiProperty({ format: "uuid" })
  attemptId!: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  score!: number;

  @ApiProperty({ enum: ResultType })
  resultType!: ResultType;

  @ApiProperty({ format: "date-time" })
  completedAt!: string;

  @ApiProperty()
  disclaimer!: string;

  @ApiProperty({ type: [ReportSectionResponse] })
  sections!: ReportSectionResponse[];

  @ApiProperty({ type: [ReportFaqResponse] })
  faq!: ReportFaqResponse[];
}
