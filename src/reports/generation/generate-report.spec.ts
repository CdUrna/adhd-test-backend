import { ResultType } from "../../generated/prisma/enums";
import { generateReport } from "./generate-report";

describe("generateReport", () => {
  it("generates a versioned high-traits report", () => {
    const report = generateReport(ResultType.HIGH_ADHD_TRAITS);

    expect(report.reportVersion).toBe(1);
    expect(report.payload.sections).toHaveLength(3);
    expect(report.payload.faq).toHaveLength(6);
    expect(report.payload.sections[0].content).toContain("high ADHD traits");
  });

  it("generates an independent low-traits report", () => {
    const first = generateReport(ResultType.LOW_ADHD_TRAITS);
    first.payload.sections[0].content = "changed";
    const second = generateReport(ResultType.LOW_ADHD_TRAITS);

    expect(second.payload.faq).toHaveLength(5);
    expect(second.payload.sections[0].content).toContain("minimal ADHD traits");
  });
});
