import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AttemptClaimModule } from "../attempts/claim/attempt-claim.module";
import { DEFAULT_AUTH_TOKEN_TTL_SECONDS } from "../config/config.constants";
import { getPositiveIntegerConfig } from "../config/config.utils";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    AttemptClaimModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const expiresIn = getPositiveIntegerConfig(
          config,
          "AUTH_TOKEN_TTL_SECONDS",
          DEFAULT_AUTH_TOKEN_TTL_SECONDS,
        );

        return {
          secret: config.getOrThrow<string>("AUTH_SECRET"),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
  exports: [JwtModule],
})
export class AuthModule {}
