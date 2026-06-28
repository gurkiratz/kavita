import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

const STORAGE_KEY = 'settings.keepScreenOn';
const KEEP_AWAKE_TAG = 'kavita';

type KeepAwakeContextValue = {
  keepScreenOn: boolean;
  setKeepScreenOn: (value: boolean) => void;
};

const KeepAwakeContext = createContext<KeepAwakeContextValue | null>(null);

export function KeepAwakeProvider({ children }: { children: ReactNode }) {
  const [keepScreenOn, setKeepScreenOnState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored !== null) {
        setKeepScreenOnState(stored === 'true');
      }
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (keepScreenOn) {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    } else {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    }

    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [keepScreenOn]);

  const setKeepScreenOn = useCallback((value: boolean) => {
    setKeepScreenOnState(value);
    void AsyncStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  return (
    <KeepAwakeContext.Provider value={{ keepScreenOn, setKeepScreenOn }}>
      {children}
    </KeepAwakeContext.Provider>
  );
}

export function useKeepScreenOn(): KeepAwakeContextValue {
  const ctx = useContext(KeepAwakeContext);
  if (!ctx) {
    throw new Error('useKeepScreenOn must be used within KeepAwakeProvider');
  }
  return ctx;
}
