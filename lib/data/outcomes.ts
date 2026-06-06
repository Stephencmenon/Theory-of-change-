import { lookupTarget } from "@/lib/domain/targets";
import { isOffTrack } from "@/lib/domain/metrics";

// Shared metric-outcome resolution used by both the dashboard and the reports,
// so the display rules (PRD §11) live in exactly one place.

export type MetricOutcome = {
  id: string;
  name: string;
  unit: string;
  targetPeriod: "monthly" | "annual";
  actual: number | null; // null → "No data entered"
  target: number | null; // null → no applicable target (config warning)
  offTrack: boolean;
  warning: "no-data" | "no-target" | null;
};

export interface MetricInput {
  id: string;
  name: string;
  unit: string;
  targetPeriod: "monthly" | "annual";
  offTrackThreshold: number;
  targets: { effectiveFrom: Date; targetValue: number }[];
  /** Entries for the fiscal year up to & including the period. */
  entries: { period: Date; actualValue: number }[];
}

export function buildMetricOutcome(m: MetricInput, period: Date): MetricOutcome {
  const target = lookupTarget(m.targets, period);
  const targetValue = target ? target.targetValue : null;

  let actual: number | null;
  if (m.targetPeriod === "monthly") {
    const entry = m.entries.find((e) => e.period.getTime() === period.getTime());
    actual = entry ? entry.actualValue : null;
  } else {
    // Annual: YTD sum (Jan → selected month). null only if zero entries.
    actual = m.entries.length > 0
      ? m.entries.reduce((s, e) => s + e.actualValue, 0)
      : null;
  }

  const warning = actual === null ? "no-data" : targetValue === null ? "no-target" : null;
  const offTrack =
    actual !== null && targetValue !== null
      ? isOffTrack(actual, targetValue, m.offTrackThreshold)
      : false;

  return {
    id: m.id,
    name: m.name,
    unit: m.unit,
    targetPeriod: m.targetPeriod,
    actual,
    target: targetValue,
    offTrack,
    warning,
  };
}
