import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell } from '@/components/ContentShell';
import { PoemImages } from '@/components/PoemImages';
import { Fonts, Spacing } from '@/constants/theme';
import { usePoems } from '@/context/PoemsContext';
import { useTextSize } from '@/context/TextSizeContext';
import { useTheme } from '@/hooks/use-theme';
import { resolvePoemImage, type PoemImageSource } from '@/lib/imageMap';

type Script = 'gurmukhi' | 'roman';

export default function PoemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { poems } = usePoems();
  const { scale, increase, decrease, canIncrease, canDecrease } = useTextSize();

  const poem = poems.find((p) => p.id === id);
  const [script, setScript] = useState<Script>('gurmukhi');

  if (!poem) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Text style={{ color: c.textSecondary }}>Poem not found.</Text>
      </View>
    );
  }

  const imageFiles = poem.images ?? (poem.image ? [poem.image] : []);
  const scans = imageFiles
    .map(resolvePoemImage)
    .filter((s): s is PoemImageSource => s != null);
  const hasGurmukhi = !!poem.gurmukhi;
  const hasRoman = !!poem.roman;
  const both = hasGurmukhi && hasRoman;
  const shown = script === 'gurmukhi' ? poem.gurmukhi : poem.roman;
  // If only one script exists, always show that one regardless of the toggle.
  const body = both ? shown : poem.gurmukhi || poem.roman;
  const bodyIsGurmukhi = both ? script === 'gurmukhi' : hasGurmukhi;

  return (
    <ContentShell style={{ backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.six }]}>
      <Stack.Screen options={{ title: poem.title.gurmukhi }} />

      {scans.length > 0 && <PoemImages sources={scans} alt={poem.title.roman} />}

      <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>
        {poem.title.gurmukhi}
      </Text>
      <Text style={[styles.titleRoman, { color: c.textSecondary }]}>{poem.title.roman}</Text>
      {!!poem.poet && (
        <Text style={[styles.poet, { color: c.accent }]}>{poem.poet}</Text>
      )}

      {(both || !!body) && (
        <View style={styles.controls}>
          {both ? (
            <View style={[styles.toggle, { borderColor: c.border }]}>
              {(['gurmukhi', 'roman'] as const).map((s) => {
                const selected = script === s;
                return (
                  <Text
                    key={s}
                    onPress={() => setScript(s)}
                    style={[
                      styles.toggleItem,
                      {
                        backgroundColor: selected ? c.accent : 'transparent',
                        color: selected ? c.background : c.textSecondary,
                      },
                    ]}>
                    {s === 'gurmukhi' ? 'ਪੰਜਾਬੀ' : 'Roman'}
                  </Text>
                );
              })}
            </View>
          ) : (
            <View />
          )}

          {!!body && (
            <View style={styles.sizeRow}>
              <Pressable
                onPress={decrease}
                disabled={!canDecrease}
                accessibilityLabel="Decrease text size"
                style={[styles.sizeBtn, { borderColor: c.border, opacity: canDecrease ? 1 : 0.4 }]}>
                <Text style={[styles.sizeBtnSmall, { color: c.text }]}>A−</Text>
              </Pressable>
              <Pressable
                onPress={increase}
                disabled={!canIncrease}
                accessibilityLabel="Increase text size"
                style={[styles.sizeBtn, { borderColor: c.border, opacity: canIncrease ? 1 : 0.4 }]}>
                <Text style={[styles.sizeBtnLarge, { color: c.text }]}>A+</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {body ? (
        <Text
          style={[
            { color: c.text },
            bodyIsGurmukhi
              ? { fontFamily: Fonts.serif, fontSize: 20 * scale, lineHeight: 34 * scale }
              : { fontSize: 17 * scale, lineHeight: 28 * scale },
          ]}>
          {body}
        </Text>
      ) : (
        <Text style={[styles.empty, { color: c.textSecondary }]}>
          No transcription yet.
        </Text>
      )}

      {!!poem.source && (
        <Text style={[styles.source, { color: c.textSecondary, borderTopColor: c.border }]}>
          {poem.source}
        </Text>
      )}
      </ScrollView>
    </ContentShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 24,
    lineHeight: 34,
  },
  titleRoman: {
    fontSize: 15,
    marginTop: -Spacing.two,
  },
  poet: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    overflow: 'hidden',
  },
  toggleItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sizeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginLeft: 'auto',
  },
  sizeBtn: {
    width: 42,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeBtnSmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  sizeBtnLarge: {
    fontSize: 18,
    fontWeight: '700',
  },
  empty: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  source: {
    fontSize: 13,
    fontStyle: 'italic',
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
