import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell } from '@/components/ContentShell';
import { PoemImages } from '@/components/PoemImages';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import poemsData from '@/data/poems.json';
import { getScan } from '@/lib/imageMap';
import type { Poem } from '@/lib/types';

const poems = poemsData as unknown as Poem[];

type Script = 'gurmukhi' | 'roman';

export default function PoemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const insets = useSafeAreaInsets();

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
  const scans = imageFiles.map(getScan).filter((s): s is number => s != null);
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
      <Stack.Screen options={{ title: poem.title.roman }} />

      {scans.length > 0 && <PoemImages sources={scans} alt={poem.title.roman} />}

      <Text style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}>
        {poem.title.gurmukhi}
      </Text>
      <Text style={[styles.titleRoman, { color: c.textSecondary }]}>{poem.title.roman}</Text>
      {!!poem.poet && (
        <Text style={[styles.poet, { color: c.accent }]}>{poem.poet}</Text>
      )}

      {both && (
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
      )}

      {body ? (
        <Text
          style={[
            styles.body,
            { color: c.text },
            bodyIsGurmukhi && { fontFamily: Fonts.serif, fontSize: 20, lineHeight: 34 },
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
  body: {
    fontSize: 17,
    lineHeight: 28,
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
