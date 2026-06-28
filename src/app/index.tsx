import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell } from '@/components/ContentShell';
import { PoemCard } from '@/components/PoemCard';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import poemsData from '@/data/poems.json';
import { allTags, filterPoems } from '@/lib/search';
import type { Poem } from '@/lib/types';

const poems = poemsData as unknown as Poem[];

export default function HomeScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const tags = useMemo(() => allTags(poems), []);
  const results = useMemo(() => filterPoems(poems, query, activeTags), [query, activeTags]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  return (
    <ContentShell style={{ backgroundColor: c.background }}>
      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PoemCard poem={item} />}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.four },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchBar value={query} onChange={setQuery} />
            <TagFilter tags={tags} active={activeTags} onToggle={toggleTag} />
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.textSecondary }]}>
            No poems match your search.
          </Text>
        }
      />
    </ContentShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.six,
    fontSize: 15,
  },
});
