// Pure functions for the figures shown in the table. They import nothing at
// runtime, so scripts run by Node can use them as well.

/**
 * Check if a value is within tolerance of a reference value.
 * @param value Value to check
 * @param reference Reference value (typically average)
 * @param tolerancePercent Tolerance in percent (e.g., 20 for ±20%)
 */
export function isWithinTolerance(
  value: number,
  reference: number,
  tolerancePercent: number,
): boolean {
  const minTolerated = reference * ((100 - tolerancePercent) / 100);
  const maxTolerated = reference * ((100 + tolerancePercent) / 100);
  return value >= minTolerated && value <= maxTolerated;
}

/**
 * Round a number to 2 decimal places.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
