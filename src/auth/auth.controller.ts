import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";
import { AuthResponse, AuthUserResponse } from "./dto/auth.response";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  @ApiCreatedResponse({ type: AuthResponse })
  @ApiConflictResponse({ description: "Email is already registered" })
  @ApiBadRequestResponse({ description: "Claim token is invalid or expired" })
  async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(input);
    this.setAuthCookie(response, result.accessToken);

    return { user: result.user, attemptClaimed: result.attemptClaimed };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponse })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  @ApiBadRequestResponse({ description: "Claim token is invalid or expired" })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(input);
    this.setAuthCookie(response, result.accessToken);

    return { user: result.user, attemptClaimed: result.attemptClaimed };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(this.cookieName, this.cookieOptions);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOkResponse({ type: AuthUserResponse })
  @ApiUnauthorizedResponse()
  getMe(@Req() request: AuthenticatedRequest): Promise<AuthUserResponse> {
    return this.authService.getUser(request.auth.sub);
  }

  private setAuthCookie(response: Response, accessToken: string): void {
    response.cookie(this.cookieName, accessToken, {
      ...this.cookieOptions,
      maxAge: this.authTokenTtlSeconds * 1000,
    });
  }

  private get cookieName(): string {
    return this.config.get<string>("AUTH_COOKIE_NAME", "adhd_session");
  }

  private get authTokenTtlSeconds(): number {
    const configured = Number(
      this.config.get<string>("AUTH_TOKEN_TTL_SECONDS", "604800"),
    );
    return Number.isFinite(configured) && configured > 0 ? configured : 604800;
  }

  private get cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "lax" as const,
      path: "/",
    };
  }
}
