import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { DEFAULT_AUTH_COOKIE_NAME } from "../config/config.constants";
import { AUTH_MODE_KEY, type AuthMode } from "./auth.decorators";
import type {
  AuthTokenPayload,
  OptionallyAuthenticatedRequest,
} from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const mode =
      this.reflector.getAllAndOverride<AuthMode>(AUTH_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? "required";
    if (mode === "public") return true;

    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.config.get<string>(
      "AUTH_COOKIE_NAME",
      DEFAULT_AUTH_COOKIE_NAME,
    );
    const token = request.cookies?.[cookieName] as string | undefined;

    if (!token) {
      if (mode === "optional") return true;
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token);
      (request as OptionallyAuthenticatedRequest).auth = payload;
      return true;
    } catch {
      if (mode === "optional") return true;
      throw new UnauthorizedException();
    }
  }
}
