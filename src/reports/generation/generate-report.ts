import { ResultType } from "../../generated/prisma/enums";
import { GeneratedReport } from "../report.types";
import { highTraitsReport, lowTraitsReport } from "./report-content";

const CURRENT_REPORT_VERSION = 1;

export function generateReport(resultType: ResultType): GeneratedReport {
  const template = resultType === ResultType.HIGH_ADHD_TRAITS
    ? highTraitsReport
    : lowTraitsReport;

  return {
    reportVersion: CURRENT_REPORT_VERSION,
    payload: structuredClone(template),
  };
}
