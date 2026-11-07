import {
  ITensionService,
  TensometerFile,
  TensometersDatabase,
  TensionLookupTable,
} from "../types/interfaces";
import { DEFAULT_TENSOMETER } from "../model/config";
import spokes from "../data/spokes.yaml";
import { buildSpokeIndex } from "./spokeIndex";

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
    return this.interpolate(lookupTable, reading);
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
    const readings: TensionLookupTable = Object.fromEntries(
      Object.entries(lookupTable).map(([reading, kgf]) => [
        kgf,
        Number(reading),
      ]),
    );
    // A reading finer than the table's own looks more exact than it is
    const decimals = Math.max(
      ...Object.keys(lookupTable).map((key) => key.split(".")[1]?.length ?? 0),
    );
    return Number(this.interpolate(readings, tension).toFixed(decimals));
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

  /**
   * Interpolate or extrapolate a value from the lookup table.
   * @param values Lookup table mapping reading -> tension
   * @param index The reading to look up
   */
  private interpolate(values: TensionLookupTable, index: number): number {
    // Direct lookup
    if (index in values) {
      return values[index];
    }

    const keys = Object.keys(values);
    if (keys.length === 0) return 0;
    if (keys.length === 1) return values[keys[0]];

    // Sort keys numerically
    const sortedKeys = keys.map(Number).sort((a, b) => a - b);
    const nKeys = sortedKeys.length;

    const min = sortedKeys[0];
    const max = sortedKeys[nKeys - 1];
    const secondMin = sortedKeys[1];
    const secondMax = sortedKeys[nKeys - 2];

    // Extrapolate below minimum
    if (index < min) {
      const slope = (values[secondMin] - values[min]) / (secondMin - min);
      return values[min] - slope * (min - index);
    }

    // Extrapolate above maximum
    if (index > max) {
      const slope = (values[max] - values[secondMax]) / (max - secondMax);
      return values[max] + slope * (index - max);
    }

    // Interpolate between two known points
    // Find the two nearest keys
    let x1 = min;
    let x2 = max;

    for (const key of sortedKeys) {
      if (key < index && key > x1) x1 = key;
      if (key > index && key < x2) x2 = key;
    }

    if (x1 === x2) return values[x1];

    const y1 = values[x1];
    const y2 = values[x2];

    // Linear interpolation
    return y1 + ((index - x1) * (y2 - y1)) / (x2 - x1);
  }
}
