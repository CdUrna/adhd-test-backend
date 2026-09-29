import { Controller, Get } from "@nestjs/common";
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/auth.decorators";
import { CurrentQuizResponse } from "./dto/current-quiz.response";
import { QuizService } from "./quiz.service";

@ApiTags("quiz")
@Public()
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
