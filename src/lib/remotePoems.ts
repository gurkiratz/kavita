import AsyncStorage from '@react-native-async-storage/async-storage';

import { REMOTE_POEMS_URL } from '@/config';
import type { Poem } from './types';

const CACHE_KEY = 'cache.poems.v1';
const CACHE_TS_KEY = 'cache.poems.updatedAt.v1';

/** Minimal shape check so a malformed payload can't corrupt the UI. */
function isPoemArray(data: unknown): data is Poem[] {
  return (
    Array.isArray(data) &&
    data.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        typeof (p as Poem).id === 'string' &&
        typeof (p as Poem).title?.gurmukhi === 'string',
    )
  );
}

/** The last successfully-fetched poems saved on the device, if any. */
export async function readCachedPoems(): Promise<{ poems: Poem[]; updatedAt: number } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const poems = JSON.parse(raw);
    if (!isPoemArray(poems)) return null;
    const updatedAt = Number((await AsyncStorage.getItem(CACHE_TS_KEY)) ?? 0);
    return { poems, updatedAt };
  } catch {
    return null;
  }
}

/** Fetch the latest poems from the remote host (cache-busted, with a timeout). */
export async function fetchRemotePoems(timeoutMs = 12000): Promise<Poem[]> {
  // Cache-bust via the query string only — no custom headers, so the request
  // stays "simple" and avoids a CORS preflight that static hosts often reject.
  const sep = REMOTE_POEMS_URL.includes('?') ? '&' : '?';
  const url = `${REMOTE_POEMS_URL}${sep}t=${Date.now()}`;

  // A timeout so a stalled connection can't hang the loader forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Remote poems HTTP ${res.status}`);
    const data = await res.json();
    if (!isPoemArray(data)) throw new Error('Remote poems payload is not valid');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Persist the freshest poems so the app has them offline next launch. */
export async function saveCachedPoems(poems: Poem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(poems));
    await AsyncStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {
    // Cache write failures are non-fatal — the app still works from memory.
  }
}
