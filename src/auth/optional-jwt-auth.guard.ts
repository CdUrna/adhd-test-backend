import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type {
  AuthTokenPayload,
  OptionallyAuthenticatedRequest,
} from "./auth.types";

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.config.get<string>("AUTH_COOKIE_NAME", "adhd_session");
    const token = request.cookies?.[cookieName] as string | undefined;

    if (!token) {
      return true;
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token);
      (request as OptionallyAuthenticatedRequest).auth = payload;
    } catch {
      // An absent or stale session should not prevent an anonymous completion.
    }

    return true;
  }
}
