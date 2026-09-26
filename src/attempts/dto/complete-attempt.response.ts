import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CompleteAttemptResponse {
  @ApiProperty({ format: "uuid" })
  attemptId!: string;

  @ApiPropertyOptional({ description: "One-time token used to claim the anonymous attempt" })
  claimToken?: string;

  @ApiPropertyOptional({ format: "date-time" })
  claimTokenExpiresAt?: string;

  @ApiProperty({ enum: ["AUTH_REQUIRED", "REPORT_READY"] })
  nextStep!: "AUTH_REQUIRED" | "REPORT_READY";
}
