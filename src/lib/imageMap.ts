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
};

/** Resolve a poem's `image` filename to a bundled asset, or undefined if not present. */
export function getScan(filename?: string): number | undefined {
  if (!filename) return undefined;
  return scans[filename];
}
