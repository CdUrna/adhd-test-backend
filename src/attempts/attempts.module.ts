import { Module } from "@nestjs/common";
import { ReportsModule } from "../reports/reports.module";
import { AttemptsController } from "./attempts.controller";
import { AttemptsService } from "./attempts.service";
import { AttemptIdempotencyService } from "./idempotency/attempt-idempotency.service";
import { ScoringService } from "./scoring.service";
import { AttemptValidatorService } from "./validation/attempt-validator.service";

@Module({
  imports: [ReportsModule],
  controllers: [AttemptsController],
  providers: [
    AttemptsService,
    AttemptIdempotencyService,
    AttemptValidatorService,
    ScoringService,
  ],
})
export class AttemptsModule {}
