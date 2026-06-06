import { describe, it, expect } from "vitest";
import { isOffTrack } from "./metrics";

describe("isOffTrack", () => {
  it("flags off-track when actual < target × threshold", () => {
    // target 100, threshold 0.8 → boundary at 80
    expect(isOffTrack(79, 100, 0.8)).toBe(true);
  });

  it("is on-track exactly at the threshold boundary", () => {
    expect(isOffTrack(80, 100, 0.8)).toBe(false);
  });

  it("is on-track above the boundary", () => {
    expect(isOffTrack(81, 100, 0.8)).toBe(false);
    expect(isOffTrack(120, 100, 0.8)).toBe(false);
  });

  it("respects a custom threshold", () => {
    // threshold 0.5 → boundary at 50
    expect(isOffTrack(49, 100, 0.5)).toBe(true);
    expect(isOffTrack(50, 100, 0.5)).toBe(false);
  });
});
