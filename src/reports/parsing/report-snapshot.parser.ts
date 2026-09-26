import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ReportPayload } from "../report.types";
import {
  parseReportSnapshot,
  ReportSnapshotError,
} from "./parse-report-snapshot";

@Injectable()
export class ReportSnapshotParser {
  parse(reportVersion: number, payload: unknown): ReportPayload {
    try {
      return parseReportSnapshot(reportVersion, payload);
    } catch (error) {
      if (error instanceof ReportSnapshotError) {
        throw new InternalServerErrorException(error.message);
      }
      throw error;
    }
  }
}
