import { describe, it, expect } from "vitest";
import { lookupTarget } from "./targets";
import { toPeriodDate } from "./periods";

const d = (y: number, m: number) => toPeriodDate(y, m);

describe("lookupTarget — effective-date resolution (ADR-004)", () => {
  // A metric target set in March, then changed in July.
  const metricTargets = [
    { id: "mar", effectiveFrom: d(2026, 3), targetValue: 100 },
    { id: "jul", effectiveFrom: d(2026, 7), targetValue: 150 },
  ];

  it("a March period resolves to the March target", () => {
    expect(lookupTarget(metricTargets, d(2026, 3))?.id).toBe("mar");
    expect(lookupTarget(metricTargets, d(2026, 5))?.id).toBe("mar");
  });

  it("a July period resolves to the July target (not retroactive)", () => {
    expect(lookupTarget(metricTargets, d(2026, 7))?.id).toBe("jul");
    expect(lookupTarget(metricTargets, d(2026, 11))?.id).toBe("jul");
  });

  it("returns null when no target is effective yet", () => {
    expect(lookupTarget(metricTargets, d(2026, 1))).toBeNull();
  });
});

describe("lookupTarget — general-donation fixture (BINDING CONSTRAINT)", () => {
  // The mandatory fixture: funderId = null must match only the null rows and
  // must NOT bleed across to funder-specific rows. (ADD binding constraint.)
  const revenueTargets = [
    { id: "gen-jan", funderId: null, effectiveFrom: d(2026, 1), targetAmount: 1000 },
    { id: "gen-jun", funderId: null, effectiveFrom: d(2026, 6), targetAmount: 1200 },
    { id: "funderA", funderId: "A", effectiveFrom: d(2026, 1), targetAmount: 5000 },
  ];

  it("resolves the general-donation target for funderId = null", () => {
    const r = lookupTarget(revenueTargets, d(2026, 6), null);
    expect(r?.id).toBe("gen-jun");
  });

  it("does not match a funder-specific row when funderId is null", () => {
    const r = lookupTarget(revenueTargets, d(2026, 3), null);
    expect(r?.id).toBe("gen-jan"); // not funderA, even though funderA is effective
  });

  it("resolves a funder-specific target without bleeding into general donations", () => {
    const r = lookupTarget(revenueTargets, d(2026, 6), "A");
    expect(r?.id).toBe("funderA");
  });

  it("returns null for a funder with no matching target", () => {
    expect(lookupTarget(revenueTargets, d(2026, 6), "Z")).toBeNull();
  });

  it("when funderId is omitted entirely, does not filter on funder", () => {
    // Latest effective row regardless of funder → gen-jun (effective 2026-06).
    expect(lookupTarget(revenueTargets, d(2026, 6))?.id).toBe("gen-jun");
  });
});
