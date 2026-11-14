// Cross-checks the spoke database (src/data/spokes.yaml) against the
// tensometer charts (src/data/tensometers/*.yaml). A JSON schema checks one
// file at a time; this checks that the files agree with each other:
//
// 1. every spoke a tensometer lists is in spokes.yaml, as a `spoke` or one of
//    its `alternative_names`, so the app can tell which physical spoke it is;
// 2. no name appears in spokes.yaml twice, so the mapping is unambiguous;
// 3. every alternative name is used by some tensometer, so renaming or
//    removing a tensometer spoke cannot leave stale entries behind.
//    (`spoke` values are exempt: merged entries may use a key that no
//    tensometer has, e.g. "2.0 - 1.8 - 2.0".)
// 4. no tensometer lists two names of the same spoke: then they are in fact
//    different spokes (as Hozan's "2.3" and "2.34 (DT Champion)" are), and
//    the app could not tell which of the two names a spoke has there.
//
// Exits non-zero and lists every problem found.

import fs from "node:fs";
import path from "node:path";
import * as yaml from "js-yaml";
import type { SpokeEntry, TensometerFile } from "../src/types/interfaces.ts";

const DATA = path.join(import.meta.dirname, "..", "src", "data");
const SPOKES_FILE = path.join("src", "data", "spokes.yaml");
const TENSOMETER_DIR = path.join(DATA, "tensometers");

const load = <T>(file: string): T =>
  yaml.load(fs.readFileSync(file, "utf8")) as T;
const spokes = load<SpokeEntry[]>(path.join(DATA, "spokes.yaml"));
const errors: string[] = [];

// Where each name is defined in spokes.yaml, and the spoke it names.
const definedAt = new Map<string, string>();
const spokeOf = new Map<string, string>();
for (const [i, entry] of spokes.entries()) {
  const names = [entry.spoke, ...(entry.alternative_names ?? [])];
  for (const name of names) {
    const where = `entry #${i + 1} ("${entry.spoke}")`;
    if (definedAt.has(name)) {
      errors.push(
        `${SPOKES_FILE}: "${name}" appears in both ${definedAt.get(name)} and ${where}`,
      );
    } else {
      definedAt.set(name, where);
      spokeOf.set(name, entry.spoke);
    }
  }
}

// Every name a tensometer uses, and which tensometers use it.
const usedBy = new Map<string, string[]>();
for (const file of fs.readdirSync(TENSOMETER_DIR).sort()) {
  if (!file.endsWith(".yaml")) continue;
  const tensometer = load<TensometerFile>(path.join(TENSOMETER_DIR, file));
  // This tensometer's name for each spoke it lists
  const nameOf = new Map<string, string>();
  for (const name of Object.keys(tensometer.spokes)) {
    const users = usedBy.get(name) ?? [];
    usedBy.set(name, users);
    users.push(tensometer.name);
    const spoke = spokeOf.get(name);
    if (spoke === undefined) {
      errors.push(
        `${tensometer.name}: "${name}" is not in ${SPOKES_FILE}` +
          " — add it as a new spoke or to alternative_names of an existing one",
      );
      continue;
    }
    if (nameOf.has(spoke)) {
      errors.push(
        `${tensometer.name}: "${nameOf.get(spoke)}" and "${name}" are both` +
          ` "${spoke}" in ${SPOKES_FILE} — make them separate spokes`,
      );
    } else {
      nameOf.set(spoke, name);
    }
  }
}

for (const entry of spokes) {
  for (const name of entry.alternative_names ?? []) {
    if (!usedBy.has(name)) {
      errors.push(
        `${SPOKES_FILE}: alternative name "${name}" of "${entry.spoke}"` +
          " is not used by any tensometer — remove or correct it",
      );
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `OK: ${usedBy.size} tensometer spoke names map to ${SPOKES_FILE} unambiguously`,
);
