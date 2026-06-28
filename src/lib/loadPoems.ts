import poemsData from '@/data/poems.json';
import { resolveGurmukhi, resolveRoman } from '@/lib/poemTextMap';
import type { Poem } from '@/lib/types';

/** Poems from JSON with optional long bodies merged from text files. */
export const poems: Poem[] = (poemsData as Poem[]).map((poem) => ({
  ...poem,
  gurmukhi: resolveGurmukhi(poem.id, poem.gurmukhi),
  roman: resolveRoman(poem.id, poem.roman),
}));
