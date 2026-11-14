import type { SpokeGeometry } from "../types/interfaces";

// Pure functions over spoke keys of src/data/spokes.yaml. They import
// nothing at runtime, so scripts run by Node can use them as well.

const NUMBER = "\\d+(?:\\.\\d+)?";
const MIDDLE = `${NUMBER}(?:\\*${NUMBER})?`;
// "head - middle - thread" or "middle", optionally followed by " (name)";
// the same format src/data/spokes.schema.json enforces.
const DIMENSIONS = new RegExp(
  `^(?:(${NUMBER}) - (${MIDDLE}) - (${NUMBER})|(${MIDDLE}))(?: \\([^()]+\\))?$`,
);

/**
 * Dimensions of a spoke from its key in spokes.yaml, e.g.
 * "2.0 - 2.2*0.9 - 2.0 (CX Ray)" or "1.8".
 * @returns null for a spoke of unknown dimensions, e.g. "CX"
 */
export function parseSpoke(key: string): SpokeGeometry | null {
  const match = DIMENSIONS.exec(key);
  if (!match) return null;
  const [, head, butted, thread, straight] = match;
  const middle = (butted ?? straight).split("*").map(Number);
  return {
    middle: middle.length === 2 ? [middle[0], middle[1]] : middle[0],
    ends: head === undefined ? null : [Number(head), Number(thread)],
  };
}

/** Whether the middle section is a blade rather than round. */
export function isBladed(
  geometry: SpokeGeometry,
): geometry is SpokeGeometry & { middle: [number, number] } {
  return Array.isArray(geometry.middle);
}

/**
 * How much the middle sections differ, in mm: the difference of diameters,
 * or the sum of the differences of blade width and thickness. Infinity
 * between a round and a bladed spoke: they are never compared.
 */
export function middleDistance(a: SpokeGeometry, b: SpokeGeometry): number {
  if (isBladed(a) && isBladed(b)) {
    return (
      Math.abs(a.middle[0] - b.middle[0]) + Math.abs(a.middle[1] - b.middle[1])
    );
  }
  if (!isBladed(a) && !isBladed(b)) {
    return Math.abs((a.middle as number) - (b.middle as number));
  }
  return Infinity;
}

/**
 * How much the ends differ, in mm (head plus thread). 0 when either spoke's
 * ends are not given: then nothing tells them apart.
 */
export function endsDistance(a: SpokeGeometry, b: SpokeGeometry): number {
  if (a.ends === null || b.ends === null) return 0;
  return Math.abs(a.ends[0] - b.ends[0]) + Math.abs(a.ends[1] - b.ends[1]);
}
