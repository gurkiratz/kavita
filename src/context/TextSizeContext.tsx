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
export const TEXT_SCALE_MIN = 0.8;
export const TEXT_SCALE_MAX = 2.0;
const STEP = 0.15;
const DEFAULT = 1;

/**
 * Clamp and round a scale. Marked as a worklet so the pinch gesture can bound the
 * live value on the UI thread without hopping to JS on every frame.
 */
export function clampScale(n: number) {
  'worklet';
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, Math.round(n * 100) / 100));
}

const clamp = clampScale;

type TextSizeContextValue = {
  /** Multiplier applied to poem body text only. */
  scale: number;
  increase: () => void;
  decrease: () => void;
  /** Set the scale outright — used by pinch-to-zoom, which isn't stepped. */
  setScale: (n: number) => void;
  canIncrease: boolean;
  canDecrease: boolean;
};

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState(DEFAULT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      const n = Number(v);
      if (n) setScaleState(clamp(n));
    });
  }, []);

  const increase = useCallback(() => setScaleState((s) => {
    const n = clamp(s + STEP);
    void AsyncStorage.setItem(STORAGE_KEY, String(n));
    return n;
  }), []);

  const decrease = useCallback(() => setScaleState((s) => {
    const n = clamp(s - STEP);
    void AsyncStorage.setItem(STORAGE_KEY, String(n));
    return n;
  }), []);

  const setScale = useCallback((next: number) => {
    const n = clamp(next);
    setScaleState(n);
    void AsyncStorage.setItem(STORAGE_KEY, String(n));
  }, []);

  return (
    <TextSizeContext.Provider
      value={{
        scale,
        increase,
        decrease,
        setScale,
        canIncrease: scale < TEXT_SCALE_MAX - 0.001,
        canDecrease: scale > TEXT_SCALE_MIN + 0.001,
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
