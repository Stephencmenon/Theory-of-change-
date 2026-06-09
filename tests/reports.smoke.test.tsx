import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import BoardReport from "@/components/reports/BoardReport";
import FunderReport from "@/components/reports/FunderReport";
import { buildMetricOutcome } from "@/lib/data/outcomes";
import { toPeriodDate } from "@/lib/domain/periods";
import type {
  BoardReport as BoardReportData,
  FunderReport as FunderReportData,
} from "@/lib/data/report";

// ACE-27 — PDF layer smoke tests. The report templates take fully-shaped view
// models (no DB), so we render fixtures straight to PDF bytes and assert the
// output is a non-empty, well-formed PDF. The "No data entered" guarantee is
// asserted at its source — buildMetricOutcome yields actual: null for an empty
// period, which is exactly what MetricRows renders as "No data entered".

const period = toPeriodDate(2026, 3);

const populatedProgram = {
  id: "p1",
  name: "Youth Program",
  metrics: [
    buildMetricOutcome(
      {
        id: "m1",
        name: "Youth completing program",
        unit: "count",
        targetPeriod: "monthly",
        offTrackThreshold: 0.8,
        targets: [{ effectiveFrom: toPeriodDate(2026, 1), targetValue: 50 }],
        entries: [{ period, actualValue: 42 }],
      },
      period,
    ),
  ],
};

const emptyProgram = {
  id: "p2",
  name: "New Program",
  metrics: [
    buildMetricOutcome(
      {
        id: "m2",
        name: "Mentees enrolled",
        unit: "count",
        targetPeriod: "monthly",
        offTrackThreshold: 0.8,
        targets: [{ effectiveFrom: toPeriodDate(2026, 1), targetValue: 30 }],
        entries: [], // no entry for this period → actual null → "No data entered"
      },
      period,
    ),
  ],
};

const PDF_MAGIC = "%PDF-";

describe("report PDF smoke (ACE-27)", () => {
  it("renders the board report to non-empty PDF bytes", async () => {
    const data: BoardReportData = {
      orgName: "Test Org",
      periodLabel: "March 2026",
      generatedAt: "2026-03-31",
      edNotes: "Strong quarter for the youth program.",
      programs: [populatedProgram],
      fundraising: {
        byCategory: [
          { category: "grant", actual: 80000, target: 100000, status: "at-risk" },
          { category: "donation", actual: null, target: null, status: null },
          { category: "other", actual: null, target: null, status: null },
        ],
        orgStatus: "at-risk",
      },
      deadlines: [{ name: "Foundation X", date: "2026-04-15", flag: "red" }],
    };

    const buffer = await renderToBuffer(createElement(BoardReport, { data }));
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  });

  it("renders the funder report to non-empty PDF bytes", async () => {
    const data: FunderReportData = {
      orgName: "Test Org",
      funderName: "Foundation X",
      periodLabel: "March 2026",
      generatedAt: "2026-03-31",
      edNotes: null,
      programs: [populatedProgram],
      funding: [
        { category: "grant", actual: 50000, target: 50000, status: "on-track" },
        { category: "donation", actual: null, target: null, status: null },
        { category: "other", actual: null, target: null, status: null },
      ],
      nextDeadline: { renewal: "2026-12-01", reportDue: "2026-04-15" },
    };

    const buffer = await renderToBuffer(createElement(FunderReport, { data }));
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  });

  it("an empty period still renders (and shows 'No data entered' for missing metrics)", async () => {
    // Source-of-truth assertion for the "No data entered" display rule.
    expect(emptyProgram.metrics[0].actual).toBeNull();
    expect(emptyProgram.metrics[0].warning).toBe("no-data");

    const data: BoardReportData = {
      orgName: "Test Org",
      periodLabel: "March 2026",
      generatedAt: "2026-03-31",
      edNotes: null,
      programs: [emptyProgram],
      fundraising: {
        byCategory: [
          { category: "grant", actual: null, target: null, status: null },
          { category: "donation", actual: null, target: null, status: null },
          { category: "other", actual: null, target: null, status: null },
        ],
        orgStatus: null,
      },
      deadlines: [],
    };

    const buffer = await renderToBuffer(createElement(BoardReport, { data }));
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  });
});
