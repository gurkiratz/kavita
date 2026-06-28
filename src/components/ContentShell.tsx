import { StyleSheet, View, type ViewProps } from 'react-native';

import { ContentMaxWidth } from '@/constants/theme';

/** Centers page content in a capped column on wide screens. */
export function ContentShell({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.outer, style]} {...rest}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: ContentMaxWidth,
  },
});
