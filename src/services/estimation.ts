import type {
  EstimatePlan,
  EstimationOptions,
  SpokeEntry,
  SpokeGeometry,
  TensionLookupTable,
  TensometerData,
  TensometersDatabase,
} from "../types/interfaces";
import { interpolate, invert, readingDecimals } from "./lookup.ts";
import { buildSpokeIndex } from "./spokeIndex.ts";
import {
  endsDistance,
  isBladed,
  middleDistance,
  parseSpoke,
} from "../model/spokeGeometry.ts";

// Estimating the tension of a spoke the user's tensometer does not list,
// from a donor tensometer which lists it. Both tensometers must list a
// common reference spoke: the reading on the user's tensometer gives the
// reference's tension, which the donor's chart turns into the donor's
// reading, and that into the spoke's tension. Pure functions; they import
// nothing at runtime but each other, so Node scripts can use them as well.

/** A spoke in a tensometer's chart whose dimensions are known. */
interface ChartSpoke {
  /** Name in this tensometer's chart */
  name: string;
  /** Key of the physical spoke in spokes.yaml */
  spoke: string;
  geometry: SpokeGeometry;
}

/** A spoke both tensometers list, at least by its middle section. */
interface CommonSpoke {
  /** In the user's tensometer's chart */
  mine: ChartSpoke;
  /** In the donor's chart */
  theirs: ChartSpoke;
}

/** Tension (kgf) of the donor's spoke at a reading on the user's tensometer */
function transfer(
  reference: TensionLookupTable,
  donorReference: TensionLookupTable,
  donorSpoke: TensionLookupTable,
  reading: number,
): number {
  const tension = interpolate(reference, reading);
  const donorReading = interpolate(invert(donorReference), tension);
  return interpolate(donorSpoke, donorReading);
}

/** What the estimation needs to know about the spokes of spokes.yaml. */
interface Catalogue {
  /** Any tensometer's spoke name -> key of the physical spoke */
  index: Map<string, string>;
  /** Keys of the steel spokes */
  steel: Set<string>;
}

function catalogue(spokes: SpokeEntry[]): Catalogue {
  return {
    index: buildSpokeIndex(spokes),
    steel: new Set(
      spokes
        .filter((entry) => (entry.material ?? "steel") === "steel")
        .map((entry) => entry.spoke),
    ),
  };
}

/**
 * The steel spokes of a chart whose dimensions are known. Spokes of other
 * materials bend differently from steel ones of the same size, and no two
 * tensometers list the same non-steel spoke, so they are never estimated
 * nor used as references.
 */
function chartSpokes(chart: TensometerData, known: Catalogue): ChartSpoke[] {
  const result: ChartSpoke[] = [];
  for (const name of Object.keys(chart)) {
    const spoke = known.index.get(name);
    if (spoke === undefined || !known.steel.has(spoke)) continue;
    const geometry = parseSpoke(spoke);
    if (geometry) result.push({ name, spoke, geometry });
  }
  return result;
}

/**
 * Spokes both charts list, one per middle section, of the given kind.
 * Spokes count as common when their middles are the same: the ends change
 * the tension by a few percent at most. Of several spokes with that middle,
 * the pair which is the same physical spoke is preferred, else the pair with
 * the closest ends.
 */
function commonSpokes(
  mine: ChartSpoke[],
  theirs: ChartSpoke[],
  bladed: boolean,
): CommonSpoke[] {
  const best = new Map<string, CommonSpoke & { cost: number }>();
  for (const m of mine) {
    if (isBladed(m.geometry) !== bladed) continue;
    for (const t of theirs) {
      if (middleDistance(m.geometry, t.geometry) !== 0) continue;
      const cost =
        m.spoke === t.spoke ? -1 : endsDistance(m.geometry, t.geometry);
      const middle = String(m.geometry.middle);
      const current = best.get(middle);
      if (!current || cost < current.cost) {
        best.set(middle, { mine: m, theirs: t, cost });
      }
    }
  }
  return [...best.values()].map(({ mine, theirs }) => ({ mine, theirs }));
}

/**
 * The common spoke closest to the given one: by middle, then by ends. Middle
 * distances are compared in whole micrometres, so that e.g. 1.6 and 1.8 are
 * equally close to 1.7 despite floating-point noise.
 */
function closest(
  candidates: CommonSpoke[],
  geometry: SpokeGeometry,
): CommonSpoke | undefined {
  const middle = (c: CommonSpoke) =>
    Math.round(1000 * middleDistance(c.mine.geometry, geometry));
  const ends = (c: CommonSpoke) => endsDistance(c.mine.geometry, geometry);
  return [...candidates].sort(
    (a, b) => middle(a) - middle(b) || ends(a) - ends(b),
  )[0];
}

/**
 * Whether a reference is close enough to estimate the given spoke through
 * it. For round spokes the error grows quickly with the difference in
 * diameter, so it is limited; for bladed ones no such rule showed in the
 * data, and only the donor's score limits them.
 */
function inReach(
  via: CommonSpoke,
  geometry: SpokeGeometry,
  options: EstimationOptions,
): boolean {
  if (isBladed(geometry)) return true;
  const distance = Math.round(
    1000 * middleDistance(via.mine.geometry, geometry),
  );
  return distance <= Math.round(1000 * options.maxReferenceDistance);
}

/**
 * How well a donor predicts the user's tensometer: each spoke both list
 * (of the given kind) is predicted from the closest other one through the
 * donor, as if the user's tensometer did not list it, when that one is in
 * reach. The mean relative error at the table's tensions within
 * `options.scoreTensions`, in percent.
 * @param spokes The spoke list of spokes.yaml
 * @returns null when no such prediction is possible
 */
export function donorScore(
  mine: TensometerData,
  theirs: TensometerData,
  spokes: SpokeEntry[],
  bladed: boolean,
  options: EstimationOptions,
): number | null {
  return scoreDonor(mine, theirs, catalogue(spokes), bladed, options);
}

function scoreDonor(
  mine: TensometerData,
  theirs: TensometerData,
  known: Catalogue,
  bladed: boolean,
  options: EstimationOptions,
): number | null {
  const common = commonSpokes(
    chartSpokes(mine, known),
    chartSpokes(theirs, known),
    bladed,
  );
  const [low, high] = options.scoreTensions;
  const errors: number[] = [];
  for (const predicted of common) {
    const others = common.filter((c) => c !== predicted);
    const via = closest(others, predicted.mine.geometry);
    if (!via || !inReach(via, predicted.mine.geometry, options)) continue;
    const spokeErrors = Object.entries(mine[predicted.mine.name])
      .filter(([, kgf]) => kgf >= low && kgf <= high)
      .map(([reading, kgf]) => {
        const estimate = transfer(
          mine[via.mine.name],
          theirs[via.theirs.name],
          theirs[predicted.theirs.name],
          Number(reading),
        );
        return Math.abs(estimate - kgf) / kgf;
      });
    if (spokeErrors.length > 0) {
      errors.push(spokeErrors.reduce((a, b) => a + b) / spokeErrors.length);
    }
  }
  if (errors.length === 0) return null;
  return (100 * errors.reduce((a, b) => a + b)) / errors.length;
}

/**
 * For every spoke the tensometer does not list but some other tensometer
 * does, how to estimate it: from the donor which predicts the tensometer's
 * own spokes best, if within `options.maxDonorError` percent, through the
 * common spoke closest to it, if in reach. Round and bladed spokes never
 * stand in for each other; spokes of unknown dimensions and non-steel ones
 * are neither estimated nor references.
 * @param spokes The spoke list of spokes.yaml
 * @returns Key of the spoke in spokes.yaml -> its estimate plan
 */
export function planEstimates(
  data: TensometersDatabase,
  spokes: SpokeEntry[],
  tensometer: string,
  options: EstimationOptions,
): Map<string, EstimatePlan> {
  const known = catalogue(spokes);
  const mine = chartSpokes(data[tensometer], known);
  const listed = new Set(mine.map((s) => s.spoke));
  const plans = new Map<string, EstimatePlan>();

  for (const donor of Object.keys(data).sort()) {
    if (donor === tensometer) continue;
    const theirs = chartSpokes(data[donor], known);
    for (const bladed of [false, true]) {
      const score = scoreDonor(
        data[tensometer],
        data[donor],
        known,
        bladed,
        options,
      );
      if (score === null || score > options.maxDonorError) continue;
      const common = commonSpokes(mine, theirs, bladed);
      for (const target of theirs) {
        if (listed.has(target.spoke)) continue;
        if (isBladed(target.geometry) !== bladed) continue;
        const current = plans.get(target.spoke);
        if (current && current.score <= score) continue;
        const via = closest(common, target.geometry);
        if (!via || !inReach(via, target.geometry, options)) continue;
        plans.set(target.spoke, {
          donor,
          donorSpokeName: target.name,
          donorSpoke: data[donor][target.name],
          referenceName: via.mine.name,
          reference: data[tensometer][via.mine.name],
          donorReferenceName: via.theirs.name,
          donorReference: data[donor][via.theirs.name],
          score,
        });
      }
    }
  }
  return plans;
}

/** Estimated tension (kgf) at a reading on the user's tensometer. */
export function estimateTension(plan: EstimatePlan, reading: number): number {
  return transfer(
    plan.reference,
    plan.donorReference,
    plan.donorSpoke,
    reading,
  );
}

/**
 * Estimated reading on the user's tensometer at a tension (kgf), rounded to
 * the precision of the tensometer's own table.
 */
export function estimateReading(plan: EstimatePlan, tension: number): number {
  const donorReading = interpolate(invert(plan.donorSpoke), tension);
  const referenceTension = interpolate(plan.donorReference, donorReading);
  const reading = interpolate(invert(plan.reference), referenceTension);
  return Number(reading.toFixed(readingDecimals(plan.reference)));
}
