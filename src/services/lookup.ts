import type { TensionLookupTable } from "../types/interfaces";

// Pure functions over tensometer lookup tables (reading -> kgf). They import
// nothing at runtime, so scripts run by Node can use them as well.

/**
 * Interpolate or extrapolate a value from the lookup table.
 * Uses linear interpolation between table entries, and linear extrapolation
 * from the two outermost entries beyond the table's range.
 * @param values Lookup table mapping reading -> tension
 * @param index The reading to look up
 */
export function interpolate(values: TensionLookupTable, index: number): number {
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

/**
 * The table read backwards: tension (kgf) -> reading. Tension changes
 * monotonically with the reading (it grows on most tensometers, falls on
 * some), so the inverted table interpolates the same way.
 */
export function invert(values: TensionLookupTable): TensionLookupTable {
  return Object.fromEntries(
    Object.entries(values).map(([reading, kgf]) => [kgf, Number(reading)]),
  );
}

/**
 * Number of decimals the table's readings are given with. A computed reading
 * finer than the table's own looks more exact than it is.
 */
export function readingDecimals(values: TensionLookupTable): number {
  return Math.max(
    ...Object.keys(values).map((key) => key.split(".")[1]?.length ?? 0),
  );
}
