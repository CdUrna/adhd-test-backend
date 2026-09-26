import { Injectable } from "@nestjs/common";
import { ResultType } from "../../generated/prisma/enums";
import { GeneratedReport } from "../report.types";
import { generateReport } from "./generate-report";

@Injectable()
export class ReportGeneratorService {
  generate(resultType: ResultType): GeneratedReport {
    return generateReport(resultType);
  }
}
