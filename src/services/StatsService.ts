import { IStatsService } from "../types/interfaces";

/**
 * Service for calculating statistics (averages, tolerance checks).
 * All methods are pure functions with no side effects.
 */
export class StatsService implements IStatsService {
  /**
   * Check if a value is within tolerance of a reference value.
   * @param value Value to check
   * @param reference Reference value (typically average)
   * @param tolerancePercent Tolerance as percentage (e.g., 20 for ±20%)
   */
  isWithinTolerance(
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
  round2(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

/**
 * Singleton instance for convenience.
 * Can also instantiate directly for testing.
 */
export const statsService = new StatsService();
