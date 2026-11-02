import {
  IWheelModel,
  Side,
  SideAverages,
  SpokeLayout,
} from "../types/interfaces";
import { config, DEFAULT_TENSOMETER } from "./config";
import * as spokeLayout from "./spokeLayout";

/**
 * WheelModel - manages the state of wheel spoke data.
 * Implements the observer pattern to notify listeners of changes.
 */
export class WheelModel implements IWheelModel {
  layout: SpokeLayout;
  readings: number[];
  tensions: number[];
  spokeThicknessDS: string;
  spokeThicknessNDS: string;
  tensometer: string;
  tolerance: number;

  private listeners: Array<() => void> = [];

  constructor(initialLayout: SpokeLayout = config.DEFAULT_SPOKE_LAYOUT) {
    this.layout = initialLayout;
    this.readings = [];
    this.tensions = [];
    this.spokeThicknessDS = String(config.DEFAULT_SPOKE_THICKNESS);
    this.spokeThicknessNDS = String(config.DEFAULT_SPOKE_THICKNESS);
    this.tensometer = DEFAULT_TENSOMETER;
    this.tolerance = config.DEFAULT_TOLERANCE;

    // Initialize readings with default values
    this.initializeReadings();
  }

  get nSpokes(): number {
    return spokeLayout.totalSpokes(this.layout);
  }

  /**
   * Initialize readings array with default values based on spoke side.
   */
  private initializeReadings(): void {
    const maxSpokes = Math.max(
      ...config.SUPPORTED_SPOKE_LAYOUTS.map(spokeLayout.totalSpokes),
    );
    this.readings = [];
    this.tensions = [];

    for (let i = 0; i < maxSpokes; i++) {
      const reading = this.isDriveSide(i)
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
   * Update the number of spokes on each side. If the sides now alternate
   * differently, the readings so far belong to spokes of the other side, so
   * they are reset to the defaults.
   */
  setLayout(layout: SpokeLayout): void {
    const sameAlternation =
      layout.ds * this.layout.nds === this.layout.ds * layout.nds;
    this.layout = layout;
    if (!sameAlternation) {
      this.initializeReadings();
    }
    this.notifyListeners();
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
  setSpokeThickness(side: Side, thickness: string): void {
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
   */
  getAverages(): { readings: SideAverages; tensions: SideAverages } {
    let sumReadingsDS = 0;
    let sumReadingsNDS = 0;
    let sumTensionsDS = 0;
    let sumTensionsNDS = 0;

    for (let i = 0; i < this.nSpokes; i++) {
      if (this.isDriveSide(i)) {
        sumReadingsDS += this.readings[i];
        sumTensionsDS += this.tensions[i];
      } else {
        sumReadingsNDS += this.readings[i];
        sumTensionsNDS += this.tensions[i];
      }
    }

    return {
      readings: {
        ds: sumReadingsDS / this.layout.ds,
        nds: sumReadingsNDS / this.layout.nds,
      },
      tensions: {
        ds: sumTensionsDS / this.layout.ds,
        nds: sumTensionsNDS / this.layout.nds,
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
    const avgTension = this.isDriveSide(index)
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
    return spokeLayout.sideOf(this.layout, index) === "ds";
  }

  /**
   * The side of every spoke, by 0-based index.
   */
  sides(): Side[] {
    return spokeLayout.sides(this.layout);
  }

  /**
   * @param index 0-based spoke index
   * @returns 0-based index of the next spoke on the same side
   */
  nextSameSide(index: number): number {
    return spokeLayout.nextSameSide(this.layout, index);
  }

  getSpokeThickness(index: number): string {
    return this.isDriveSide(index)
      ? this.spokeThicknessDS
      : this.spokeThicknessNDS;
  }
}
