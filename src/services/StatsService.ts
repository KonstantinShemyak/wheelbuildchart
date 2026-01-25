import { IStatsService } from "../types/interfaces";

/**
 * Service for calculating statistics (averages, tolerance checks).
 * All methods are pure functions with no side effects.
 */
export class StatsService implements IStatsService {
  /**
   * Calculate average of values at even indices (drive side).
   * In 0-indexed arrays: indices 0, 2, 4... correspond to spokes 1, 3, 5... (drive side)
   */
  averageDriveSide(values: number[]): number {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < values.length; i += 2) {
      sum += values[i];
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

  /**
   * Calculate average of values at odd indices (non-drive side).
   * In 0-indexed arrays: indices 1, 3, 5... correspond to spokes 2, 4, 6... (non-drive side)
   */
  averageNonDriveSide(values: number[]): number {
    let sum = 0;
    let count = 0;
    for (let i = 1; i < values.length; i += 2) {
      sum += values[i];
      count++;
    }
    return count > 0 ? sum / count : 0;
  }

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

  /**
   * Calculate averages for both sides at once.
   * @param values Array of values (0-indexed, alternating DS/NDS)
   * @param nSpokes Number of spokes to consider
   */
  calculateAverages(
    values: number[],
    nSpokes: number,
  ): { ds: number; nds: number } {
    let sumDS = 0;
    let sumNDS = 0;
    const halfSpokes = nSpokes / 2;

    for (let i = 0; i < nSpokes; i++) {
      if (i % 2 === 0) {
        sumDS += values[i];
      } else {
        sumNDS += values[i];
      }
    }

    return {
      ds: halfSpokes > 0 ? sumDS / halfSpokes : 0,
      nds: halfSpokes > 0 ? sumNDS / halfSpokes : 0,
    };
  }
}

/**
 * Singleton instance for convenience.
 * Can also instantiate directly for testing.
 */
export const statsService = new StatsService();
