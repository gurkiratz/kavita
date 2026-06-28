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

type PoemsContextValue = {
  poems: Poem[];
  source: Source;
  refreshing: boolean;
  /** Epoch ms of the last successful remote fetch, if known. */
  updatedAt: number | null;
  /** Re-fetch from the remote host (no-op when remote is disabled). */
  refresh: () => void;
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
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!REMOTE_DATA_ENABLED) return;
    setRefreshing(true);
    try {
      const remote = await fetchRemotePoems();
      setPoems(remote);
      setSource('remote');
      setUpdatedAt(Date.now());
      void saveCachedPoems(remote);
    } catch {
      // Offline or fetch failed — keep whatever we already have (cached/bundled).
    } finally {
      setRefreshing(false);
    }
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
    <PoemsContext.Provider value={{ poems, source, refreshing, updatedAt, refresh }}>
      {children}
    </PoemsContext.Provider>
  );
}

export function usePoems(): PoemsContextValue {
  const ctx = useContext(PoemsContext);
  if (!ctx) throw new Error('usePoems must be used within PoemsProvider');
  return ctx;
}
