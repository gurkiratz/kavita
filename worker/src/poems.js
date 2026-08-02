import { HISTORY_PREFIX, POEMS_KEY, TRASH_PREFIX, slugify, stamp } from './utils.js';
import {
  getPoemImages,
  resolveImageOrder,
  setPoemImages,
  trashScanImages,
  uploadPoemImages,
  validateImageFiles,
} from './images.js';

/** Raw poems.json text from R2 (byte-identical passthrough for GET /poems). */
export async function getPoemsText(env) {
  const cur = await env.BUCKET.get(POEMS_KEY);
  return cur ? await cur.text() : '[]';
}

function parsePoems(text) {
  let poems = [];
  try { poems = JSON.parse(text); } catch { poems = []; }
  return Array.isArray(poems) ? poems : [];
}

/** How many times to re-read and retry before giving up on a contended write. */
const CAS_ATTEMPTS = 4;

/**
 * Read poems.json, apply `mutate`, and write it back only if nobody else wrote
 * in between.
 *
 * R2 has no transactions, but `put(onlyIf: { etagMatches })` returns null instead
 * of storing when the object has moved on — so this is a compare-and-swap loop.
 * Without it, two overlapping saves both read the same array and the second one
 * silently discards the first one's poem.
 *
 * `mutate` runs once per attempt and must therefore be replayable: it receives a
 * freshly-parsed array every time and returns either the array to store, or an
 * `{ error }` to abort with. It must not assume it ran before.
 *
 * The previous body is copied to history/ on the way past, which costs nothing
 * extra — the read that produces the etag is the same read that produces the body.
 */
async function mutatePoems(env, mutate) {
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
    const cur = await env.BUCKET.get(POEMS_KEY);
    const etag = cur ? cur.etag : null;
    const text = cur ? await cur.text() : '[]';
    const poems = parsePoems(text);

    const result = mutate(poems);
    if (result && result.error) return result;

    const body = JSON.stringify(result.poems, null, 2);
    const stored = await env.BUCKET.put(POEMS_KEY, body, {
      httpMetadata: { contentType: 'application/json' },
      // etagDoesNotMatch '*' means "only if this key doesn't exist yet".
      onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: '*' },
    });

    if (stored) {
      if (cur) {
        // Best-effort: a snapshot failing must not fail the save the user asked for.
        await env.BUCKET.put(HISTORY_PREFIX + 'poems-' + stamp() + '.json', text, {
          httpMetadata: { contentType: 'application/json' },
        }).catch(() => {});
      }
      return result;
    }

    // Someone beat us to it. Back off — the per-key write limit is 1/second, so a
    // tight retry would turn a lost race into a 429.
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
  }

  return { error: 'The collection is being saved from somewhere else. Try again.' };
}

function parseTags(raw) {
  const tagsRaw = String(raw || '').trim();
  return tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
}

function parseFields(form) {
  return {
    titleGurmukhi: String(form.get('titleGurmukhi') || '').trim(),
    titleRoman: String(form.get('titleRoman') || '').trim(),
    gurmukhi: String(form.get('gurmukhi') || ''),
    roman: String(form.get('roman') || ''),
    poet: String(form.get('poet') || '').trim(),
    tags: parseTags(form.get('tags')),
  };
}

function applyFields(poem, fields) {
  poem.title = { gurmukhi: fields.titleGurmukhi, roman: fields.titleRoman };
  if (fields.gurmukhi) poem.gurmukhi = fields.gurmukhi;
  else delete poem.gurmukhi;
  if (fields.roman) poem.roman = fields.roman;
  else delete poem.roman;
  if (fields.poet) poem.poet = fields.poet;
  else delete poem.poet;
  if (fields.tags.length) poem.tags = fields.tags;
  else delete poem.tags;
}

function parseImageOrder(form) {
  const raw = String(form.get('imageOrder') || '').trim();
  if (!raw) return [];
  try {
    const order = JSON.parse(raw);
    return Array.isArray(order) ? order : [];
  } catch {
    return null;
  }
}

export async function createPoem(env, form) {
  const fields = parseFields(form);
  if (!fields.titleGurmukhi && !fields.titleRoman) {
    return { error: 'A title (Gurmukhi or Roman) is required.' };
  }

  const files = form.getAll('images').filter((f) => f && typeof f.arrayBuffer === 'function' && f.size > 0);
  const invalid = validateImageFiles(files);
  if (invalid) return { error: invalid };

  // Pick the id from a first read so the scans can be named after it. The CAS
  // loop below re-checks that the id is still free, in case a concurrent create
  // claimed it in between.
  const existing = parsePoems(await getPoemsText(env));
  const base = slugify(fields.titleRoman) || slugify(fields.titleGurmukhi) || 'poem-' + Date.now();
  let id = base;
  let n = 2;
  while (existing.some((p) => p && p.id === id)) id = base + '-' + n++;

  const imageNames = await uploadPoemImages(env, id, files);

  const result = await mutatePoems(env, (poems) => {
    if (poems.some((p) => p && p.id === id)) {
      return { error: 'A poem with the id “' + id + '” was just created. Try saving again.' };
    }
    const poem = { id };
    applyFields(poem, fields);
    setPoemImages(poem, imageNames);
    return { poems: [...poems, poem] };
  });

  // The scans went up before the entry did, so a failed save leaves them
  // unreferenced. Move them out of scans/ rather than leaving litter behind.
  if (result.error) {
    if (imageNames.length) await trashScanImages(env, imageNames);
    return result;
  }

  return { ok: true, id, count: result.poems.length };
}

export async function updatePoem(env, id, form) {
  const fields = parseFields(form);
  if (!fields.titleGurmukhi && !fields.titleRoman) {
    return { error: 'A title (Gurmukhi or Roman) is required.' };
  }

  const imageOrder = parseImageOrder(form);
  if (imageOrder === null) return { error: 'Invalid image order.' };

  const newFiles = form.getAll('images').filter((f) => f && typeof f.arrayBuffer === 'function' && f.size > 0);
  const invalid = validateImageFiles(newFiles);
  if (invalid) return { error: invalid };

  const existing = parsePoems(await getPoemsText(env));
  const current = existing.find((p) => p && p.id === id);
  if (!current) return { error: 'Poem not found.' };
  const previousImages = getPoemImages(current);

  let finalNames;
  if (imageOrder.length === 0 && newFiles.length === 0) {
    finalNames = [];
  } else if (imageOrder.length > 0) {
    const resolved = await resolveImageOrder(env, id, imageOrder, newFiles, previousImages);
    if (resolved.error) return { error: resolved.error };
    finalNames = resolved.names;
  } else {
    finalNames = await uploadPoemImages(env, id, newFiles);
  }

  const result = await mutatePoems(env, (poems) => {
    const idx = poems.findIndex((p) => p && p.id === id);
    if (idx === -1) return { error: 'Poem not found.' };
    // Rebuild from the poem as it is on *this* attempt, not the one read earlier.
    const poem = { ...poems[idx] };
    applyFields(poem, fields);
    setPoemImages(poem, finalNames);
    const next = poems.slice();
    next[idx] = poem;
    return { poems: next };
  });

  if (result.error) return result;

  // Only once the entry is safely stored — otherwise a failed save would have
  // moved away scans the still-live entry points at.
  const removed = previousImages.filter((name) => !finalNames.includes(name));
  if (removed.length) await trashScanImages(env, removed);

  return { ok: true, id, count: result.poems.length };
}

export async function deletePoem(env, id) {
  let images = [];
  let trashed = null;

  const result = await mutatePoems(env, (poems) => {
    const idx = poems.findIndex((p) => p && p.id === id);
    if (idx === -1) return { error: 'Poem not found.' };
    images = getPoemImages(poems[idx]);
    const next = poems.slice();
    const [removed] = next.splice(idx, 1);
    // Keep the entry itself, not just its scans — a title and body are as hard to
    // reconstruct from memory as a photograph.
    trashed = removed;
    return { poems: next };
  });

  if (result.error) return result;

  const folder = TRASH_PREFIX + stamp() + '/';
  await env.BUCKET.put(folder + 'poem.json', JSON.stringify(trashed, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  }).catch(() => {});
  if (images.length) await trashScanImages(env, images, folder);

  return { ok: true, id, count: result.poems.length };
}
