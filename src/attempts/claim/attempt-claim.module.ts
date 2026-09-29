import { Module } from "@nestjs/common";
import { AttemptClaimService } from "./attempt-claim.service";

@Module({
  providers: [AttemptClaimService],
  exports: [AttemptClaimService],
})
export class AttemptClaimModule {}
