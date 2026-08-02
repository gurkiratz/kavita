import { type ErrorBoundaryProps } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Last line of defence for a render that throws.
 *
 * Without this, one malformed poem — a missing title, an unexpected shape from a
 * hand-edited poems.json — blanks the whole app with no way back. Deliberately
 * self-contained: it must not depend on any of the app's providers, because it has
 * to render even when the failure happened underneath them.
 */
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.outer, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>Something went wrong</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          The app hit an error it couldn’t recover from on its own. Your saved poems are
          untouched.
        </Text>

        <Pressable
          onPress={retry}
          accessibilityRole="button"
          style={[styles.button, { backgroundColor: c.accent }]}>
          <Text style={[styles.buttonText, { color: c.background }]}>Try again</Text>
        </Pressable>

        <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Details</Text>
        <Text style={[styles.detail, { color: c.textSecondary, borderColor: c.border }]}>
          {error?.message || String(error)}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: 999,
  },
  buttonText: { fontSize: 15, fontWeight: '700' },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.three,
  },
  detail: {
    fontSize: 13,
    fontFamily: 'monospace',
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
