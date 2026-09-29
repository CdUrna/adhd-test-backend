import { SetMetadata } from "@nestjs/common";

export const AUTH_MODE_KEY = "auth-mode";
export type AuthMode = "required" | "optional" | "public";

export const Public = () =>
  SetMetadata(AUTH_MODE_KEY, "public" satisfies AuthMode);
export const OptionalAuth = () =>
  SetMetadata(AUTH_MODE_KEY, "optional" satisfies AuthMode);
