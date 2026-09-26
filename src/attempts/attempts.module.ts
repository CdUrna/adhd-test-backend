import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AttemptsController } from "./attempts.controller";
import { AttemptsService } from "./attempts.service";
import { ScoringService } from "./scoring.service";

@Module({
  imports: [AuthModule],
  controllers: [AttemptsController],
  providers: [AttemptsService, ScoringService],
})
export class AttemptsModule {}
