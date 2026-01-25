/**
 * Application configuration constants
 */
export interface Config {
  INITIAL_READING_DRIVE_SIDE: number;
  INITIAL_READING_NON_DRIVE_SIDE: number;
  SUPPORTED_SPOKE_COUNTS: readonly number[];
  DEFAULT_SPOKES: number;
  DEFAULT_SPOKE_THICKNESS: number; // millimeters
  SUPPORTED_TOLERANCES: readonly number[]; // percents
  DEFAULT_TOLERANCE: number;
  ERROR_STRING_INVALID_INPUT: string;
}

// ============================================================================
// Data Types
// ============================================================================

/**
 * Lookup table mapping tensometer reading to tension (kgf).
 * Keys are readings (as strings for object keys), values are tensions.
 */
export type TensionLookupTable = Record<string | number, number>;

/**
 * Data for a single tensometer, mapping spoke thickness to lookup tables
 */
export type TensometerData = Record<string, TensionLookupTable>;

/**
 * Complete tensometer database, mapping tensometer names to their data
 */
export type TensometersDatabase = Record<string, TensometerData>;

// One spoke data point
export interface SpokeDataPoint {
  /** Spoke number (1-based) */
  axis: number;
  /** Tension (kgf) */
  value: number;
}

/**
 * Averages for drive side and non-drive side.
 */
export interface SideAverages {
  ds: number;
  nds: number;
}

// ============================================================================
// Model
// ============================================================================

/**
 * Wheel model - manages the state of wheel spoke data
 */
export interface IWheelModel {
  /** Number of spokes in the wheel */
  nSpokes: number;
  /** Raw tensometer readings for each spoke (0-indexed) */
  readings: number[];
  /** Computed tensions in kgf for each spoke (0-indexed) */
  tensions: number[];
  /** Spoke thickness for drive side (mm) */
  spokeThicknessDS: string;
  /** Spoke thickness for non-drive side (mm) */
  spokeThicknessNDS: string;
  /** Currently selected tensometer name */
  tensometer: string;
  /** Tolerance percentage for warnings */
  tolerance: number;

  /**
   * Set the reading for a specific spoke.
   * @param index 0-based spoke index
   * @param value Tensometer reading
   */
  setReading(index: number, value: number): void;

  /**
   * Get the average readings and tensions for each side.
   */
  getAverages(): { readings: SideAverages; tensions: SideAverages };

  /**
   * Check if a tension value is within tolerance for its side.
   * @param index 0-based spoke index
   * @param tension Tension value to check
   */
  isWithinTolerance(index: number, tension: number): boolean;

  /**
   * Subscribe to model changes.
   * @param callback Function to call when model changes
   * @returns Unsubscribe function
   */
  onChange(callback: () => void): () => void;
}

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Looking up tension values from tensometer readings
 */
export interface ITensionService {
  /**
   * Get tension (kgf) for a given spoke thickness and reading.
   * Uses interpolation/extrapolation for values not in the table.
   */
  tension(spokeThickness: string, reading: number): number;

  /**
   * Get list of supported spoke thicknesses for current tensometer
   */
  getSupportedThicknesses(): string[];

  /**
   * Get list of all available tensometer names
   */
  getTensometers(): string[];

  /**
   * Set the current tensometer
   */
  setTensometer(name: string): void;

  /**
   * Get the current tensometer name
   */
  getCurrentTensometer(): string;
}

/**
 * Service for calculating statistics (averages, tolerance checks)
 */
export interface IStatsService {
  /**
   * Calculate average of values at odd indices (drive side, 1-indexed)
   */
  averageDriveSide(values: number[]): number;

  /**
   * Calculate average of values at even indices (non-drive side, 1-indexed)
   */
  averageNonDriveSide(values: number[]): number;

  /**
   * Check if a value is within tolerance of a reference value.
   * @param value Value to check
   * @param reference Reference value (typically average)
   * @param tolerancePercent Tolerance in percent (e.g., 20 for ±20%)
   */
  isWithinTolerance(
    value: number,
    reference: number,
    tolerancePercent: number,
  ): boolean;

  /**
   * Round a number to 2 decimal places
   */
  round2(value: number): number;
}

// ============================================================================
// View Interfaces
// ============================================================================

/**
 * View for the input table showing spoke readings and tensions
 */
export interface ITableView {
  /**
   * Render the table with the specified number of spokes.
   * @param nSpokes Number of spokes
   * @param readings Initial readings for each spoke
   */
  render(nSpokes: number, readings: number[]): void;

  /**
   * Update the tension display for all spokes.
   * @param tensions Tension values for each spoke
   * @param avgTensions Average tensions for tolerance checking
   * @param tolerance Tolerance percentage
   */
  updateTensions(
    tensions: number[],
    avgTensions: SideAverages,
    tolerance: number,
  ): void;

  /**
   * Update the average displays.
   */
  updateAverages(avgReadings: SideAverages, avgTensions: SideAverages): void;

  /**
   * Callback when user changes a reading.
   * Set this to handle input events.
   */
  onReadingChange: ((spokeIndex: number, value: number) => void) | null;

  /**
   * Focus on a specific spoke input.
   * @param spokeIndex 0-based spoke index
   */
  focusSpoke(spokeIndex: number): void;
}

/**
 * View for the radar chart
 */
export interface IChartView {
  /**
   * Initialize the chart with the given parameters.
   * @param nSpokes Number of spokes
   * @param tensionDS Initial drive side tension
   * @param tensionNDS Initial non-drive side tension
   */
  init(nSpokes: number, tensionDS: number, tensionNDS: number): void;

  /**
   * Update the chart with new tension values.
   * @param tensions Array of tension values for all spokes
   */
  update(tensions: number[]): void;
}

/**
 * View for dropdown/select controls.
 */
export interface IControlsView {
  /**
   * Populate a select element with options.
   * @param values Array of values to use as options
   * @param defaultValue Initial selected value
   */
  fillSelect(
    element: HTMLSelectElement,
    values: (string | number)[],
    defaultValue: string | number,
  ): void;

  /** Callback when tensometer selection changes */
  onTensometerChange: ((name: string) => void) | null;
  /** Callback when spoke count changes */
  onSpokeCountChange: ((count: number) => void) | null;
  /** Callback when drive side spoke thickness changes */
  onThicknessDSChange: ((thickness: string) => void) | null;
  /** Callback when non-drive side spoke thickness changes */
  onThicknessNDSChange: ((thickness: string) => void) | null;
  /** Callback when tolerance changes */
  onToleranceChange: ((tolerance: number) => void) | null;
}

// ============================================================================
// Presenter Interface
// ============================================================================

/**
 * Presenter that coordinates model and views.
 */
export interface IWheelPresenter {
  /**
   * Initialize the presenter and render initial state.
   */
  init(): void;

  /**
   * Handle a spoke reading change from the user.
   */
  handleReadingChange(spokeIndex: number, value: number): void;

  /**
   * Handle tensometer selection change.
   */
  handleTensometerChange(name: string): void;

  /**
   * Handle spoke count change.
   */
  handleSpokeCountChange(count: number): void;

  /**
   * Handle spoke thickness change.
   */
  handleThicknessChange(side: "ds" | "nds", thickness: string): void;

  /**
   * Handle tolerance change.
   */
  handleToleranceChange(tolerance: number): void;
}
