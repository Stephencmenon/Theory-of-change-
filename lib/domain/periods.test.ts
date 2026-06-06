import { describe, it, expect } from "vitest";
import { toPeriodDate, periodFromString, fiscalYearStart } from "./periods";

describe("toPeriodDate", () => {
  it("returns first day of month at midnight UTC", () => {
    const d = toPeriodDate(2026, 6);
    expect(d.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("is 1-based for month (1 = January, 12 = December)", () => {
    expect(toPeriodDate(2026, 1).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(toPeriodDate(2026, 12).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("rejects out-of-range months", () => {
    expect(() => toPeriodDate(2026, 0)).toThrow(RangeError);
    expect(() => toPeriodDate(2026, 13)).toThrow(RangeError);
  });
});

describe("periodFromString", () => {
  it("parses YYYY-MM into a period date", () => {
    expect(periodFromString("2026-05").toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });
  it("rejects malformed input", () => {
    expect(() => periodFromString("2026/05")).toThrow(RangeError);
    expect(() => periodFromString("May 2026")).toThrow(RangeError);
  });
});

describe("fiscalYearStart", () => {
  it("returns Jan 1 UTC of the period's year", () => {
    expect(fiscalYearStart(toPeriodDate(2026, 6)).toISOString()).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});
