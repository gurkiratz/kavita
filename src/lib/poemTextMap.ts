/**
 * Long poem bodies live in `src/data/text/<id>.gurmukhi.ts` (or `.roman.ts`).
 * Paste with real line breaks inside the backticks — no \\n escaping.
 *
 * To add a body:
 *   1. Create `src/data/text/my-poem.gurmukhi.ts` with `export default \`...\`;`
 *   2. Register the poem id below
 *   3. Omit `gurmukhi` from poems.json (or leave it for short inline text)
 */
import bhaiSaidaGurmukhi from '@/data/text/bhai-saida.gurmukhi';

const gurmukhiById: Record<string, string> = {
  'bhai-saida': bhaiSaidaGurmukhi,
};

const romanById: Record<string, string> = {};

export function resolveGurmukhi(id: string, inline?: string): string | undefined {
  return inline || gurmukhiById[id];
}

export function resolveRoman(id: string, inline?: string): string | undefined {
  return inline || romanById[id];
}
