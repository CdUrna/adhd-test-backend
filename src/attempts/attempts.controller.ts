import { Body, Controller, Headers, Post, Req } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AttemptsService } from "./attempts.service";
import type { OptionallyAuthenticatedRequest } from "../auth/auth.types";
import { OptionalAuth } from "../auth/auth.decorators";
import { CompleteAttemptDto } from "./dto/complete-attempt.dto";
import { CompleteAttemptResponse } from "./dto/complete-attempt.response";

@ApiTags("attempts")
@Controller("attempts")
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post("complete")
  @OptionalAuth()
  @ApiHeader({
    name: "Idempotency-Key",
    description: "A UUID v4 reused when retrying the same completion request",
    required: true,
  })
  @ApiCreatedResponse({ type: CompleteAttemptResponse })
  @ApiBadRequestResponse({ description: "Answers are incomplete or invalid" })
  @ApiConflictResponse({
    description: "Idempotency key was reused for another request",
  })
  @ApiNotFoundResponse({ description: "Quiz version was not found" })
  complete(
    @Body() input: CompleteAttemptDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() request: OptionallyAuthenticatedRequest,
  ): Promise<CompleteAttemptResponse> {
    return this.attemptsService.complete(
      {
        quizVersionId: input.quizVersionId,
        gender: input.gender,
        answers: input.answers.map(({ questionId, value }) => ({
          questionId,
          value,
        })),
      },
      idempotencyKey,
      request.auth?.sub,
    );
  }
}
