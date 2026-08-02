// Post-process the Expo web export for Cloudflare Pages.
//
// Run after `expo export --platform web` (see the `build:web` script).
// Two fixups, both because Expo's filenames and Pages' conventions disagree:
//
//   dist/poem/[id].html  → dist/poem-shell.html   the dynamic-route shell, under a
//                                                 name `_redirects` can point at
//   dist/+not-found.html → dist/404.html          Pages serves 404.html on a miss
//
// Neither Expo file is deleted; the copies are additive.

import { copyFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';

const COPIES = [
  { from: join(DIST, 'poem', '[id].html'), to: join(DIST, 'poem-shell.html') },
  { from: join(DIST, '+not-found.html'), to: join(DIST, '404.html') },
];

let failed = false;

for (const { from, to } of COPIES) {
  try {
    await access(from);
  } catch {
    // A missing source means the export shape changed — loud, not silent, because
    // the deploy would otherwise 404 on every poem URL.
    console.error(`prepare-web: expected ${from} to exist after the export.`);
    failed = true;
    continue;
  }
  await copyFile(from, to);
  console.log(`prepare-web: ${from} → ${to}`);
}

for (const f of ['_redirects', '_headers']) {
  try {
    await access(join(DIST, f));
  } catch {
    console.error(
      `prepare-web: ${f} is missing from ${DIST}/ — it should have been copied from public/.`,
    );
    failed = true;
  }
}

if (failed) process.exit(1);
