import { describe, it, expect } from "vitest";
import { deadlineWindow } from "./deadlines";

const today = new Date(Date.UTC(2026, 5, 1)); // 2026-06-01
const inDays = (n: number) =>
  new Date(Date.UTC(2026, 5, 1 + n));

describe("deadlineWindow", () => {
  it("red at exactly 30 days", () => {
    expect(deadlineWindow(inDays(30), today)).toBe("red");
  });
  it("amber at 31 days (lower edge of amber)", () => {
    expect(deadlineWindow(inDays(31), today)).toBe("amber");
  });
  it("amber at exactly 60 days", () => {
    expect(deadlineWindow(inDays(60), today)).toBe("amber");
  });
  it("yellow at 61 days (lower edge of yellow)", () => {
    expect(deadlineWindow(inDays(61), today)).toBe("yellow");
  });
  it("yellow at exactly 90 days", () => {
    expect(deadlineWindow(inDays(90), today)).toBe("yellow");
  });
  it("no flag (null) beyond 90 days", () => {
    expect(deadlineWindow(inDays(91), today)).toBeNull();
  });
  it("overdue deadlines are red", () => {
    expect(deadlineWindow(inDays(-5), today)).toBe("red");
  });
  it("ignores time-of-day, comparing whole days", () => {
    const dueLate = new Date(Date.UTC(2026, 6, 1, 23, 59)); // +30 days, late evening
    expect(deadlineWindow(dueLate, today)).toBe("red");
  });
});
