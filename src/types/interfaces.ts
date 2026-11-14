/**
 * Application configuration constants
 */
export interface Config {
  /** kgf; the initial readings are what the tensometer shows at it */
  DEFAULT_TENSION: Readonly<Record<Side, number>>;
  /** In the order they are offered */
  SUPPORTED_SPOKE_LAYOUTS: readonly SpokeLayout[];
  DEFAULT_SPOKE_LAYOUT: SpokeLayout;
  DEFAULT_SPOKE_THICKNESS: number; // millimeters
  SUPPORTED_TOLERANCES: readonly number[]; // percents
  DEFAULT_TOLERANCE: number;
  ERROR_STRING_INVALID_INPUT: string;
  /**
   * Percent; a spoke the tensometer does not list is estimated only if the
   * donor tensometer predicts the tensometer's own spokes at least this well
   */
  ESTIMATION_MAX_DONOR_ERROR: number;
  /** kgf; the range of tensions in which a donor's error is measured */
  ESTIMATION_SCORE_TENSIONS: readonly [number, number];
  /**
   * mm; a round spoke is estimated only through a reference spoke whose
   * diameter differs by at most this much
   */
  ESTIMATION_MAX_REFERENCE_DISTANCE: number;
  /**
   * Unselectable entry of the spoke thickness lists, after the tensometer's
   * own spokes and before the estimated ones
   */
  ESTIMATED_SPOKES_SEPARATOR: string;
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

/** What a spoke is made of; the values src/data/spokes.schema.json allows. */
export type SpokeMaterial =
  "steel" | "aluminium" | "titanium" | "carbon" | "polyethylene";

/**
 * One physical spoke in src/data/spokes.yaml, with the other names
 * tensometer charts use for it.
 */
export interface SpokeEntry {
  spoke: string;
  alternative_names?: string[];
  /** Omitted for steel */
  material?: SpokeMaterial;
}

/**
 * Dimensions of a spoke in mm, parsed from its key in spokes.yaml.
 */
export interface SpokeGeometry {
  /** Diameter of a round spoke, or [width, thickness] of a blade */
  middle: number | [number, number];
  /** [head, thread] diameters; null when only the middle is known */
  ends: [number, number] | null;
}

/**
 * How to estimate the tension of a spoke the tensometer does not list:
 * through a reference spoke both it and a donor tensometer list,
 *
 *     tension(r) = donorSpoke( donorReference⁻¹( reference(r) ) )
 */
export interface EstimatePlan {
  /** Donor tensometer, which lists the spoke */
  donor: string;
  /** The spoke's name in the donor's chart */
  donorSpokeName: string;
  donorSpoke: TensionLookupTable;
  /** The reference spoke's name in the tensometer's own chart */
  referenceName: string;
  reference: TensionLookupTable;
  /** The reference spoke's name in the donor's chart */
  donorReferenceName: string;
  donorReference: TensionLookupTable;
  /** The donor's error in predicting the tensometer's own spokes, percent */
  score: number;
}

/** Limits on estimating spokes; see the ESTIMATION_* values in Config. */
export interface EstimationOptions {
  /** Percent */
  maxDonorError: number;
  /** kgf */
  scoreTensions: readonly [number, number];
  /** mm; round spokes only */
  maxReferenceDistance: number;
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
export type SideAverages = Record<Side, number>;

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
  /** Spoke thickness of each side, as the tensometer names it */
  spokeThickness: Record<Side, string>;
  /** Currently selected tensometer name */
  tensometer: string;
  /** Tolerance percentage for warnings */
  tolerance: number;

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
   * Get the spokes the current tensometer does not list but whose tension
   * can be estimated from another tensometer's chart, by their keys in
   * spokes.yaml.
   */
  getEstimatedThicknesses(): string[];

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

  /**
   * Find the current tensometer's name for the same physical spoke as
   * `thickness`, which may be any tensometer's name for it: its own name if
   * it lists the spoke, else the spoke's key if it can estimate it.
   * @returns undefined if the current tensometer can do neither
   */
  findThickness(thickness: string): string | undefined;
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
 * Asks whether to replace the entered readings when the tensometer changes.
 */
export interface IReadingsDialogView {
  /**
   * Ask whether to replace the entered readings with the defaults of the
   * newly chosen tensometer.
   * @param tensometer Name of the newly chosen tensometer
   * @returns Whether to replace them; dismissing the dialog keeps them
   */
  askToReplace(tensometer: string): Promise<boolean>;
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
  /** Callback when the spoke thickness of a side changes */
  onThicknessChange: ((side: Side, thickness: string) => void) | null;
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
   * Handle tensometer selection change. If readings were entered, asks
   * whether to replace them with the new tensometer's defaults first.
   */
  handleTensometerChange(name: string): Promise<void>;

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
