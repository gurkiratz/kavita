import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Gurmukhi, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { resolvePoemImage } from "@/lib/imageMap";
import type { Poem } from "@/lib/types";

type Props = { poem: Poem };

export function PoemCard({ poem }: Props) {
  const c = useTheme();
  const scan = resolvePoemImage(poem.images?.[0] ?? poem.image);

  return (
    <Link href={{ pathname: "/poem/[id]", params: { id: poem.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: c.backgroundElement,
            borderColor: c.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.thumb, { backgroundColor: c.backgroundSelected }]}>
          {scan ? (
            <Image source={scan} style={styles.thumbImage} contentFit="cover" />
          ) : (
            <Text
              style={[styles.thumbGlyph, { color: c.textSecondary }]}
              numberOfLines={1}
            >
              {poem.title.gurmukhi.slice(0, 1)}
            </Text>
          )}
        </View>

        <View style={styles.body}>
          <Text
            style={[styles.title, { color: c.text, fontFamily: Gurmukhi.bold }]}
            numberOfLines={2}
          >
            {poem.title.gurmukhi}
          </Text>
          <Text
            style={[styles.subtitle, { color: c.textSecondary }]}
            numberOfLines={1}
          >
            {poem.title.roman}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  thumb: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbGlyph: {
    fontSize: 64,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
  },
});
