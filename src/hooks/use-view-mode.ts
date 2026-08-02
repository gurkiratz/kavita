import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'settings.viewMode';

/** How the collection is laid out: scan-first grid, or a dense text index. */
export type ViewMode = 'grid' | 'index';

const DEFAULT: ViewMode = 'grid';

function isViewMode(value: string | null): value is ViewMode {
  return value === 'grid' || value === 'index';
}

/**
 * The reader's chosen collection layout, remembered across launches — the same
 * habit as text scale and keep-awake, so the app doesn't reset a preference the
 * reader set on purpose.
 */
export function useViewMode() {
  const [mode, setMode] = useState<ViewMode>(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (isViewMode(stored)) setMode(stored);
    });
  }, []);

  const choose = useCallback((next: ViewMode) => {
    setMode(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  return { mode, setMode: choose };
}
