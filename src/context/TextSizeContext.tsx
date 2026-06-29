import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'settings.textScale';
const MIN = 0.8;
const MAX = 2.0;
const STEP = 0.15;
const DEFAULT = 1;

function clamp(n: number) {
  return Math.min(MAX, Math.max(MIN, Math.round(n * 100) / 100));
}

type TextSizeContextValue = {
  /** Multiplier applied to poem body text only. */
  scale: number;
  increase: () => void;
  decrease: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
};

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      const n = Number(v);
      if (n) setScale(clamp(n));
    });
  }, []);

  const increase = useCallback(() => setScale((s) => {
    const n = clamp(s + STEP);
    void AsyncStorage.setItem(STORAGE_KEY, String(n));
    return n;
  }), []);

  const decrease = useCallback(() => setScale((s) => {
    const n = clamp(s - STEP);
    void AsyncStorage.setItem(STORAGE_KEY, String(n));
    return n;
  }), []);

  return (
    <TextSizeContext.Provider
      value={{
        scale,
        increase,
        decrease,
        canIncrease: scale < MAX - 0.001,
        canDecrease: scale > MIN + 0.001,
      }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize(): TextSizeContextValue {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error('useTextSize must be used within TextSizeProvider');
  return ctx;
}
