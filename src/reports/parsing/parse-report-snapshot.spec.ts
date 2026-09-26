import {
  parseReportSnapshot,
  ReportSnapshotError,
} from "./parse-report-snapshot";

describe("parseReportSnapshot", () => {
  const validPayload = {
    disclaimer: "Informational only.",
    sections: [
      {
        key: "strengths",
        type: "list",
        title: "Strengths",
        content: "Your strengths:",
        items: ["Creativity"],
      },
    ],
    faq: [{ question: "Question?", answer: "Answer." }],
  };

  it("parses a valid version-one snapshot", () => {
    expect(parseReportSnapshot(1, validPayload)).toEqual(validPayload);
  });

  it("rejects malformed snapshots instead of returning partial data", () => {
    expect(() =>
      parseReportSnapshot(1, {
        ...validPayload,
        faq: [{ question: "Missing answer" }],
      }),
    ).toThrow(ReportSnapshotError);
  });

  it("rejects an unsupported report version", () => {
    expect(() => parseReportSnapshot(2, validPayload)).toThrow(
      "Unsupported report version",
    );
  });
});
