import { Config, SpokeLayout } from "../types/interfaces";

/** Equal number of spokes on both sides, `total` in all. */
const evenlyLaced = (total: number): SpokeLayout => ({
  ds: total / 2,
  nds: total / 2,
});

export const config: Config = {
  INITIAL_READING_DRIVE_SIDE: 20,
  INITIAL_READING_NON_DRIVE_SIDE: 18,
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
};

Object.freeze(config);
Object.freeze(config.SUPPORTED_SPOKE_LAYOUTS);
config.SUPPORTED_SPOKE_LAYOUTS.forEach((layout) => Object.freeze(layout));
Object.freeze(config.DEFAULT_SPOKE_LAYOUT);
Object.freeze(config.SUPPORTED_TOLERANCES);

export const DEFAULT_TENSOMETER = "ParkTool TM-1";
