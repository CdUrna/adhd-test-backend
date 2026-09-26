import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AttemptsService } from "./attempts.service";
import type { OptionallyAuthenticatedRequest } from "../auth/auth.types";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt-auth.guard";
import { CompleteAttemptDto } from "./dto/complete-attempt.dto";
import { CompleteAttemptResponse } from "./dto/complete-attempt.response";

@ApiTags("attempts")
@Controller("attempts")
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post("complete")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiCreatedResponse({ type: CompleteAttemptResponse })
  @ApiBadRequestResponse({ description: "Answers are incomplete or invalid" })
  @ApiNotFoundResponse({ description: "Quiz version was not found" })
  complete(
    @Body() input: CompleteAttemptDto,
    @Req() request: OptionallyAuthenticatedRequest,
  ): Promise<CompleteAttemptResponse> {
    return this.attemptsService.complete(input, request.auth?.sub);
  }
}
