import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Gurmukhi, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolvePoemImage } from '@/lib/imageMap';
import type { Poem } from '@/lib/types';

import { PoemPressable } from './PoemPressable';

/** Tiles per row. Two on a phone, three once there's room for them. */
export function useGridColumns() {
  const { width } = useWindowDimensions();
  return width >= 900 ? 3 : 2;
}

type Props = { poem: Poem; columns: number };

/**
 * One poem in the grid.
 *
 * Scan-first: for a handwritten archive the page itself is more recognisable
 * than its title. A poem with no scan has nothing to show at that size, so it
 * gets a different shape entirely — see PlaceholderTile.
 */
export function PoemTile({ poem, columns }: Props) {
  const c = useTheme();
  const scan = resolvePoemImage(poem.images?.[0] ?? poem.image);

  if (!scan) return <PlaceholderTile poem={poem} columns={columns} />;

  return (
    <Link href={{ pathname: '/poem/[id]', params: { id: poem.id } }} asChild>
      {/* flatten: see PoemPressable — an array here breaks Slot's style merge. */}
      <PoemPressable style={StyleSheet.flatten([styles.tile, { flex: 1 / columns }])}>
        <View
          style={[
            styles.frame,
            { backgroundColor: c.backgroundElement, borderColor: c.border },
          ]}>
          <Image
            source={scan}
            style={styles.image}
            contentFit="cover"
            transition={150}
            accessibilityLabel={poem.title.roman || poem.title.gurmukhi}
          />
        </View>

        <Text
          numberOfLines={2}
          style={[styles.title, { color: c.text, fontFamily: Gurmukhi.regular }]}>
          {poem.title.gurmukhi}
        </Text>
        {!!poem.title.roman && (
          <Text numberOfLines={1} style={[styles.roman, { color: c.textSecondary }]}>
            {poem.title.roman}
          </Text>
        )}
      </PoemPressable>
    </Link>
  );
}

/**
 * A poem with no scan.
 *
 * A tall portrait frame holding one big letter was mostly empty space pretending
 * to be an image. Instead: a short rectangle with the titles set inside it, so
 * the box carries real content at the size it actually needs. The caption below
 * is dropped — it would only repeat what's in the box.
 *
 * Sitting shorter than its neighbours is deliberate. It reads as a different
 * kind of entry at a glance, which the row's ragged bottom edge reinforces.
 */
function PlaceholderTile({ poem, columns }: Props) {
  const c = useTheme();

  return (
    <Link href={{ pathname: '/poem/[id]', params: { id: poem.id } }} asChild>
      <PoemPressable
        style={StyleSheet.flatten([
          styles.tile,
          styles.placeholderTile,
          { flex: 1 / columns },
        ])}>
        <View
          style={[
            styles.placeholderFrame,
            { backgroundColor: c.backgroundElement, borderColor: c.border },
          ]}>
          <Text
            numberOfLines={3}
            style={[styles.placeholderTitle, { color: c.text, fontFamily: Gurmukhi.regular }]}>
            {poem.title.gurmukhi}
          </Text>
          {!!poem.title.roman && (
            <Text
              numberOfLines={1}
              style={[styles.placeholderRoman, { color: c.textSecondary }]}>
              {poem.title.roman}
            </Text>
          )}
        </View>
      </PoemPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  tile: {
    gap: Spacing.one,
  },
  frame: {
    width: '100%',
    aspectRatio: 0.72,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderTile: {
    // Don't let the flex row stretch it to match a scan tile's height.
    alignSelf: 'flex-start',
  },
  placeholderFrame: {
    width: '100%',
    // Wider than tall — a modest rectangle, not an empty portrait frame.
    aspectRatio: 1.3,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    justifyContent: 'center',
    gap: Spacing.half,
  },
  placeholderTitle: {
    // Larger than the caption under a scan tile — here the title is the content
    // of the box, not a label beneath it.
    fontSize: 19,
    lineHeight: 32,
  },
  placeholderRoman: {
    fontSize: 13,
  },
  title: {
    fontSize: 15,
    // Gurmukhi matras need headroom; numberOfLines clips to the line box.
    lineHeight: 26,
    marginTop: Spacing.half,
  },
  roman: {
    fontSize: 12,
  },
});
