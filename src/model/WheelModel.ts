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
 */
export class WheelModel implements IWheelModel {
  layout: SpokeLayout;
  readings: number[];
  tensions: number[];
  spokeThicknessDS: string;
  spokeThicknessNDS: string;
  tensometer: string;
  tolerance: number;

  // The reading of a sensible tension depends on the tensometer, which the
  // model cannot convert; the presenter sets these with resetReadings().
  private defaultReadings: Record<Side, number> = { ds: 0, nds: 0 };

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
      this.readings.push(
        this.defaultReadings[spokeLayout.sideOf(this.layout, i)],
      );
      this.tensions.push(0); // Will be computed by presenter
    }
  }

  /**
   * Set every reading to the default of its side, and remember these
   * defaults for when the readings are reset again.
   */
  resetReadings(defaults: Record<Side, number>): void {
    this.defaultReadings = { ...defaults };
    this.initializeReadings();
  }

  /**
   * Whether every reading still has the default of its side, i.e. none was
   * entered.
   */
  readingsAreDefault(): boolean {
    return this.readings
      .slice(0, this.nSpokes)
      .every(
        (reading, i) =>
          reading === this.defaultReadings[spokeLayout.sideOf(this.layout, i)],
      );
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
