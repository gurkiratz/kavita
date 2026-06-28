/**
 * Remote content sync (optional).
 *
 * Leave these empty to run purely from the bundled data (offline-only).
 * Set them to your public Cloudflare R2 URL to enable
 * "fetch latest when online, cache offline".
 *
 * After running the R2 setup (see AUTHORING.md), paste your bucket's public URL:
 *   REMOTE_POEMS_URL      = 'https://pub-<hash>.r2.dev/poems.json'
 *   REMOTE_SCANS_BASE_URL = 'https://pub-<hash>.r2.dev/scans'
 * (or your custom domain, e.g. 'https://cdn.example.com/poems.json')
 *
 * Publish workflow (no app rebuild):
 *   1. Author locally (poems.json + text files + images), as usual.
 *   2. `npm run publish:r2`  → regenerates remote/poems.json and uploads it
 *      plus all scans to R2. The app picks it up next launch / on pull-to-refresh.
 */
export const REMOTE_POEMS_URL = 'https://pub-4730074c0ff04638961b0cf1c2d55537.r2.dev/poems.json';
export const REMOTE_SCANS_BASE_URL = 'https://pub-4730074c0ff04638961b0cf1c2d55537.r2.dev/scans';

/** True when a remote source is configured. */
export const REMOTE_DATA_ENABLED = REMOTE_POEMS_URL.length > 0;
