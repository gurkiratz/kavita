import type { Poem } from './types';

/** Gurmukhi Unicode block. */
const GURMUKHI = /[਀-੿]/;

/** True if the text contains any Gurmukhi characters. */
export function isGurmukhi(text: string): boolean {
  return GURMUKHI.test(text);
}

/** Roman side: lowercase, strip diacritics/combining marks, collapse whitespace. */
function normalizeRoman(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Gurmukhi side: normalize composition (NFC) and collapse whitespace. */
function normalizeGurmukhi(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** The searchable text for a poem in the given script. */
function haystack(poem: Poem, gurmukhi: boolean): string {
  const parts = gurmukhi
    ? [poem.title.gurmukhi, poem.gurmukhi]
    : [poem.title.roman, poem.roman];
  return parts.filter(Boolean).join(' ');
}

/**
 * Strict (but normalized) substring match. The query's script is auto-detected:
 * Gurmukhi input matches Gurmukhi text; Latin input matches the Roman transliteration.
 */
export function matchesQuery(poem: Poem, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (isGurmukhi(q)) {
    return normalizeGurmukhi(haystack(poem, true)).includes(normalizeGurmukhi(q));
  }
  return normalizeRoman(haystack(poem, false)).includes(normalizeRoman(q));
}

/** A poem matches when it carries every active tag (AND). */
export function matchesTags(poem: Poem, activeTags: string[]): boolean {
  return activeTags.every((tag) => poem.tags.includes(tag));
}

/** Filter poems by free-text query AND the set of active tags. */
export function filterPoems(poems: Poem[], query: string, activeTags: string[]): Poem[] {
  return poems.filter((p) => matchesTags(p, activeTags) && matchesQuery(p, query));
}

/** All distinct tags across the collection, sorted. */
export function allTags(poems: Poem[]): string[] {
  const set = new Set<string>();
  poems.forEach((p) => p.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}
