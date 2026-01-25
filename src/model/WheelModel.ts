import { IWheelModel, SideAverages } from "../types/interfaces";
import { config, DEFAULT_TENSOMETER } from "./config";

/**
 * WheelModel - manages the state of wheel spoke data.
 * Implements the observer pattern to notify listeners of changes.
 */
export class WheelModel implements IWheelModel {
  nSpokes: number;
  readings: number[];
  tensions: number[];
  spokeThicknessDS: string;
  spokeThicknessNDS: string;
  tensometer: string;
  tolerance: number;

  private listeners: Array<() => void> = [];

  constructor(initialNSpokes: number = config.DEFAULT_SPOKES) {
    this.nSpokes = initialNSpokes;
    this.readings = [];
    this.tensions = [];
    this.spokeThicknessDS = String(config.DEFAULT_SPOKE_THICKNESS);
    this.spokeThicknessNDS = String(config.DEFAULT_SPOKE_THICKNESS);
    this.tensometer = DEFAULT_TENSOMETER;
    this.tolerance = config.DEFAULT_TOLERANCE;

    // Initialize readings with default values
    this.initializeReadings();
  }

  /**
   * Initialize readings array with default values based on spoke position.
   * Odd spokes (1, 3, 5...) are drive side, even (2, 4, 6...) are non-drive side.
   */
  private initializeReadings(): void {
    const maxSpokes =
      config.SUPPORTED_SPOKE_COUNTS[config.SUPPORTED_SPOKE_COUNTS.length - 1];
    this.readings = [];
    this.tensions = [];

    for (let i = 0; i < maxSpokes; i++) {
      // i is 0-indexed, but spoke numbering is 1-indexed
      // Spoke 1 (i=0) is drive side, spoke 2 (i=1) is non-drive side
      const isDriveSide = i % 2 === 0;
      const reading = isDriveSide
        ? config.INITIAL_READING_DRIVE_SIDE
        : config.INITIAL_READING_NON_DRIVE_SIDE;
      this.readings.push(reading);
      this.tensions.push(0); // Will be computed by presenter
    }
  }

  /**
   * Set the reading for a specific spoke.
   * @param index 0-based spoke index
   * @param value Tensometer reading
   */
  setReading(index: number, value: number): void {
    if (index >= 0 && index < this.readings.length) {
      this.readings[index] = value;
      this.notifyListeners();
    }
  }

  /**
   * Set the tension for a specific spoke (called after computation).
   * @param index 0-based spoke index
   * @param value Tension in kgf
   */
  setTension(index: number, value: number): void {
    if (index >= 0 && index < this.tensions.length) {
      this.tensions[index] = value;
    }
  }

  /**
   * Update the number of spokes.
   */
  setNSpokes(count: number): void {
    if (config.SUPPORTED_SPOKE_COUNTS.includes(count)) {
      this.nSpokes = count;
      this.notifyListeners();
    }
  }

  /**
   * Update the tensometer.
   */
  setTensometer(name: string): void {
    this.tensometer = name;
    this.notifyListeners();
  }

  /**
   * Update spoke thickness for a side.
   */
  setSpokeThickness(side: "ds" | "nds", thickness: string): void {
    if (side === "ds") {
      this.spokeThicknessDS = thickness;
    } else {
      this.spokeThicknessNDS = thickness;
    }
    this.notifyListeners();
  }

  /**
   * Update tolerance.
   */
  setTolerance(tolerance: number): void {
    if (config.SUPPORTED_TOLERANCES.includes(tolerance)) {
      this.tolerance = tolerance;
      this.notifyListeners();
    }
  }

  /**
   * Get the average readings and tensions for each side.
   * Drive side = odd spokes (1-indexed), Non-drive = even spokes (1-indexed)
   */
  getAverages(): { readings: SideAverages; tensions: SideAverages } {
    let sumReadingsDS = 0;
    let sumReadingsNDS = 0;
    let sumTensionsDS = 0;
    let sumTensionsNDS = 0;
    const halfSpokes = this.nSpokes / 2;

    for (let i = 0; i < this.nSpokes; i++) {
      const isDriveSide = i % 2 === 0; // 0-indexed: even = drive side (spoke 1, 3, 5...)
      if (isDriveSide) {
        sumReadingsDS += this.readings[i];
        sumTensionsDS += this.tensions[i];
      } else {
        sumReadingsNDS += this.readings[i];
        sumTensionsNDS += this.tensions[i];
      }
    }

    return {
      readings: {
        ds: sumReadingsDS / halfSpokes,
        nds: sumReadingsNDS / halfSpokes,
      },
      tensions: {
        ds: sumTensionsDS / halfSpokes,
        nds: sumTensionsNDS / halfSpokes,
      },
    };
  }

  /**
   * Check if a tension value is within tolerance for its side.
   * @param index 0-based spoke index
   * @param tension Tension value to check
   */
  isWithinTolerance(index: number, tension: number): boolean {
    const averages = this.getAverages();
    const isDriveSide = index % 2 === 0;
    const avgTension = isDriveSide
      ? averages.tensions.ds
      : averages.tensions.nds;

    const minTolerated = avgTension * ((100 - this.tolerance) / 100);
    const maxTolerated = avgTension * ((100 + this.tolerance) / 100);

    return tension >= minTolerated && tension <= maxTolerated;
  }

  /**
   * Subscribe to model changes.
   * @param callback Function to call when model changes
   * @returns Unsubscribe function
   */
  onChange(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of a change.
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * @param index 0-based spoke index
   */
  isDriveSide(index: number): boolean {
    return index % 2 === 0;
  }

  getSpokeThickness(index: number): string {
    return this.isDriveSide(index)
      ? this.spokeThicknessDS
      : this.spokeThicknessNDS;
  }
}
