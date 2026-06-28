/**
 * Static require() map for bundled poem scans.
 *
 * React Native cannot require() a dynamic string path, so every scan that
 * should ship with the app must be listed here by filename. This keeps the
 * app fully offline — the images are bundled, never fetched.
 *
 * To add a scan:
 *   1. Drop the image in `assets/scans/` (e.g. dittha-bajan-walia.jpg)
 *   2. Add a line below mapping the filename to its require:
 *        'dittha-bajan-walia.jpg': require('../../assets/scans/dittha-bajan-walia.jpg'),
 *   3. Set that filename as the poem's `image` field in data/poems.json
 */
import { REMOTE_DATA_ENABLED, REMOTE_SCANS_BASE_URL } from '@/config';

const scans: Record<string, number> = {
  "dittha-bajan-walia.jpg": require("../../assets/scans/dittha-bajan-walia.jpg"),
  "bhai-saida-1.jpg": require("../../assets/scans/bhai-saida-1.jpg"),
  "bhai-saida-2.jpg": require("../../assets/scans/bhai-saida-2.jpg"),
  "bhai-saida-3.jpg": require("../../assets/scans/bhai-saida-3.jpg"),
  "bhai-saida-4.jpg": require("../../assets/scans/bhai-saida-4.jpg"),
  "lakh-dide-tarsan.jpg": require("../../assets/scans/lakh-dide-tarsan.jpg"),
  "soolan-te-sogya.jpg": require("../../assets/scans/soolan-te-sogya.jpg"),
};

/** Resolve a poem's `image` filename to a bundled asset, or undefined if not present. */
export function getScan(filename?: string): number | undefined {
  if (!filename) return undefined;
  return scans[filename];
}

/** An image source expo-image understands: a bundled asset (number) or a remote URL. */
export type PoemImageSource = number | { uri: string };

/**
 * Resolve a poem's image reference to a displayable source.
 * Prefers a bundled scan (instant, offline); falls back to the remote host for
 * images added after this build; passes through full http(s) URLs as-is.
 */
export function resolvePoemImage(ref?: string): PoemImageSource | undefined {
  if (!ref) return undefined;
  if (/^https?:\/\//i.test(ref)) return { uri: ref };
  const bundled = scans[ref];
  if (bundled != null) return bundled;
  if (REMOTE_DATA_ENABLED && REMOTE_SCANS_BASE_URL) {
    return { uri: `${REMOTE_SCANS_BASE_URL}/${ref}` };
  }
  return undefined;
}
