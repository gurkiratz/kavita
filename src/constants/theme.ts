/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1A12',
    background: '#FBF9F4',
    backgroundElement: '#F1ECE1',
    backgroundSelected: '#E7DFCE',
    textSecondary: '#6B6250',
    accent: '#9C5B2E',
    border: '#E3DCCB',
  },
  dark: {
    text: '#F2ECDE',
    background: '#15130F',
    backgroundElement: '#211E18',
    backgroundSelected: '#2C281F',
    textSecondary: '#A89F8C',
    accent: '#D9A441',
    border: '#2C281F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Unicode Gurmukhi typeface (OpenSatlujUni, bundled in assets/fonts and
 * registered in the root layout). Use these for Punjabi/Gurmukhi text so it
 * renders in the chosen face rather than the OS fallback.
 */
export const Gurmukhi = {
  regular: 'OpenSatlujUni',
  bold: 'OpenSatlujUni-Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
/** Caps the reading column on wide screens so the web layout stays close to mobile. */
export const ContentMaxWidth = 640;
