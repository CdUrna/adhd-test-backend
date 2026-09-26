import { ApiProperty } from "@nestjs/swagger";

export class AuthUserResponse {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;
}

export class AuthResponse {
  @ApiProperty({ type: AuthUserResponse })
  user!: AuthUserResponse;

  @ApiProperty({ example: true })
  attemptClaimed!: boolean;
}
