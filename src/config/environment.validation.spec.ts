import { validateEnvironment } from "./environment.validation";

const validEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/app",
  FRONTEND_URL: "http://localhost:3000",
  AUTH_SECRET: "a-secure-secret-with-at-least-32-characters",
};

describe("validateEnvironment", () => {
  it("applies safe local defaults", () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: "development",
      PORT: "4000",
      AUTH_COOKIE_SAME_SITE: "lax",
      AUTH_COOKIE_SECURE: "false",
    });
  });

  it("rejects a short authentication secret", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, AUTH_SECRET: "short" }),
    ).toThrow("AUTH_SECRET must contain at least 32 characters");
  });

  it("requires secure cookies for SameSite none", () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        AUTH_COOKIE_SAME_SITE: "none",
        AUTH_COOKIE_SECURE: "false",
      }),
    ).toThrow("AUTH_COOKIE_SECURE must be true when SameSite is none");
  });
});
