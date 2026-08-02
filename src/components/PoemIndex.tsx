import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Gurmukhi, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Poem } from '@/lib/types';

import { PoemPressable } from './PoemPressable';

/** A run of poems sharing a first letter. */
export type PoemGroup = { letter: string; poems: Poem[] };

/**
 * Group poems by the first character of their Gurmukhi title, in Punjabi
 * collation order. Returns groups in order, so the caller can flatten them into
 * whatever list it likes.
 */
export function groupByLetter(poems: Poem[]): PoemGroup[] {
  const sorted = [...poems].sort((a, b) =>
    a.title.gurmukhi.localeCompare(b.title.gurmukhi, 'pa'),
  );

  const groups: PoemGroup[] = [];
  for (const poem of sorted) {
    const letter = poem.title.gurmukhi.slice(0, 1) || '?';
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.poems.push(poem);
    else groups.push({ letter, poems: [poem] });
  }
  return groups;
}

export function LetterHeading({ letter }: { letter: string }) {
  const c = useTheme();
  return (
    <View style={[styles.heading, { borderBottomColor: c.border }]}>
      <Text style={[styles.headingText, { color: c.accent, fontFamily: Gurmukhi.regular }]}>
        {letter}
      </Text>
    </View>
  );
}

/**
 * One line of the index.
 *
 * Denser than the grid but still a distinct, filled, comfortably-tall target —
 * bare text rows sat close enough together that tapping the right one felt like
 * a gamble. `minHeight` holds the target size even for a one-line title.
 */
export function PoemRow({ poem }: { poem: Poem }) {
  const c = useTheme();

  const scanCount = poem.images?.length ?? (poem.image ? 1 : 0);
  const hasText = !!(poem.gurmukhi || poem.roman);

  return (
    <Link href={{ pathname: '/poem/[id]', params: { id: poem.id } }} asChild>
      {/* flatten: see PoemPressable — an array here breaks Slot's style merge. */}
      <PoemPressable
        style={StyleSheet.flatten([
          styles.row,
          { backgroundColor: c.backgroundElement, borderColor: c.border },
        ])}
        pressedStyle={{ backgroundColor: c.backgroundSelected }}>
        <View style={styles.rowText}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: c.text, fontFamily: Gurmukhi.regular }]}>
            {poem.title.gurmukhi}
          </Text>
          {!!poem.title.roman && (
            <Text numberOfLines={1} style={[styles.roman, { color: c.textSecondary }]}>
              {poem.title.roman}
            </Text>
          )}
        </View>

        {/* What this entry actually holds, without costing a thumbnail. */}
        <View style={styles.marks}>
          {scanCount > 0 && (
            <Text style={[styles.mark, { color: c.textSecondary }]}>
              ▣{scanCount > 1 ? ` ${scanCount}` : ''}
            </Text>
          )}
          {hasText && <Text style={[styles.mark, { color: c.textSecondary }]}>¶</Text>}
        </View>
      </PoemPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    paddingBottom: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headingText: {
    fontSize: 20,
    lineHeight: 30,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    lineHeight: 28,
  },
  roman: {
    fontSize: 12,
  },
  marks: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  mark: {
    fontSize: 12,
  },
});
