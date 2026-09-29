import type { ConfigService } from "@nestjs/config";

export function getPositiveIntegerConfig(
  config: ConfigService,
  key: string,
  fallback: number,
): number {
  const value = Number(config.get<string>(key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
