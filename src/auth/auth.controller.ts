import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
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
import type { CookieOptions, Response } from "express";
import {
  DEFAULT_AUTH_COOKIE_NAME,
  DEFAULT_AUTH_TOKEN_TTL_SECONDS,
} from "../config/config.constants";
import { getPositiveIntegerConfig } from "../config/config.utils";
import { Public } from "./auth.decorators";
import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";
import { AuthResponse, AuthUserResponse } from "./dto/auth.response";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post("register")
  @Public()
  @ApiCreatedResponse({ type: AuthResponse })
  @ApiConflictResponse({ description: "Email is already registered" })
  @ApiBadRequestResponse({ description: "Claim token is invalid or expired" })
  async register(
    @Body() input: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register({
      email: input.email,
      password: input.password,
      claimToken: input.claimToken,
    });
    this.setAuthCookie(response, result.accessToken);

    return { user: result.user, attemptClaimed: result.attemptClaimed };
  }

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponse })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  @ApiBadRequestResponse({ description: "Claim token is invalid or expired" })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login({
      email: input.email,
      password: input.password,
      claimToken: input.claimToken,
    });
    this.setAuthCookie(response, result.accessToken);

    return { user: result.user, attemptClaimed: result.attemptClaimed };
  }

  @Post("logout")
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(this.cookieName, this.cookieOptions);
  }

  @Get("me")
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
    return this.config.get<string>(
      "AUTH_COOKIE_NAME",
      DEFAULT_AUTH_COOKIE_NAME,
    );
  }

  private get authTokenTtlSeconds(): number {
    return getPositiveIntegerConfig(
      this.config,
      "AUTH_TOKEN_TTL_SECONDS",
      DEFAULT_AUTH_TOKEN_TTL_SECONDS,
    );
  }

  private get cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get<string>("AUTH_COOKIE_SECURE") === "true",
      sameSite: this.config.get<"lax" | "strict" | "none">(
        "AUTH_COOKIE_SAME_SITE",
        "lax",
      ),
      path: "/",
    };
  }
}
