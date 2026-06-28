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
