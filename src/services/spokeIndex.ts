import type { SpokeEntry } from "../types/interfaces";

/**
 * Map every name in the spoke list (each entry's key and its alternative
 * names) to the entry's key, i.e. to the physical spoke the name denotes.
 * Names are unique across the list (scripts/check-spokes.ts checks it), so a
 * name identifies a spoke without knowing which tensometer uses it.
 */
export function buildSpokeIndex(entries: SpokeEntry[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const entry of entries) {
    index.set(entry.spoke, entry.spoke);
    for (const name of entry.alternative_names ?? []) {
      index.set(name, entry.spoke);
    }
  }
  return index;
}
