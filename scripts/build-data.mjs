// Compile local authoring sources into a single remote artifact: remote/poems.json
//
// It reads src/data/poems.json (metadata) and inlines any long bodies kept in
// src/data/text/<id>.gurmukhi.ts / <id>.roman.ts, producing one JSON file with
// all text inline — ready to upload to your public host.
//
// Usage:  npm run build:data
// Then:   commit & push remote/poems.json (and any new images in assets/scans).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const poems = JSON.parse(readFileSync(join(root, 'src/data/poems.json'), 'utf8'));

/** Pull the template-literal body out of src/data/text/<id>.<script>.ts, if present. */
function readBody(id, script) {
  const file = join(root, 'src', 'data', 'text', `${id}.${script}.ts`);
  if (!existsSync(file)) return undefined;
  const raw = readFileSync(file, 'utf8');
  const first = raw.indexOf('`');
  const last = raw.lastIndexOf('`');
  if (first === -1 || last <= first) return undefined;
  return raw.slice(first + 1, last);
}

const merged = poems.map((p) => ({
  ...p,
  gurmukhi: p.gurmukhi ?? readBody(p.id, 'gurmukhi'),
  roman: p.roman ?? readBody(p.id, 'roman'),
}));

const outDir = join(root, 'remote');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'poems.json'), JSON.stringify(merged, null, 2) + '\n', 'utf8');

console.log(`✓ Wrote remote/poems.json (${merged.length} poems)`);
console.log('  Next: `npm run publish:r2` to upload it (and scans) to Cloudflare R2.');
