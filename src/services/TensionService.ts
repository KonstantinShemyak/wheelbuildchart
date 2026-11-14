import {
  EstimatePlan,
  ITensionService,
  SpokeEntry,
  TensionLookupTable,
  TensometerFile,
  TensometersDatabase,
} from "../types/interfaces";
import { config, DEFAULT_TENSOMETER } from "../model/config";
import spokes from "../data/spokes.yaml";
import { buildSpokeIndex } from "./spokeIndex";
import { interpolate, invert, readingDecimals } from "./lookup";
import { estimateReading, estimateTension, planEstimates } from "./estimation";

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
 * Spokes the current tensometer does not list are estimated from another
 * tensometer's chart where that is reliable enough (see estimation.ts).
 */
export class TensionService implements ITensionService {
  private data: TensometersDatabase;
  private currentTensometer: string;
  private spokes: SpokeEntry[];
  /** Any tensometer's spoke name -> key of the physical spoke */
  private spokeIndex: Map<string, string>;
  /** Spokes the current tensometer can estimate: key -> how */
  private estimates: Map<string, EstimatePlan>;

  constructor(
    data: TensometersDatabase = tensometers,
    defaultTensometer: string = DEFAULT_TENSOMETER,
    spokeList: SpokeEntry[] = spokes,
  ) {
    this.data = data;
    this.spokes = spokeList;
    this.spokeIndex = buildSpokeIndex(spokeList);
    this.selectTensometer(defaultTensometer);
  }

  /**
   * Get tension (kgf) for a given spoke thickness and reading.
   * Uses interpolation/extrapolation for values not in the table.
   */
  tension(spokeThickness: string, reading: number): number {
    const lookupTable = this.lookupTable(spokeThickness);
    if (lookupTable) return interpolate(lookupTable, reading);
    const plan = this.estimates.get(spokeThickness);
    if (plan) return estimateTension(plan, reading);
    this.warnUnknown(spokeThickness);
    return 0;
  }

  /**
   * Get the reading at a given tension (kgf) for a given spoke thickness,
   * rounded to the precision of the tensometer's table.
   */
  reading(spokeThickness: string, tension: number): number {
    const lookupTable = this.lookupTable(spokeThickness);
    if (lookupTable) {
      return Number(
        interpolate(invert(lookupTable), tension).toFixed(
          readingDecimals(lookupTable),
        ),
      );
    }
    const plan = this.estimates.get(spokeThickness);
    if (plan) return estimateReading(plan, tension);
    this.warnUnknown(spokeThickness);
    return 0;
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
   * Get the spokes the current tensometer does not list but whose tension
   * can be estimated from another tensometer's chart, by their keys in
   * spokes.yaml.
   */
  getEstimatedThicknesses(): string[] {
    return [...this.estimates.keys()].sort();
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
      this.selectTensometer(name);
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
   * `thickness`, which may be any tensometer's name for it: its own name if
   * it lists the spoke, else the spoke's key if it can estimate it.
   * @returns undefined if the current tensometer can do neither
   */
  findThickness(thickness: string): string | undefined {
    const spoke = this.spokeIndex.get(thickness);
    if (spoke === undefined) return undefined;
    const own = this.getSupportedThicknesses().find(
      (name) => this.spokeIndex.get(name) === spoke,
    );
    if (own !== undefined) return own;
    return this.estimates.has(spoke) ? spoke : undefined;
  }

  private selectTensometer(name: string): void {
    this.currentTensometer = name;
    this.estimates = planEstimates(this.data, this.spokes, name, {
      maxDonorError: config.ESTIMATION_MAX_DONOR_ERROR,
      scoreTensions: config.ESTIMATION_SCORE_TENSIONS,
      maxReferenceDistance: config.ESTIMATION_MAX_REFERENCE_DISTANCE,
    });
  }

  private lookupTable(spokeThickness: string): TensionLookupTable | undefined {
    return this.data[this.currentTensometer]?.[spokeThickness];
  }

  private warnUnknown(spokeThickness: string): void {
    console.warn(
      `No lookup table for tensometer "${this.currentTensometer}" and thickness "${spokeThickness}"`,
    );
  }
}
