import * as Clipboard from "expo-clipboard";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import Head from "expo-router/head";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContentShell, contentColumn } from "@/components/ContentShell";
import { PoemImages } from "@/components/PoemImages";
import { REMOTE_DATA_ENABLED } from "@/config";
import { Gurmukhi, Spacing } from "@/constants/theme";
import { usePoems } from "@/context/PoemsContext";
import { clampScale, useTextSize } from "@/context/TextSizeContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/hooks/use-theme";
import { resolvePoemImage, type PoemImageSource } from "@/lib/imageMap";
import type { Poem } from "@/lib/types";

type Script = "gurmukhi" | "roman";

/** Base type metrics per script, before the reader's scale is applied. */
const TYPE = {
  gurmukhi: { fontSize: 20, lineHeight: 34 },
  roman: { fontSize: 17, lineHeight: 28 },
} as const;

/**
 * The poem body, sized by the reader's saved scale and pinchable to change it.
 *
 * The pinch multiplier lives in a shared value so the type resizes with the fingers
 * on the UI thread, and commits to the persisted scale once on release — so pinch
 * and the A−/A+ buttons drive the same number, and it survives leaving the screen.
 */
function PoemBody({
  text,
  isGurmukhi,
  color,
}: {
  text: string;
  isGurmukhi: boolean;
  color: string;
}) {
  const { scale, setScale } = useTextSize();
  const pinch = useSharedValue(1);

  const base = isGurmukhi ? TYPE.gurmukhi : TYPE.roman;

  const gesture = Gesture.Pinch()
    .onUpdate((e) => {
      // Bound the live value too, so the text can't run away past the limits
      // mid-gesture and snap back on release.
      pinch.value = clampScale(scale * e.scale) / scale;
    })
    .onEnd(() => {
      const next = clampScale(scale * pinch.value);
      pinch.value = 1;
      runOnJS(setScale)(next);
    });

  const animated = useAnimatedStyle(() => ({
    fontSize: base.fontSize * scale * pinch.value,
    lineHeight: base.lineHeight * scale * pinch.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.Text
        selectable
        accessibilityHint="Pinch to change the text size"
        style={[
          { color },
          isGurmukhi && { fontFamily: Gurmukhi.regular },
          animated,
        ]}
      >
        {text}
      </Animated.Text>
    </GestureDetector>
  );
}

export default function PoemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { poems, source, error } = usePoems();
  const { increase, decrease, canIncrease, canDecrease } = useTextSize();
  const { showToast } = useToast();

  const index = poems.findIndex((p) => p.id === id);
  const poem = index === -1 ? undefined : poems[index];
  const previous = index > 0 ? poems[index - 1] : null;
  const next =
    index !== -1 && index < poems.length - 1 ? poems[index + 1] : null;
  const [script, setScript] = useState<Script>("gurmukhi");

  if (!poem) {
    // A deep link (common on web) can land before the remote fetch does, and the
    // bundled seed won't have poems added since the last release. Only call it
    // missing once the freshest source we can reach has actually been consulted.
    const stillArriving = REMOTE_DATA_ENABLED && !error && source !== "remote";
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: stillArriving ? "" : "Not found" }} />
        <Text style={{ color: c.textSecondary }}>
          {stillArriving ? "Loading…" : "Poem not found."}
        </Text>
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
  const shown = script === "gurmukhi" ? poem.gurmukhi : poem.roman;
  // If only one script exists, always show that one regardless of the toggle.
  const body = both ? shown : poem.gurmukhi || poem.roman;
  const bodyIsGurmukhi = both ? script === "gurmukhi" : hasGurmukhi;

  // Always the Gurmukhi Unicode, whatever the script toggle is showing — the
  // button exists to take the Punjabi text elsewhere, so it must be predictable.
  const copyGurmukhi = async () => {
    if (!poem.gurmukhi) return;
    try {
      await Clipboard.setStringAsync(poem.gurmukhi);
      showToast("Gurmukhi copied", "success");
    } catch {
      showToast("Couldn’t copy", "error");
    }
  };

  // A shared link should say what it is. Web only — Head is a no-op on native,
  // where the Stack.Screen title below does the equivalent job.
  const description = [
    poem.poet,
    (poem.gurmukhi || poem.roman || "").slice(0, 140),
  ]
    .filter(Boolean)
    .join(" — ");
  const pageTitle = [poem.title.gurmukhi, poem.title.roman]
    .filter(Boolean)
    .join(" · ");

  return (
    <ContentShell style={{ backgroundColor: c.background }}>
      <Head>
        <title>{`${pageTitle} · Kavita`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary" />
      </Head>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          contentColumn,
          { paddingBottom: insets.bottom + Spacing.six },
        ]}
      >
        <Stack.Screen options={{ title: poem.title.gurmukhi }} />

        {scans.length > 0 && (
          <PoemImages sources={scans} alt={poem.title.roman} />
        )}

        <Text
          style={[
            styles.title,
            { color: c.text, fontFamily: Gurmukhi.regular },
          ]}
        >
          {poem.title.gurmukhi}
        </Text>
        <Text style={[styles.titleRoman, { color: c.textSecondary }]}>
          {poem.title.roman}
        </Text>
        {!!poem.poet && (
          <Text style={[styles.poet, { color: c.accent }]}>{poem.poet}</Text>
        )}

        {(both || !!body) && (
          <View style={styles.controls}>
            {both ? (
              <View style={[styles.toggle, { borderColor: c.border }]}>
                {(["gurmukhi", "roman"] as const).map((s) => {
                  const selected = script === s;
                  return (
                    <Text
                      key={s}
                      onPress={() => setScript(s)}
                      style={[
                        styles.toggleItem,
                        {
                          backgroundColor: selected ? c.accent : "transparent",
                          color: selected ? c.background : c.textSecondary,
                        },
                        s === "gurmukhi" && { fontFamily: Gurmukhi.regular },
                      ]}
                    >
                      {s === "gurmukhi" ? "ਪੰਜਾਬੀ" : "Roman"}
                    </Text>
                  );
                })}
              </View>
            ) : (
              <View />
            )}

            <View style={styles.sizeRow}>
              {hasGurmukhi && (
                <Pressable
                  onPress={copyGurmukhi}
                  accessibilityRole="button"
                  accessibilityLabel="Copy the Gurmukhi text"
                  style={[styles.copyBtn, { borderColor: c.border }]}
                >
                  <Text style={[styles.copyBtnText, { color: c.text }]}>
                    Copy
                  </Text>
                </Pressable>
              )}
              {!!body && (
                <>
                  <Pressable
                    onPress={decrease}
                    disabled={!canDecrease}
                    accessibilityLabel="Decrease text size"
                    style={[
                      styles.sizeBtn,
                      { borderColor: c.border, opacity: canDecrease ? 1 : 0.4 },
                    ]}
                  >
                    <Text style={[styles.sizeBtnSmall, { color: c.text }]}>
                      A−
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={increase}
                    disabled={!canIncrease}
                    accessibilityLabel="Increase text size"
                    style={[
                      styles.sizeBtn,
                      { borderColor: c.border, opacity: canIncrease ? 1 : 0.4 },
                    ]}
                  >
                    <Text style={[styles.sizeBtnLarge, { color: c.text }]}>
                      A+
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}

        {body ? (
          <PoemBody text={body} isGurmukhi={bodyIsGurmukhi} color={c.text} />
        ) : (
          <Text style={[styles.empty, { color: c.textSecondary }]}>
            No transcription yet.
          </Text>
        )}

        {!!poem.source && (
          <Text
            style={[
              styles.source,
              { color: c.textSecondary, borderTopColor: c.border },
            ]}
          >
            {poem.source}
          </Text>
        )}

        {(previous || next) && (
          <View style={[styles.nav, { borderTopColor: c.border }]}>
            <NavLink poem={previous} direction="previous" />
            <NavLink poem={next} direction="next" />
          </View>
        )}
      </ScrollView>
    </ContentShell>
  );
}

/**
 * One end of the previous/next pair. Renders an empty spacer when there's nothing
 * in that direction, so the surviving link stays on its own side of the row.
 *
 * `replace` rather than `push`: reading straight through the collection would
 * otherwise pile up a back stack one entry deep per poem.
 *
 * A replace always animates as a push unless told otherwise, so going back a
 * poem slid in from the right like going forward. The `dir` param carries the
 * intent to the root layout, which turns it into `animationTypeForReplace` —
 * see src/app/_layout.tsx. It has to be read there rather than here, because
 * the option must exist when the screen is created, not after it renders.
 */
function NavLink({
  poem,
  direction,
}: {
  poem: Poem | null;
  direction: "previous" | "next";
}) {
  const c = useTheme();
  const isNext = direction === "next";

  if (!poem) return <View style={styles.navSpacer} />;

  return (
    <Link
      href={{
        pathname: "/poem/[id]",
        params: { id: poem.id, dir: isNext ? "next" : "prev" },
      }}
      replace
      accessibilityLabel={`${isNext ? "Next" : "Previous"} poem: ${
        poem.title.roman || poem.title.gurmukhi
      }`}
      style={[styles.navLink, isNext && styles.navLinkEnd]}
    >
      <Text style={[styles.navDirection, { color: c.textSecondary }]}>
        {isNext ? "Next" : "Previous"}
      </Text>
      {"\n\n"}
      <Text
        numberOfLines={1}
        style={[
          styles.navTitle,
          { color: c.accent, fontFamily: Gurmukhi.regular },
        ]}
      >
        {poem.title.gurmukhi || poem.title.roman}
      </Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
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
    fontWeight: "600",
  },
  toggle: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    overflow: "hidden",
  },
  toggleItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    fontSize: 14,
    fontWeight: "600",
    overflow: "hidden",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sizeRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginLeft: "auto",
  },
  copyBtn: {
    height: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sizeBtn: {
    width: 42,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeBtnSmall: {
    fontSize: 14,
    fontWeight: "700",
  },
  sizeBtnLarge: {
    fontSize: 18,
    fontWeight: "700",
  },
  empty: {
    fontSize: 15,
    fontStyle: "italic",
  },
  source: {
    fontSize: 13,
    fontStyle: "italic",
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.three,
    paddingTop: Spacing.four,
    marginTop: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navSpacer: { flex: 1 },
  navLink: {
    flex: 1,
  },
  navLinkEnd: {
    textAlign: "right",
  },
  navDirection: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  navTitle: {
    fontSize: 17,
    marginTop: Spacing.half,
  },
});
