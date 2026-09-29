import { Module } from "@nestjs/common";
import { ReportGeneratorService } from "./generation/report-generator.service";
import { ReportSnapshotParser } from "./parsing/report-snapshot.parser";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportGeneratorService, ReportSnapshotParser],
  exports: [ReportGeneratorService],
})
export class ReportsModule {}
