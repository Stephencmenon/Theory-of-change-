// Program outcome metric rules (PRD §11 "Program off-track flag").

/**
 * A metric is off-track when actual < target × threshold.
 * @param actual    The actual_value for the period (monthly) or YTD sum (annual).
 * @param target    The applicable target_value.
 * @param threshold off_track_threshold, a fraction in (0,1]. Default config: 0.80.
 */
export function isOffTrack(
  actual: number,
  target: number,
  threshold: number,
): boolean {
  return actual < target * threshold;
}
