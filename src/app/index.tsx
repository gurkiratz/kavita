import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentShell } from '@/components/ContentShell';
import { KeepAwakeToggle } from '@/components/KeepAwakeToggle';
import { PoemCard } from '@/components/PoemCard';
import { SearchBar } from '@/components/SearchBar';
import { TagFilter } from '@/components/TagFilter';
import { Spacing } from '@/constants/theme';
import { usePoems } from '@/context/PoemsContext';
import { useTheme } from '@/hooks/use-theme';
import { allTags, filterPoems } from '@/lib/search';

function PoemDivider() {
  const c = useTheme();
  return (
    <View style={styles.dividerWrap}>
      <View style={[styles.divider, { backgroundColor: c.border }]} />
    </View>
  );
}

export default function HomeScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { poems, refreshing, refresh, error } = usePoems();

  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const tags = useMemo(() => allTags(poems), [poems]);
  const results = useMemo(
    () => filterPoems(poems, query, activeTags),
    [poems, query, activeTags],
  );

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
        ItemSeparatorComponent={PoemDivider}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchBar value={query} onChange={setQuery} />
            <TagFilter tags={tags} active={activeTags} onToggle={toggleTag} />
            <KeepAwakeToggle />
            {error && (
              <Pressable
                onPress={refresh}
                style={[styles.banner, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
                <Text style={[styles.bannerText, { color: c.textSecondary }]}>
                  Couldn’t load the latest poems. Tap to retry.
                </Text>
              </Pressable>
            )}
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
  },
  dividerWrap: {
    paddingVertical: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
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
