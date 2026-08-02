import { EXT_BY_TYPE, TRASH_PREFIX, stamp } from './utils.js';

/** Reject scans larger than this — keeps the app's downloads sane. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(Object.keys(EXT_BY_TYPE));
const ALLOWED_EXTS = new Set(Object.values(EXT_BY_TYPE));

/** Return an error string if any upload isn't an image or is too large. */
export function validateImageFiles(files) {
  for (const f of files) {
    if (f.size > MAX_IMAGE_BYTES) {
      return `“${f.name || 'image'}” is ${(f.size / 1024 / 1024).toFixed(1)} MB — the limit is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`;
    }
    const type = (f.type || '').toLowerCase();
    const ext = f.name && f.name.includes('.') ? f.name.split('.').pop().toLowerCase() : '';
    const ok = type ? ALLOWED_TYPES.has(type) : ALLOWED_EXTS.has(ext);
    if (!ok) return `“${f.name || 'file'}” isn't a supported image (JPEG, PNG, or WebP).`;
  }
  return null;
}

/** Write one scan to R2 under scans/<name>. */
async function putScan(env, name, file) {
  await env.BUCKET.put('scans/' + name, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
  });
}

export function getPoemImages(poem) {
  if (Array.isArray(poem.images) && poem.images.length) return [...poem.images];
  if (poem.image) return [poem.image];
  return [];
}

export function setPoemImages(poem, names) {
  delete poem.image;
  delete poem.images;
  if (names.length === 1) poem.image = names[0];
  else if (names.length > 1) poem.images = names;
}

function fileExt(file) {
  const fromName = file.name && file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : '';
  return EXT_BY_TYPE[file.type] || fromName || 'jpg';
}

function nextSuffix(id, names) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + escaped + '-(\\d+)\\.');
  let max = 0;
  for (const name of names) {
    const m = name.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/** Upload files for a new poem; returns ordered filenames. */
export async function uploadPoemImages(env, id, files) {
  const planned = files.map((f, i) => ({
    file: f,
    name: (files.length > 1 ? id + '-' + (i + 1) : id) + '.' + fileExt(f),
  }));
  await Promise.all(planned.map((p) => putScan(env, p.name, p.file)));
  return planned.map((p) => p.name);
}

/**
 * Resolve imageOrder entries into final filenames.
 * imageOrder: ["existing.jpg", "new:0", ...] — new:N indexes into newFiles.
 */
export async function resolveImageOrder(env, id, imageOrder, newFiles, knownExisting) {
  const known = new Set(knownExisting);
  let next = nextSuffix(id, knownExisting);
  const final = [];
  const uploads = [];

  for (const entry of imageOrder) {
    if (typeof entry === 'string' && !entry.startsWith('new:')) {
      if (!known.has(entry)) return { error: 'Unknown image: ' + entry };
      final.push(entry);
      continue;
    }
    const idx = parseInt(String(entry).replace('new:', ''), 10);
    const f = newFiles[idx];
    if (!f || typeof f.arrayBuffer !== 'function') return { error: 'Missing upload for ' + entry };

    const ext = fileExt(f);
    const name =
      final.length === 0 && imageOrder.length === 1 ? id + '.' + ext : id + '-' + next++ + '.' + ext;
    uploads.push({ name, file: f });
    final.push(name);
  }

  await Promise.all(uploads.map((u) => putScan(env, u.name, u.file)));
  return { names: final };
}

/**
 * Retire scans instead of destroying them.
 *
 * R2 is the only copy of these images — it has no versioning and no undo — so a
 * removed scan is copied under trash/ before the original is deleted. A lifecycle
 * rule on that prefix does the eventual cleanup (see AUTHORING.md), which is the
 * one thing R2 lifecycle rules are genuinely good for.
 *
 * `folder` lets a caller group everything from one operation together; a poem
 * delete passes its own timestamped folder so the scans sit next to poem.json.
 */
export async function trashScanImages(env, names, folder) {
  const dest = folder || TRASH_PREFIX + stamp() + '/';
  await Promise.all(
    names.map(async (name) => {
      const obj = await env.BUCKET.get('scans/' + name);
      if (!obj) return; // already gone — nothing to preserve
      await env.BUCKET.put(dest + name, obj.body, {
        httpMetadata: obj.httpMetadata,
      });
      await env.BUCKET.delete('scans/' + name);
    }),
  );
}
