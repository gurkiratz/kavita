import { POEMS_KEY, slugify } from './utils.js';
import {
  deleteScanImages,
  getPoemImages,
  resolveImageOrder,
  setPoemImages,
  uploadPoemImages,
  validateImageFiles,
} from './images.js';

/** Raw poems.json text from R2 (byte-identical passthrough for GET /poems). */
export async function getPoemsText(env) {
  const cur = await env.BUCKET.get(POEMS_KEY);
  return cur ? await cur.text() : '[]';
}

async function loadPoemsArray(env) {
  const cur = await env.BUCKET.get(POEMS_KEY);
  let poems = [];
  if (cur) {
    try { poems = await cur.json(); } catch { poems = []; }
    if (!Array.isArray(poems)) poems = [];
  }
  return poems;
}

async function savePoems(env, poems) {
  await env.BUCKET.put(POEMS_KEY, JSON.stringify(poems, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });
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

  const poems = await loadPoemsArray(env);

  const base = slugify(fields.titleRoman) || slugify(fields.titleGurmukhi) || 'poem-' + Date.now();
  let id = base;
  let n = 2;
  while (poems.some((p) => p && p.id === id)) id = base + '-' + n++;

  const imageNames = await uploadPoemImages(env, id, files);

  const poem = { id };
  applyFields(poem, fields);
  setPoemImages(poem, imageNames);

  poems.push(poem);
  await savePoems(env, poems);

  return { ok: true, id, count: poems.length };
}

export async function updatePoem(env, id, form) {
  const fields = parseFields(form);
  if (!fields.titleGurmukhi && !fields.titleRoman) {
    return { error: 'A title (Gurmukhi or Roman) is required.' };
  }

  const poems = await loadPoemsArray(env);
  const idx = poems.findIndex((p) => p && p.id === id);
  if (idx === -1) return { error: 'Poem not found.' };

  const poem = poems[idx];
  const previousImages = getPoemImages(poem);
  const imageOrder = parseImageOrder(form);
  if (imageOrder === null) return { error: 'Invalid image order.' };

  const newFiles = form.getAll('images').filter((f) => f && typeof f.arrayBuffer === 'function' && f.size > 0);
  const invalid = validateImageFiles(newFiles);
  if (invalid) return { error: invalid };

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

  const removed = previousImages.filter((name) => !finalNames.includes(name));
  if (removed.length) await deleteScanImages(env, removed);

  applyFields(poem, fields);
  setPoemImages(poem, finalNames);

  poems[idx] = poem;
  await savePoems(env, poems);

  return { ok: true, id, count: poems.length };
}

export async function deletePoem(env, id) {
  const poems = await loadPoemsArray(env);
  const idx = poems.findIndex((p) => p && p.id === id);
  if (idx === -1) return { error: 'Poem not found.' };

  const images = getPoemImages(poems[idx]);
  if (images.length) await deleteScanImages(env, images);

  poems.splice(idx, 1);
  await savePoems(env, poems);

  return { ok: true, id, count: poems.length };
}
