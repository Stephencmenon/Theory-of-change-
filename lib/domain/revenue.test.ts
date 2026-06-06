import { describe, it, expect } from "vitest";
import { revenueStatus, orgRevenueStatus } from "./revenue";

describe("revenueStatus", () => {
  it("on-track at exactly 80%", () => {
    expect(revenueStatus(80, 100)).toBe("on-track");
  });
  it("at-risk just below 80%", () => {
    expect(revenueStatus(79, 100)).toBe("at-risk");
  });
  it("at-risk at exactly 60%", () => {
    expect(revenueStatus(60, 100)).toBe("at-risk");
  });
  it("off-track just below 60%", () => {
    expect(revenueStatus(59, 100)).toBe("off-track");
  });
  it("on-track when actual exceeds target", () => {
    expect(revenueStatus(150, 100)).toBe("on-track");
  });
});

describe("orgRevenueStatus", () => {
  it("sums actuals vs sums targets (ADR-006), not per-row averaging", () => {
    // Totals: actual 90 vs target 100 → 90% → on-track, even though one row
    // (10/50 = 20%) is individually off-track.
    const entries = [{ actualAmount: 80 }, { actualAmount: 10 }];
    const targets = [{ targetAmount: 50 }, { targetAmount: 50 }];
    expect(orgRevenueStatus(entries, targets)).toBe("on-track");
  });

  it("rolls up to off-track when summed actuals fall below 60%", () => {
    const entries = [{ actualAmount: 30 }, { actualAmount: 20 }];
    const targets = [{ targetAmount: 50 }, { targetAmount: 50 }];
    // 50/100 = 50% → off-track
    expect(orgRevenueStatus(entries, targets)).toBe("off-track");
  });

  it("handles empty period (no entries) as off-track against a positive target", () => {
    expect(orgRevenueStatus([], [{ targetAmount: 100 }])).toBe("off-track");
  });
});
