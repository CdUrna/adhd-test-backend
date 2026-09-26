const allowedEnvironments = new Set(["development", "test", "production"]);
const allowedSameSiteValues = new Set(["lax", "strict", "none"]);

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const databaseUrl = requireString(environment, "DATABASE_URL");
  const authSecret = requireString(environment, "AUTH_SECRET");
  const frontendUrl = requireString(environment, "FRONTEND_URL");

  assertUrl(databaseUrl, "DATABASE_URL", ["postgres:", "postgresql:"]);
  assertUrl(frontendUrl, "FRONTEND_URL", ["http:", "https:"]);

  if (authSecret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  }

  const nodeEnvironment = optionalString(environment, "NODE_ENV") ?? "development";
  if (!allowedEnvironments.has(nodeEnvironment)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  validatePositiveInteger(environment, "PORT", "4000");
  validatePositiveInteger(environment, "AUTH_TOKEN_TTL_SECONDS", "604800");
  validatePositiveInteger(environment, "CLAIM_TOKEN_TTL_MINUTES", "30");

  const sameSite = optionalString(environment, "AUTH_COOKIE_SAME_SITE") ?? "lax";
  if (!allowedSameSiteValues.has(sameSite)) {
    throw new Error("AUTH_COOKIE_SAME_SITE must be lax, strict, or none");
  }

  const secureValue = optionalString(environment, "AUTH_COOKIE_SECURE");
  if (secureValue !== undefined && secureValue !== "true" && secureValue !== "false") {
    throw new Error("AUTH_COOKIE_SECURE must be true or false");
  }

  const secure = secureValue === undefined
    ? nodeEnvironment === "production"
    : secureValue === "true";
  if (sameSite === "none" && !secure) {
    throw new Error("AUTH_COOKIE_SECURE must be true when SameSite is none");
  }

  return {
    ...environment,
    NODE_ENV: nodeEnvironment,
    PORT: optionalString(environment, "PORT") ?? "4000",
    AUTH_TOKEN_TTL_SECONDS:
      optionalString(environment, "AUTH_TOKEN_TTL_SECONDS") ?? "604800",
    CLAIM_TOKEN_TTL_MINUTES:
      optionalString(environment, "CLAIM_TOKEN_TTL_MINUTES") ?? "30",
    AUTH_COOKIE_SAME_SITE: sameSite,
    AUTH_COOKIE_SECURE: String(secure),
  };
}

function requireString(environment: Record<string, unknown>, key: string): string {
  const value = optionalString(environment, key);
  if (value === undefined) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function optionalString(
  environment: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = environment[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function assertUrl(value: string, key: string, protocols: string[]): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }

  if (!protocols.includes(url.protocol)) {
    throw new Error(`${key} uses an unsupported protocol`);
  }
}

function validatePositiveInteger(
  environment: Record<string, unknown>,
  key: string,
  fallback: string,
): void {
  const value = Number(optionalString(environment, key) ?? fallback);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }
}
