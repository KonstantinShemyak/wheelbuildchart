import type { Config, SpokeLayout } from "../types/interfaces";

/** Equal number of spokes on both sides, `total` in all. */
const evenlyLaced = (total: number): SpokeLayout => ({
  ds: total / 2,
  nds: total / 2,
});

export const config: Config = {
  // A ParkTool TM-1 reads 20 and 18 at these on 2.0 mm spokes
  DEFAULT_TENSION_DRIVE_SIDE: 70,
  DEFAULT_TENSION_NON_DRIVE_SIDE: 58,
  SUPPORTED_SPOKE_LAYOUTS: [
    ...[16, 18, 20, 24, 28, 32, 36, 40].map(evenlyLaced),
    // 2:1 lacing
    { ds: 12, nds: 6 },
    { ds: 14, nds: 7 },
    { ds: 16, nds: 8 },
  ],
  DEFAULT_SPOKE_LAYOUT: evenlyLaced(32),
  DEFAULT_SPOKE_THICKNESS: 2,
  SUPPORTED_TOLERANCES: [5, 7.5, 10, 15, 20] as const,
  DEFAULT_TOLERANCE: 20,
  ERROR_STRING_INVALID_INPUT:
    ": invalid input (a number like '23' or '23.2' expected)",
  ESTIMATION_MAX_DONOR_ERROR: 10,
  ESTIMATION_SCORE_TENSIONS: [60, 160],
  ESTIMATION_MAX_REFERENCE_DISTANCE: 0.2,
};

Object.freeze(config);
Object.freeze(config.SUPPORTED_SPOKE_LAYOUTS);
config.SUPPORTED_SPOKE_LAYOUTS.forEach((layout) => Object.freeze(layout));
Object.freeze(config.DEFAULT_SPOKE_LAYOUT);
Object.freeze(config.SUPPORTED_TOLERANCES);
Object.freeze(config.ESTIMATION_SCORE_TENSIONS);

export const DEFAULT_TENSOMETER = "ParkTool TM-1";
