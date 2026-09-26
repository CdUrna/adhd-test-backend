import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard";

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const configuredTtl = Number(
          config.get<string>("AUTH_TOKEN_TTL_SECONDS", "604800"),
        );
        const expiresIn = Number.isFinite(configuredTtl) && configuredTtl > 0
          ? configuredTtl
          : 604800;

        return {
          secret: config.getOrThrow<string>("AUTH_SECRET"),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, OptionalJwtAuthGuard],
  exports: [JwtAuthGuard, OptionalJwtAuthGuard, JwtModule],
})
export class AuthModule {}
