import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { REMOTE_DATA_ENABLED } from '@/config';
import { poems as bundledPoems } from '@/lib/loadPoems';
import { fetchRemotePoems, readCachedPoems, saveCachedPoems } from '@/lib/remotePoems';
import type { Poem } from '@/lib/types';

/** Where the currently-shown poems came from. */
type Source = 'bundled' | 'cached' | 'remote';

/** Outcome of a refresh: fetched, network failure, or remote sync is off. */
export type RefreshResult = 'ok' | 'failed' | 'disabled';

type PoemsContextValue = {
  poems: Poem[];
  source: Source;
  refreshing: boolean;
  /** True when the last remote fetch failed (offline / unreachable / timed out). */
  error: boolean;
  /** Epoch ms of the last successful remote fetch, if known. */
  updatedAt: number | null;
  /** Re-fetch from the remote host; resolves with the outcome. */
  refresh: () => Promise<RefreshResult>;
};

const PoemsContext = createContext<PoemsContextValue | null>(null);

/**
 * Offline-first poems with remote sync.
 * Precedence: remote (freshest) > cached (last fetch) > bundled (shipped seed).
 */
export function PoemsProvider({ children }: { children: ReactNode }) {
  const [poems, setPoems] = useState<Poem[]>(bundledPoems);
  const [source, setSource] = useState<Source>('bundled');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const refresh = useCallback(async (): Promise<RefreshResult> => {
    if (!REMOTE_DATA_ENABLED) return 'disabled';
    setRefreshing(true);
    setError(false);
    // Try a couple of times — the first hit to r2.dev can be slow/cold.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const remote = await fetchRemotePoems();
        setPoems(remote);
        setSource('remote');
        setUpdatedAt(Date.now());
        void saveCachedPoems(remote);
        setRefreshing(false);
        return 'ok';
      } catch {
        // keep the previous data; fall through to retry / error
      }
    }
    setError(true);
    setRefreshing(false);
    return 'failed';
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      // Show the last cached copy immediately (newer than the bundled seed)...
      const cached = await readCachedPoems();
      if (active && cached && cached.poems.length > 0) {
        setPoems(cached.poems);
        setSource('cached');
        setUpdatedAt(cached.updatedAt || null);
      }
      // ...then try to refresh from the network in the background.
      if (active) await refresh();
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  return (
    <PoemsContext.Provider value={{ poems, source, refreshing, error, updatedAt, refresh }}>
      {children}
    </PoemsContext.Provider>
  );
}

export function usePoems(): PoemsContextValue {
  const ctx = useContext(PoemsContext);
  if (!ctx) throw new Error('usePoems must be used within PoemsProvider');
  return ctx;
}
