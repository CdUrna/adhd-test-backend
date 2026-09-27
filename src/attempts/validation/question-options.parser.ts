import { InternalServerErrorException } from "@nestjs/common";
import { StoredQuestionConfig } from "./attempt-validator.types";

export type ParsedQuestionOption = {
  value: string;
  label: string;
  points: number;
};

export function parseQuestionOptions(config: unknown): ParsedQuestionOption[] {
  const stored = config as StoredQuestionConfig;

  if (!Array.isArray(stored.options)) {
    throwMisconfiguredOptions();
  }

  const options = stored.options.flatMap((option) => {
    if (
      typeof option.value !== "string" ||
      typeof option.label !== "string" ||
      typeof option.points !== "number"
    ) {
      return [];
    }

    return [
      { value: option.value, label: option.label, points: option.points },
    ];
  });

  const values = new Set(options.map((option) => option.value));
  if (
    options.length === 0 ||
    values.size !== options.length ||
    options.some((option) => !Number.isFinite(option.points))
  ) {
    throwMisconfiguredOptions();
  }

  return options;
}

function throwMisconfiguredOptions(): never {
  throw new InternalServerErrorException("Question options are misconfigured");
}
