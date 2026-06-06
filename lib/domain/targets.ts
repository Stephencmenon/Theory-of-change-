// Effective-date target lookup — the system's binding constraint (ADD "Binding
// Constraint" + §4.3). Every status flag depends on resolving the right target
// for the right period.

/** Minimal shape needed to resolve a target by effective date (+ optional funder). */
export interface EffectiveDated {
  effectiveFrom: Date;
  funderId?: string | null;
}

/**
 * Find the applicable target for a period: the row with the latest
 * `effectiveFrom` that is on or before the period start.
 *
 * Funder branching (the bug surface):
 * - `funderId` omitted (undefined) → metric targets, which have no funder
 *   dimension; do not filter on funder.
 * - `funderId` passed as a string → match that funder.
 * - `funderId` passed as `null` → general-donation targets, i.e. rows whose
 *   `funderId` IS NULL. In JS `null === null` is true, so this matches exactly
 *   the null rows and excludes funder-specific rows. (The Prisma query layer
 *   must likewise emit `IS NULL`, never `= NULL` — see ADD §4.3.)
 *
 * Category matching (for revenue targets) is the caller's responsibility: pass
 * an array already filtered to a single category.
 *
 * @returns the applicable row, or `null` if none applies.
 */
export function lookupTarget<T extends EffectiveDated>(
  targets: T[],
  period: Date,
  funderId?: string | null,
): T | null {
  const matchFunder = arguments.length >= 3;

  const applicable = targets
    .filter((t) => t.effectiveFrom.getTime() <= period.getTime())
    .filter((t) => (matchFunder ? (t.funderId ?? null) === (funderId ?? null) : true))
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());

  return applicable[0] ?? null;
}
