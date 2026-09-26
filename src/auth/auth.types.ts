import type { Request } from "express";

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export type AuthenticatedRequest = Request & {
  auth: AuthTokenPayload;
};

export type OptionallyAuthenticatedRequest = Request & {
  auth?: AuthTokenPayload;
};
