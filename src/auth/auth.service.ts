import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { AttemptClaimService } from "../attempts/claim/attempt-claim.service";
import { PrismaService } from "../prisma/prisma.service";
import { isUniqueConstraintError } from "../prisma/prisma-error.utils";
import { AuthResponse } from "./dto/auth.response";
import type { LoginInput, RegisterInput } from "./auth.types";

type AuthResult = AuthResponse & {
  accessToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly attemptClaims: AttemptClaimService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = this.normalizeEmail(input.email);
    const passwordHash = await hash(input.password, 12);

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { email, passwordHash },
          select: { id: true, email: true },
        });
        const attemptClaimed = await this.attemptClaims.claim(
          { userId: user.id, claimToken: input.claimToken },
          transaction,
        );

        return { user, attemptClaimed };
      });

      return {
        ...created,
        accessToken: await this.createAccessToken(created.user),
      };
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("Email is already registered");
      }

      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const email = this.normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const attemptClaimed = input.claimToken
      ? await this.prisma.$transaction((transaction) =>
          this.attemptClaims.claim(
            { userId: user.id, claimToken: input.claimToken! },
            transaction,
          ),
        )
      : false;

    return {
      user: { id: user.id, email: user.email },
      attemptClaimed,
      accessToken: await this.createAccessToken(user),
    };
  }

  async getUser(userId: string): Promise<AuthResponse["user"]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }

  private createAccessToken(user: {
    id: string;
    email: string;
  }): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
