// Shows what the app's spoke estimation does with the current data. It runs
// the app's own estimation code (src/services/estimation.ts) with the limits
// from src/model/config.ts, so its output is what the app will offer.
//
// Usage:
//   npm run estimation-report [-- [OPTIONS] [TENSOMETER]]
//
// Without --holdout, it reports per tensometer:
//   - every other tensometer's donor score: how well that donor predicts the
//     tensometer's own spokes (round and bladed separately; "-" when it
//     cannot be measured), and
//   - every spoke the tensometer does not list but could estimate: from
//     which donor, and through which reference spoke (its name on the
//     tensometer = its name on the donor).
//
// With --holdout, it tests the estimation instead of describing it: each
// spoke of each tensometer is in turn removed from that tensometer's chart,
// estimated from the remaining data exactly as the app would, and the
// estimate compared with the removed chart. The error of one spoke is the
// mean relative error at the chart's tensions within
// ESTIMATION_SCORE_TENSIONS. It prints, per tensometer and in total, how
// many spokes got an estimate, their median error, the share within 10 %,
// and every estimate worse than 10 % with its donor and reference. Given a
// TENSOMETER, it lists the result for each of its spokes.
//
// Run it after adding or changing tensometer data, or after changing the
// estimation method or limits: the hold-out shows whether estimates stay
// accurate, the plain report what the users of each tensometer will get.
//
// Options:
//   --holdout          run the hold-out test described above
//   --max-error=PCT    donor score limit (default ESTIMATION_MAX_DONOR_ERROR)
//   --max-distance=MM  reference distance limit for round spokes
//                      (default ESTIMATION_MAX_REFERENCE_DISTANCE)
//   TENSOMETER         limit the output to this tensometer, e.g. "ZTTO TC-02"

import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import type {
  EstimatePlan,
  EstimationOptions,
  SpokeEntry,
  TensometerFile,
  TensometersDatabase,
} from "../src/types/interfaces.ts";
import { config } from "../src/model/config.ts";
import { buildSpokeIndex } from "../src/services/spokeIndex.ts";
import {
  donorScore,
  estimateTension,
  planEstimates,
} from "../src/services/estimation.ts";

/** The outcome of hiding one spoke and estimating it. */
interface HoldoutResult {
  /** The spoke's name in the tensometer's chart */
  name: string;
  /** null when the spoke could not be estimated */
  plan: EstimatePlan | null;
  /** Mean relative error of the estimate; null if not estimated */
  error: number | null;
}

const DATA = path.join(import.meta.dirname, "..", "src", "data");
const load = <T>(file: string): T =>
  yaml.load(fs.readFileSync(file, "utf8")) as T;

const args = process.argv.slice(2);
const option = (name: string, fallback: number): number => {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  return arg ? Number(arg.split("=")[1]) : fallback;
};
const options: EstimationOptions = {
  maxDonorError: option("max-error", config.ESTIMATION_MAX_DONOR_ERROR),
  scoreTensions: config.ESTIMATION_SCORE_TENSIONS,
  maxReferenceDistance: option(
    "max-distance",
    config.ESTIMATION_MAX_REFERENCE_DISTANCE,
  ),
};
const holdout = args.includes("--holdout");
const only = args.find((a) => !a.startsWith("--"));

const data: TensometersDatabase = {};
for (const file of fs.readdirSync(path.join(DATA, "tensometers")).sort()) {
  if (!file.endsWith(".yaml")) continue;
  const tensometer = load<TensometerFile>(path.join(DATA, "tensometers", file));
  data[tensometer.name] = tensometer.spokes;
}
const spokes = load<SpokeEntry[]>(path.join(DATA, "spokes.yaml"));
// Any tensometer's spoke name -> key of the physical spoke
const index = buildSpokeIndex(spokes);

if (only && !data[only]) {
  console.error(`Unknown tensometer "${only}"; known: ${Object.keys(data)}`);
  process.exit(1);
}
const tensometers = Object.keys(data)
  .sort()
  .filter((t) => !only || t === only);

/** A fraction as a whole percentage; "-" for null. */
const percent = (v: number | null): string =>
  v === null ? "-" : `${(v * 100).toFixed(0)}%`;
const median = (values: number[]): number | null => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[sorted.length >> 1] : null;
};
const [low, high] = options.scoreTensions;
console.log(
  `Donor scores measured at ${low}-${high} kgf; estimates offered from` +
    ` donors scoring <= ${options.maxDonorError}%, for round spokes through` +
    ` a reference at most ${options.maxReferenceDistance} mm away.`,
);

if (holdout) {
  reportHoldout();
} else {
  reportEstimates();
}

/** Donor scores and the estimable spokes, per tensometer. */
function reportEstimates(): void {
  const summary: string[] = [];
  for (const tensometer of tensometers) {
    console.log(`\n== ${tensometer}`);
    console.log("  donor scores (round / bladed):");
    for (const donor of Object.keys(data).sort()) {
      if (donor === tensometer) continue;
      const [round, bladed] = [false, true].map((b) => {
        const score = donorScore(
          data[tensometer],
          data[donor],
          spokes,
          b,
          options,
        );
        return score === null ? null : score / 100;
      });
      console.log(
        `    ${donor.padEnd(20)} ${percent(round).padStart(4)} / ${percent(bladed)}`,
      );
    }
    const plans = planEstimates(data, spokes, tensometer, options);
    console.log(`  estimated spokes: ${plans.size}`);
    for (const [spoke, plan] of [...plans].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      console.log(
        `    ${spoke.padEnd(42)} from ${plan.donor}` +
          ` (${percent(plan.score / 100)})` +
          ` via "${plan.referenceName}" = "${plan.donorReferenceName}"`,
      );
    }
    summary.push(`${tensometer}: ${plans.size}`);
  }
  if (!only) console.log(`\nEstimated spokes: ${summary.join(", ")}`);
}

/**
 * Hide each spoke of a tensometer in turn, estimate it from the remaining
 * data, and compare the estimate with the hidden chart.
 * @returns One result per spoke of the tensometer
 */
function holdoutResults(tensometer: string): HoldoutResult[] {
  const results: HoldoutResult[] = [];
  for (const name of Object.keys(data[tensometer])) {
    const rest = Object.fromEntries(
      Object.entries(data[tensometer]).filter(([other]) => other !== name),
    );
    const plans = planEstimates(
      { ...data, [tensometer]: rest },
      spokes,
      tensometer,
      options,
    );
    const plan = plans.get(index.get(name));
    if (!plan) {
      results.push({ name, plan: null, error: null });
      continue;
    }
    const errors = Object.entries(data[tensometer][name])
      .filter(([, kgf]) => kgf >= low && kgf <= high)
      .map(
        ([reading, kgf]) =>
          Math.abs(estimateTension(plan, Number(reading)) - kgf) / kgf,
      );
    const error = errors.length
      ? errors.reduce((a, b) => a + b) / errors.length
      : null;
    results.push({ name, plan, error });
  }
  return results;
}

/** The hold-out test, per tensometer and in total. */
function reportHoldout(): void {
  const describe = (results: HoldoutResult[]): string => {
    const errors = results.map((r) => r.error).filter((e) => e !== null);
    const within = errors.filter((e) => e <= 0.1).length;
    return (
      `${String(errors.length).padStart(3)} of ${String(results.length).padStart(3)} estimated;` +
      ` median error ${percent(median(errors)).padStart(4)},` +
      ` within 10%: ${errors.length ? percent(within / errors.length) : "-"}`
    );
  };
  const via = (plan: EstimatePlan): string =>
    `from ${plan.donor} via "${plan.referenceName}" = "${plan.donorReferenceName}"`;

  const all: (HoldoutResult & { tensometer: string })[] = [];
  console.log("\nHold-out test: each spoke hidden and estimated in turn.\n");
  for (const tensometer of tensometers) {
    const results = holdoutResults(tensometer);
    all.push(...results.map((r) => ({ ...r, tensometer })));
    console.log(`  ${tensometer.padEnd(20)} ${describe(results)}`);
    if (only) {
      for (const r of results) {
        const outcome =
          r.plan === null
            ? "not estimated"
            : `${percent(r.error).padStart(4)}  ${via(r.plan)}`;
        console.log(`    ${r.name.padEnd(42)} ${outcome}`);
      }
    }
  }
  if (!only) console.log(`\n  ${"All".padEnd(20)} ${describe(all)}`);

  const poor = all
    .filter((r) => r.plan !== null && r.error !== null && r.error > 0.1)
    .sort((a, b) => b.error! - a.error!);
  if (poor.length > 0) {
    console.log("\nEstimates worse than 10%:");
    for (const r of poor) {
      console.log(
        `  ${percent(r.error).padStart(4)}  ${r.tensometer}: "${r.name}" ${via(r.plan!)}`,
      );
    }
  }
}
