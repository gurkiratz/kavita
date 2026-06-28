import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getScan } from '@/lib/imageMap';
import type { Poem } from '@/lib/types';

type Props = { poem: Poem };

export function PoemCard({ poem }: Props) {
  const c = useTheme();
  const scan = getScan(poem.images?.[0] ?? poem.image);

  return (
    <Link href={{ pathname: '/poem/[id]', params: { id: poem.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.backgroundElement, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
        ]}>
        <View style={[styles.thumb, { backgroundColor: c.backgroundSelected }]}>
          {scan ? (
            <Image source={scan} style={styles.thumbImage} contentFit="cover" />
          ) : (
            <Text style={[styles.thumbGlyph, { color: c.textSecondary }]} numberOfLines={1}>
              {poem.title.gurmukhi.slice(0, 1)}
            </Text>
          )}
        </View>

        <View style={styles.body}>
          <Text
            style={[styles.title, { color: c.text, fontFamily: Fonts.serif }]}
            numberOfLines={2}>
            {poem.title.gurmukhi}
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={1}>
            {poem.title.roman}
          </Text>

          {poem.tags.length > 0 && (
            <View style={styles.tags}>
              {poem.tags.map((tag) => (
                <Text key={tag} style={[styles.tag, { color: c.accent }]}>
                  {tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbGlyph: {
    fontSize: 26,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 13,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
