/**
 * Application configuration constants
 */
export interface Config {
  /** kgf; the initial readings are what the tensometer shows at it */
  DEFAULT_TENSION_DRIVE_SIDE: number;
  /** kgf; the initial readings are what the tensometer shows at it */
  DEFAULT_TENSION_NON_DRIVE_SIDE: number;
  /** In the order they are offered */
  SUPPORTED_SPOKE_LAYOUTS: readonly SpokeLayout[];
  DEFAULT_SPOKE_LAYOUT: SpokeLayout;
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

/**
 * On-disk shape of a single tensometer YAML file.
 */
export interface TensometerFile {
  name: string;
  spokes: TensometerData;
}

// One spoke data point
export interface SpokeDataPoint {
  /** Spoke number (1-based) */
  axis: number;
  /** Chart axis the spoke is drawn on, 0 at the top, increasing clockwise */
  position: number;
  /** Tension (kgf) */
  value: number;
}

/** Side of the wheel a spoke is on: drive side or non-drive side. */
export type Side = "ds" | "nds";

/**
 * Number of spokes on each side. The drive side has a whole multiple of the
 * non-drive side's spokes: equal for usual wheels, twice as many for 2:1 lacing.
 */
export interface SpokeLayout {
  ds: number;
  nds: number;
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
  /** Number of spokes on each side */
  layout: SpokeLayout;
  /** Number of spokes in the wheel */
  readonly nSpokes: number;
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
   * Set every reading to the default of its side, and remember these
   * defaults for when the readings are reset again.
   */
  resetReadings(defaults: Record<Side, number>): void;

  /**
   * Whether every reading still has the default of its side, i.e. none was
   * entered.
   */
  readingsAreDefault(): boolean;

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
   * Get the reading at a given tension (kgf) for a given spoke thickness,
   * rounded to the precision of the tensometer's table.
   */
  reading(spokeThickness: string, tension: number): number;

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
   * Render the table with the specified spokes.
   * @param sides Side of each spoke, spoke 1 first
   * @param readings Initial readings for each spoke
   */
  render(sides: Side[], readings: number[]): void;

  /**
   * Update the tension display for all spokes.
   * @param tensions Tension values for each spoke
   * @param sides Side of each spoke
   * @param avgTensions Average tensions for tolerance checking
   * @param tolerance Tolerance percentage
   */
  updateTensions(
    tensions: number[],
    sides: Side[],
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
   * @param advanceFocus Whether the user committed with Enter and expects to move on
   */
  onReadingChange:
    ((spokeIndex: number, value: number, advanceFocus: boolean) => void) | null;

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
   * @param sides Side of each spoke, spoke 1 first
   * @param tensionDS Initial drive side tension
   * @param tensionNDS Initial non-drive side tension
   */
  init(sides: Side[], tensionDS: number, tensionNDS: number): void;

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
  onSpokeCountChange: ((layout: SpokeLayout) => void) | null;
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
  handleReadingChange(
    spokeIndex: number,
    value: number,
    advanceFocus: boolean,
  ): void;

  /**
   * Handle tensometer selection change.
   */
  handleTensometerChange(name: string): void;

  /**
   * Handle spoke count change.
   */
  handleSpokeCountChange(layout: SpokeLayout): void;

  /**
   * Handle spoke thickness change.
   */
  handleThicknessChange(side: Side, thickness: string): void;

  /**
   * Handle tolerance change.
   */
  handleToleranceChange(tolerance: number): void;
}
