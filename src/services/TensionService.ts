import {
  ITensionService,
  TensometerFile,
  TensometersDatabase,
} from "../types/interfaces";
import { DEFAULT_TENSOMETER } from "../model/config";
import spokes from "../data/spokes.yaml";
import { buildSpokeIndex } from "./spokeIndex";
import { interpolate, invert, readingDecimals } from "./lookup";

const tensometerModules = import.meta.glob<{ default: TensometerFile }>(
  "../data/tensometers/*.yaml",
  { eager: true },
);
const tensometers: TensometersDatabase = Object.fromEntries(
  Object.values(tensometerModules).map((mod) => [
    mod.default.name,
    mod.default.spokes,
  ]),
);

/**
 * Service for looking up tension values from tensometer readings.
 * Uses linear interpolation for values between table entries,
 * and linear extrapolation for values outside the table range.
 */
export class TensionService implements ITensionService {
  private data: TensometersDatabase;
  private currentTensometer: string;
  /** Any tensometer's spoke name -> key of the physical spoke */
  private spokeIndex: Map<string, string>;

  constructor(
    data: TensometersDatabase = tensometers,
    defaultTensometer: string = DEFAULT_TENSOMETER,
    spokeIndex: Map<string, string> = buildSpokeIndex(spokes),
  ) {
    this.data = data;
    this.currentTensometer = defaultTensometer;
    this.spokeIndex = spokeIndex;
  }

  /**
   * Get tension (kgf) for a given spoke thickness and reading.
   * Uses interpolation/extrapolation for values not in the table.
   */
  tension(spokeThickness: string, reading: number): number {
    const lookupTable = this.data[this.currentTensometer][spokeThickness];
    if (!lookupTable) {
      console.warn(
        `No lookup table for tensometer "${this.currentTensometer}" and thickness "${spokeThickness}"`,
      );
      return 0;
    }
    return interpolate(lookupTable, reading);
  }

  /**
   * Get the reading at a given tension (kgf) for a given spoke thickness,
   * rounded to the precision of the tensometer's table.
   */
  reading(spokeThickness: string, tension: number): number {
    const lookupTable = this.data[this.currentTensometer][spokeThickness];
    if (!lookupTable) {
      console.warn(
        `No lookup table for tensometer "${this.currentTensometer}" and thickness "${spokeThickness}"`,
      );
      return 0;
    }
    return Number(
      interpolate(invert(lookupTable), tension).toFixed(
        readingDecimals(lookupTable),
      ),
    );
  }

  /**
   * Get list of supported spoke thicknesses for current tensometer.
   */
  getSupportedThicknesses(): string[] {
    const tensometerData = this.data[this.currentTensometer];
    if (!tensometerData) return [];
    return Object.keys(tensometerData).sort();
  }

  /**
   * Get list of all available tensometer names.
   */
  getTensometers(): string[] {
    return Object.keys(this.data).sort();
  }

  /**
   * Set the current tensometer.
   */
  setTensometer(name: string): void {
    if (this.data[name]) {
      this.currentTensometer = name;
    } else {
      console.warn(`Unknown tensometer: "${name}"`);
    }
  }

  /**
   * Get the current tensometer name.
   */
  getCurrentTensometer(): string {
    return this.currentTensometer;
  }

  /**
   * Find the current tensometer's name for the same physical spoke as
   * `thickness`, which may be any tensometer's name for it.
   * @returns undefined if the current tensometer does not list that spoke
   */
  findThickness(thickness: string): string | undefined {
    const spoke = this.spokeIndex.get(thickness);
    if (spoke === undefined) return undefined;
    return this.getSupportedThicknesses().find(
      (own) => this.spokeIndex.get(own) === spoke,
    );
  }
}
