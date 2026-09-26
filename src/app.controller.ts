import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

@ApiTags("system")
@Controller("health")
export class AppController {
  @Get()
  @ApiOkResponse({ schema: { example: { status: "ok" } } })
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}
