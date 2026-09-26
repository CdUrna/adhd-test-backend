import { ReportFaq, ReportPayload, ReportSection } from "../report.types";

export class ReportSnapshotError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_SNAPSHOT" | "UNSUPPORTED_VERSION",
  ) {
    super(message);
  }
}

export function parseReportSnapshot(
  reportVersion: number,
  payload: unknown,
): ReportPayload {
  if (reportVersion !== 1) {
    throw new ReportSnapshotError(
      "Unsupported report version",
      "UNSUPPORTED_VERSION",
    );
  }

  if (!isRecord(payload)) {
    return invalidSnapshot();
  }

  const { disclaimer, sections, faq } = payload;
  if (
    typeof disclaimer !== "string" ||
    !Array.isArray(sections) ||
    !Array.isArray(faq)
  ) {
    return invalidSnapshot();
  }

  return {
    disclaimer,
    sections: sections.map(parseSection),
    faq: faq.map(parseFaq),
  };
}

function parseSection(value: unknown): ReportSection {
  if (!isRecord(value)) {
    return invalidSnapshot();
  }

  const { key, type, title, content, items, outro } = value;
  if (
    typeof key !== "string" ||
    (type !== "text" && type !== "list") ||
    typeof title !== "string" ||
    typeof content !== "string" ||
    (outro !== undefined && typeof outro !== "string") ||
    (type === "list" && !isStringArray(items)) ||
    (type === "text" && items !== undefined && !isStringArray(items))
  ) {
    return invalidSnapshot();
  }

  return {
    key,
    type,
    title,
    content,
    items: items as string[] | undefined,
    outro,
  };
}

function parseFaq(value: unknown): ReportFaq {
  if (
    !isRecord(value) ||
    typeof value.question !== "string" ||
    typeof value.answer !== "string"
  ) {
    return invalidSnapshot();
  }

  return { question: value.question, answer: value.answer };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidSnapshot(): never {
  throw new ReportSnapshotError(
    "Stored report snapshot is invalid",
    "INVALID_SNAPSHOT",
  );
}
