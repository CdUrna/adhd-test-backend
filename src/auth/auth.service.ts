import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { createHash } from "node:crypto";
import { AttemptStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthResponse } from "./dto/auth.response";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

type AuthResult = AuthResponse & {
  accessToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResult> {
    const email = this.normalizeEmail(input.email);
    const passwordHash = await hash(input.password, 12);

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { email, passwordHash },
          select: { id: true, email: true },
        });
        const attemptClaimed = await this.claimAttempt(
          transaction,
          user.id,
          input.claimToken,
        );

        return { user, attemptClaimed };
      });

      return {
        ...created,
        accessToken: await this.createAccessToken(created.user),
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException("Email is already registered");
      }

      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResult> {
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
          this.claimAttempt(transaction, user.id, input.claimToken!),
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

  private async claimAttempt(
    transaction: Prisma.TransactionClient,
    userId: string,
    claimToken: string,
  ): Promise<boolean> {
    const claimTokenHash = createHash("sha256")
      .update(claimToken)
      .digest("hex");
    const now = new Date();
    const attempt = await transaction.quizAttempt.findFirst({
      where: {
        claimTokenHash,
        claimTokenExpiresAt: { gt: now },
        status: AttemptStatus.COMPLETED,
        userId: null,
      },
      select: { id: true },
    });

    if (!attempt) {
      throw new BadRequestException("Claim token is invalid, expired, or already used");
    }

    const claimed = await transaction.quizAttempt.updateMany({
      where: {
        id: attempt.id,
        userId: null,
        claimTokenHash,
      },
      data: {
        userId,
        claimTokenHash: null,
        claimTokenExpiresAt: null,
      },
    });

    if (claimed.count !== 1) {
      throw new BadRequestException("Claim token is invalid, expired, or already used");
    }

    return true;
  }

  private createAccessToken(user: { id: string; email: string }): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    );
  }
}
