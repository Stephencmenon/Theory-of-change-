// Revenue status rules (PRD §11 "Revenue status"; ADD ADR-006).
// Org-wide fixed constants — NOT user-configurable in v1, and independent of
// per-metric thresholds.

export type RevenueStatus = "on-track" | "at-risk" | "off-track";

export const REVENUE_ON_TRACK = 0.8; // ≥80% of target
export const REVENUE_AT_RISK = 0.6; // 60–79% of target

/**
 * Status for a single funder/category row: actual vs. applicable target.
 * ≥80% on-track · 60–79% at-risk · <60% off-track. Boundaries are inclusive
 * at the lower edge (exactly 80% = on-track; exactly 60% = at-risk).
 */
export function revenueStatus(actual: number, target: number): RevenueStatus {
  // No meaningful ratio against a non-positive target. Treat any non-negative
  // actual as on-track (caller shows a config warning when no target exists).
  const ratio = target <= 0 ? (actual >= 0 ? 1 : 0) : actual / target;
  if (ratio >= REVENUE_ON_TRACK) return "on-track";
  if (ratio >= REVENUE_AT_RISK) return "at-risk";
  return "off-track";
}

/**
 * Org-wide status: sum all actuals vs. sum all applicable targets, then apply
 * the same 80%/60% thresholds to the totals (ADR-006 — every dollar counts
 * equally; no weighting by funder or category).
 */
export function orgRevenueStatus(
  entries: { actualAmount: number }[],
  targets: { targetAmount: number }[],
): RevenueStatus {
  const totalActual = entries.reduce((sum, e) => sum + e.actualAmount, 0);
  const totalTarget = targets.reduce((sum, t) => sum + t.targetAmount, 0);
  return revenueStatus(totalActual, totalTarget);
}
