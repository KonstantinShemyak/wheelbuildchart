import { Config } from "../types/interfaces";

export const config: Config = {
  INITIAL_READING_DRIVE_SIDE: 20,
  INITIAL_READING_NON_DRIVE_SIDE: 18,
  SUPPORTED_SPOKE_COUNTS: [16, 18, 20, 24, 28, 32, 36, 40] as const,
  DEFAULT_SPOKES: 32,
  DEFAULT_SPOKE_THICKNESS: 2,
  SUPPORTED_TOLERANCES: [5, 7.5, 10, 15, 20] as const,
  DEFAULT_TOLERANCE: 20,
  ERROR_STRING_INVALID_INPUT:
    ": invalid input (a number like '23' or '23.2' expected)",
};

Object.freeze(config);
Object.freeze(config.SUPPORTED_SPOKE_COUNTS);
Object.freeze(config.SUPPORTED_TOLERANCES);

export const DEFAULT_TENSOMETER = "ParkTool TM-1";
