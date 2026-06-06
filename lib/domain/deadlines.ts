// Funder deadline window colouring (PRD §11 "Deadline windows").

export type DeadlineFlag = "red" | "amber" | "yellow" | null;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole-day difference between two dates, normalised to UTC midnight. */
function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Colour flag for a funder deadline relative to today.
 * ≤30 days = red · 31–60 = amber · 61–90 = yellow · >90 = null (no flag).
 * Overdue deadlines (negative days) fall into the ≤30 red bucket.
 * Boundaries: 30→red, 31→amber, 60→amber, 61→yellow, 90→yellow, 91→null.
 */
export function deadlineWindow(dueDate: Date, today: Date): DeadlineFlag {
  const days = daysBetween(today, dueDate);
  if (days <= 30) return "red";
  if (days <= 60) return "amber";
  if (days <= 90) return "yellow";
  return null;
}
