// Period helpers. All periods are stored as the first day of the month at
// midnight UTC (ADD §4.3 / PRD §11 "Period storage").

/**
 * Build the canonical period Date for a given calendar year + month.
 * @param year  Full year, e.g. 2026.
 * @param month 1-based month (1 = January … 12 = December).
 * @returns First day of that month at midnight UTC.
 */
export function toPeriodDate(year: number, month: number): Date {
  if (month < 1 || month > 12) {
    throw new RangeError(`month must be 1–12, received ${month}`);
  }
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

/** Parse a "YYYY-MM" string (e.g. from the report form) into a period Date. */
export function periodFromString(period: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) {
    throw new RangeError(`period must be "YYYY-MM", received "${period}"`);
  }
  return toPeriodDate(Number(match[1]), Number(match[2]));
}

/** First day of the fiscal year (Jan 1) for the year of the given period. */
export function fiscalYearStart(period: Date): Date {
  return new Date(Date.UTC(period.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
}
