import {
  EstimatePlan,
  ITensionService,
  SpokeEntry,
  TensionLookupTable,
  TensometerFile,
  TensometersDatabase,
} from "../types/interfaces";
import { config } from "../model/config";
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
 * Spokes a tensometer does not list are estimated from another
 * tensometer's chart where that is reliable enough (see estimation.ts).
 *
 * It holds no selection: the tensometer is the model's, and every method
 * is given it.
 */
export class TensionService implements ITensionService {
  private data: TensometersDatabase;
  private spokes: SpokeEntry[];
  /** Any tensometer's spoke name -> key of the physical spoke */
  private spokeIndex: Map<string, string>;
  /**
   * Tensometer -> the spokes it can estimate: key -> how. Planning is the
   * costly part, so each tensometer's plans are made once, when first needed.
   */
  private estimatePlans = new Map<string, Map<string, EstimatePlan>>();

  constructor(
    data: TensometersDatabase = tensometers,
    spokeList: SpokeEntry[] = spokes,
  ) {
    this.data = data;
    this.spokes = spokeList;
    this.spokeIndex = buildSpokeIndex(spokeList);
  }

  /**
   * Get tension (kgf) for a given spoke thickness and reading.
   * Uses interpolation/extrapolation for values not in the table.
   */
  tension(tensometer: string, spokeThickness: string, reading: number): number {
    const lookupTable = this.lookupTable(tensometer, spokeThickness);
    if (lookupTable) return interpolate(lookupTable, reading);
    const plan = this.estimates(tensometer).get(spokeThickness);
    if (plan) return estimateTension(plan, reading);
    this.warnUnknown(tensometer, spokeThickness);
    return 0;
  }

  /**
   * Get the reading at a given tension (kgf) for a given spoke thickness,
   * rounded to the precision of the tensometer's table.
   */
  reading(tensometer: string, spokeThickness: string, tension: number): number {
    const lookupTable = this.lookupTable(tensometer, spokeThickness);
    if (lookupTable) {
      return Number(
        interpolate(invert(lookupTable), tension).toFixed(
          readingDecimals(lookupTable),
        ),
      );
    }
    const plan = this.estimates(tensometer).get(spokeThickness);
    if (plan) return estimateReading(plan, tension);
    this.warnUnknown(tensometer, spokeThickness);
    return 0;
  }

  /**
   * Get list of spoke thicknesses the tensometer lists.
   */
  getSupportedThicknesses(tensometer: string): string[] {
    return Object.keys(this.data[tensometer] ?? {}).sort();
  }

  /**
   * Get the spokes the tensometer does not list but whose tension can be
   * estimated from another tensometer's chart, by their keys in spokes.yaml.
   */
  getEstimatedThicknesses(tensometer: string): string[] {
    return [...this.estimates(tensometer).keys()].sort();
  }

  /**
   * Get list of all available tensometer names.
   */
  getTensometers(): string[] {
    return Object.keys(this.data).sort();
  }

  /**
   * Find the tensometer's name for the same physical spoke as `thickness`,
   * which may be any tensometer's name for it: its own name if it lists the
   * spoke, else the spoke's key if it can estimate it.
   * @returns undefined if the tensometer can do neither
   */
  findThickness(tensometer: string, thickness: string): string | undefined {
    const spoke = this.spokeIndex.get(thickness);
    if (spoke === undefined) return undefined;
    const own = this.getSupportedThicknesses(tensometer).find(
      (name) => this.spokeIndex.get(name) === spoke,
    );
    if (own !== undefined) return own;
    return this.estimates(tensometer).has(spoke) ? spoke : undefined;
  }

  private estimates(tensometer: string): Map<string, EstimatePlan> {
    let plans = this.estimatePlans.get(tensometer);
    if (!plans) {
      // An unknown tensometer estimates nothing; the lookups then warn.
      plans = this.data[tensometer]
        ? planEstimates(this.data, this.spokes, tensometer, {
            maxDonorError: config.ESTIMATION_MAX_DONOR_ERROR,
            scoreTensions: config.ESTIMATION_SCORE_TENSIONS,
            maxReferenceDistance: config.ESTIMATION_MAX_REFERENCE_DISTANCE,
          })
        : new Map();
      this.estimatePlans.set(tensometer, plans);
    }
    return plans;
  }

  private lookupTable(
    tensometer: string,
    spokeThickness: string,
  ): TensionLookupTable | undefined {
    return this.data[tensometer]?.[spokeThickness];
  }

  private warnUnknown(tensometer: string, spokeThickness: string): void {
    console.warn(
      `No lookup table for tensometer "${tensometer}" and thickness "${spokeThickness}"`,
    );
  }
}
