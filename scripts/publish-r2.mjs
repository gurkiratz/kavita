// Publish poems + scans to a Cloudflare R2 bucket.
//
// Regenerates remote/poems.json, then uploads it and every scan in assets/scans/
// to the bucket via Wrangler. Run after authoring new poems:
//
//   npm run publish:r2
//
// Prereqs (one-time): see "Publishing updates online" in AUTHORING.md
//   - `npx wrangler login`
//   - bucket created, public dev URL enabled, CORS applied
//
// The bucket name defaults to "kavita"; override with R2_BUCKET=<name>.

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const BUCKET = process.env.R2_BUCKET || 'kavita';
const SCANS_DIR = 'assets/scans';

const CONTENT_TYPES = {
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function put(key, file, contentType) {
  console.log(`↑ ${key}`);
  // --remote targets the real bucket (not the local dev simulation).
  execFileSync(
    'npx',
    [
      '--yes',
      'wrangler',
      'r2',
      'object',
      'put',
      `${BUCKET}/${key}`,
      `--file=${file}`,
      `--content-type=${contentType}`,
      '--remote',
    ],
    { stdio: 'inherit' },
  );
}

// 1. Regenerate the data artifact (inlines long text bodies).
execFileSync('node', ['scripts/build-data.mjs'], { stdio: 'inherit' });

// 2. Upload the poems index.
put('poems.json', 'remote/poems.json', 'application/json');

// 3. Upload every scan (skips README and unknown types).
for (const name of readdirSync(SCANS_DIR)) {
  const type = CONTENT_TYPES[extname(name).toLowerCase()];
  if (!type) continue;
  put(`scans/${name}`, join(SCANS_DIR, name), type);
}

console.log(`\n✓ Published to R2 bucket "${BUCKET}".`);
