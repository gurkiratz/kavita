/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // scheme can be 'light' | 'dark' | null | undefined — default to light.
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
