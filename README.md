# Wheelbuildchart

Visualization of spoke tension in a bicycle wheel. Useful for building and
truing wheels.
Supports number of tensometers. Handles more spokes than tensometer vendors list
([how?](https://konstantin.shemyak.com/wheelbuildchart/not-listed-spoke.html)).

See [the demo](https://konstantin.shemyak.com/wheelbuildchart).

## Development

- Format whitespace with `npm run format`.
- If applicable, update UI snapshots with `npm run test:update-snapshots`
  (needs Docker installed).
- After adding or changing tensometer data, run `npm run check-spokes` (every
  spoke must be in `src/data/spokes.yaml`) and
  `npm run estimation-report -- --holdout` (how accurately spokes a
  tensometer does not list are estimated from other tensometers). See
  `scripts/estimation-report.ts` for what the report shows and its options.
- **Rebase** your PR on top of the main branch; merge commits in the PRs are not allowed.
- Use semantic commit messages (like `chore(ci): require semantic commit messages`).
