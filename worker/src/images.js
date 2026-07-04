import { EXT_BY_TYPE } from './utils.js';

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
  const names = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = fileExt(f);
    const name = files.length > 1 ? id + '-' + (i + 1) + '.' + ext : id + '.' + ext;
    await env.BUCKET.put('scans/' + name, await f.arrayBuffer(), {
      httpMetadata: { contentType: f.type || 'image/jpeg' },
    });
    names.push(name);
  }
  return names;
}

/**
 * Resolve imageOrder entries into final filenames.
 * imageOrder: ["existing.jpg", "new:0", ...] — new:N indexes into newFiles.
 */
export async function resolveImageOrder(env, id, imageOrder, newFiles, knownExisting) {
  const known = new Set(knownExisting);
  const allNames = [...knownExisting];
  let next = nextSuffix(id, allNames);
  const final = [];

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
    let name;
    if (final.length === 0 && imageOrder.length === 1) {
      name = id + '.' + ext;
    } else {
      name = id + '-' + next + '.' + ext;
      next++;
    }
    await env.BUCKET.put('scans/' + name, await f.arrayBuffer(), {
      httpMetadata: { contentType: f.type || 'image/jpeg' },
    });
    final.push(name);
    allNames.push(name);
  }

  return { names: final };
}

export async function deleteScanImages(env, names) {
  for (const name of names) {
    await env.BUCKET.delete('scans/' + name);
  }
}
