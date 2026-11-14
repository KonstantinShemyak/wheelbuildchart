import { Side, SpokeLayout } from "../types/interfaces";

/**
 * Where the spokes of each side are on the rim. Spoke 1 is on the drive side,
 * and the sides repeat in groups: as many drive side spokes as there are per
 * non-drive side spoke, then one non-drive side spoke. So D N D N... for
 * usual wheels, D D N D D N... for 2:1 lacing.
 */

export const SIDES: readonly Side[] = ["ds", "nds"];

/** One value per side, computed by `value`. */
export function bySide<T>(value: (side: Side) => T): Record<Side, T> {
  return { ds: value("ds"), nds: value("nds") };
}

export function totalSpokes(layout: SpokeLayout): number {
  return layout.ds + layout.nds;
}

/**
 * How the layout is named for the user: the total number of spokes when both
 * sides have the same, otherwise the number on each side, like "16:8".
 */
export function layoutLabel(layout: SpokeLayout): string {
  return layout.ds === layout.nds
    ? String(totalSpokes(layout))
    : `${layout.ds}:${layout.nds}`;
}

/**
 * @param index 0-based spoke index
 */
export function sideOf(layout: SpokeLayout, index: number): Side {
  const dsPerNds = layout.ds / layout.nds;
  return index % (dsPerNds + 1) < dsPerNds ? "ds" : "nds";
}

/**
 * The side of every spoke, by 0-based index.
 */
export function sides(layout: SpokeLayout): Side[] {
  return Array.from({ length: totalSpokes(layout) }, (_, i) =>
    sideOf(layout, i),
  );
}

/**
 * The 0-based index of the next spoke on the same side, after the last
 * spoke going round to the first.
 */
export function nextSameSide(layout: SpokeLayout, index: number): number {
  const n = totalSpokes(layout);
  const side = sideOf(layout, index);
  for (let step = 1; step < n; step++) {
    const next = (index + step) % n;
    if (sideOf(layout, next) === side) return next;
  }
  return index;
}
