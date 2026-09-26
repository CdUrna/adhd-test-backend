import { Controller, Get } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CurrentQuizResponse } from "./dto/current-quiz.response";
import { QuizService } from "./quiz.service";

@ApiTags("quiz")
@Controller("quiz")
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get("current")
  @ApiOkResponse({ type: CurrentQuizResponse })
  @ApiNotFoundResponse({ description: "No published quiz is available" })
  getCurrent(): Promise<CurrentQuizResponse> {
    return this.quizService.getCurrent();
  }
}
