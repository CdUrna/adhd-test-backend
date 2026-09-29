import { Controller, Get, Req } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CurrentReportResponse } from "./dto/current-report.response";
import { ReportsService } from "./reports.service";

@ApiTags("reports")
@ApiCookieAuth()
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("current")
  @ApiOkResponse({ type: CurrentReportResponse })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({ description: "No completed report was found" })
  getCurrent(
    @Req() request: AuthenticatedRequest,
  ): Promise<CurrentReportResponse> {
    return this.reportsService.getCurrent(request.auth.sub);
  }
}
