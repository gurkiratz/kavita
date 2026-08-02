import { StyleSheet, View, type ViewProps } from 'react-native';

import { ContentMaxWidth } from '@/constants/theme';

/**
 * Full-bleed page container.
 *
 * It deliberately does **not** cap its own width. Capping here would make the
 * scroll container itself 640px wide, and a scroller's scrollbar sits at the edge
 * of the scroller — so on a wide screen the bar would float in the middle of the
 * window instead of against its right edge.
 *
 * Cap the content instead: spread `contentColumn` into the `contentContainerStyle`
 * of whatever scrolls inside. Same shape `AppHeader` uses for its inner row.
 */
export function ContentShell({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.outer, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
  },
  /**
   * The reading column: full width up to the cap, then centred.
   *
   * `alignSelf` alone doesn't centre a scroll view's content container — the
   * column ends up flush left. The auto margins are what actually centre it;
   * `alignSelf` stays for the non-scrolling cases.
   */
  contentColumn: {
    width: '100%',
    maxWidth: ContentMaxWidth,
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
});

export const contentColumn = styles.contentColumn;
