import Head from 'expo-router/head';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell, contentColumn } from '@/components/ContentShell';
import { KeepAwakeToggle } from '@/components/KeepAwakeToggle';
import { PoemTile, useGridColumns } from '@/components/PoemGrid';
import { LetterHeading, PoemRow, groupByLetter } from '@/components/PoemIndex';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';
import { ViewToggle } from '@/components/ViewToggle';
import { Spacing } from '@/constants/theme';
import { usePoems } from '@/context/PoemsContext';
import { useTheme } from '@/hooks/use-theme';
import { useViewMode } from '@/hooks/use-view-mode';
import { allTags, filterPoems } from '@/lib/search';
import type { Poem } from '@/lib/types';

const DESCRIPTION =
  'A collection of Punjabi poetry in Gurmukhi, with scans and Roman transliterations.';

/** A flat list of index entries: letter headings interleaved with poems. */
type IndexEntry = { kind: 'letter'; letter: string } | { kind: 'poem'; poem: Poem };

export default function HomeScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { poems, refreshing, refresh, error } = usePoems();
  const { mode, setMode } = useViewMode();
  const columns = useGridColumns();

  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const tags = useMemo(() => allTags(poems), [poems]);
  const results = useMemo(
    () => filterPoems(poems, query, activeTags),
    [poems, query, activeTags],
  );

  // Flattened so the index scrolls through one virtualised list rather than a
  // ScrollView holding every poem at once.
  const indexEntries = useMemo<IndexEntry[]>(() => {
    if (mode !== 'index') return [];
    return groupByLetter(results).flatMap<IndexEntry>((group) => [
      { kind: 'letter', letter: group.letter },
      ...group.poems.map((poem) => ({ kind: 'poem' as const, poem })),
    ]);
  }, [mode, results]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const header = (
    <View style={styles.header}>
      <SearchBar value={query} onChange={setQuery} />
      <TagFilter tags={tags} active={activeTags} onToggle={toggleTag} />
      <View style={styles.controls}>
        <Text style={[styles.count, { color: c.textSecondary }]}>
          {results.length === poems.length
            ? `${poems.length} ${poems.length === 1 ? 'poem' : 'poems'}`
            : `${results.length} of ${poems.length}`}
        </Text>
        <ViewToggle mode={mode} onChange={setMode} />
      </View>
      <KeepAwakeToggle />
      {error && (
        <Pressable
          onPress={refresh}
          style={[
            styles.banner,
            { backgroundColor: c.backgroundElement, borderColor: c.border },
          ]}>
          <Text style={[styles.bannerText, { color: c.textSecondary }]}>
            Couldn’t load the latest poems. Tap to retry.
          </Text>
        </Pressable>
      )}
    </View>
  );

  const empty = (
    <Text style={[styles.empty, { color: c.textSecondary }]}>
      No poems match your search.
    </Text>
  );

  const shared = {
    refreshing,
    onRefresh: refresh,
    keyboardShouldPersistTaps: 'handled' as const,
    // Swiping the list down dismisses the search keyboard, the way iOS lists do.
    // Pairs with keyboardShouldPersistTaps so a tap on a poem still registers
    // instead of being eaten by the dismissal.
    keyboardDismissMode: 'on-drag' as const,
    ListHeaderComponent: header,
    ListEmptyComponent: empty,
  };

  return (
    <ContentShell style={{ backgroundColor: c.background }}>
      <Head>
        <title>ਕਵਿਤਾ · Kavita</title>
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="ਕਵਿਤਾ · Kavita" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:type" content="website" />
      </Head>

      {mode === 'grid' ? (
        <FlatList
          // numColumns can't change on a live list — remounting is the supported
          // way to move between the phone and wide layouts.
          key={`grid-${columns}`}
          data={results}
          keyExtractor={(p) => p.id}
          numColumns={columns}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.content,
            contentColumn,
            styles.gridContent,
            { paddingBottom: insets.bottom + Spacing.four },
          ]}
          renderItem={({ item }) => <PoemTile poem={item} columns={columns} />}
          {...shared}
        />
      ) : (
        <FlatList
          key="index"
          data={indexEntries}
          keyExtractor={(entry) =>
            entry.kind === 'letter' ? `letter-${entry.letter}` : entry.poem.id
          }
          contentContainerStyle={[
            styles.content,
            contentColumn,
            styles.indexContent,
            { paddingBottom: insets.bottom + Spacing.four },
          ]}
          renderItem={({ item }) =>
            item.kind === 'letter' ? (
              <LetterHeading letter={item.letter} />
            ) : (
              <PoemRow poem={item.poem} />
            )
          }
          {...shared}
        />
      )}
    </ContentShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
  },
  gridContent: {
    gap: Spacing.three,
  },
  gridRow: {
    gap: Spacing.three,
    // Scan tiles and the shorter text tiles share a row; anchor both to the top
    // rather than stretching the short one to match.
    alignItems: 'flex-start',
  },
  indexContent: {
    // Every row is its own filled block, so they need air between them —
    // otherwise adjacent titles read as one list and tapping feels like a guess.
    gap: Spacing.two,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  count: {
    fontSize: 13,
  },
  banner: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: {
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
    fontSize: 15,
  },
});
