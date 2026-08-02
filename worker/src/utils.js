export const POEMS_KEY = 'poems.json';
export const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Where deleted poems and their scans go instead of being destroyed. */
export const TRASH_PREFIX = 'trash/';
/** Where the previous poems.json is kept before each write. */
export const HISTORY_PREFIX = 'history/';

/**
 * A sortable, filename-safe timestamp: 2026-08-01T23-14-07-123Z.
 * Groups everything deleted in one operation under one folder.
 */
export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 60);
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
