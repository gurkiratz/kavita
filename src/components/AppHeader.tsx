import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContentMaxWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const HEADER_HEIGHT = Platform.select({ ios: 44, default: 56 }) ?? 56;
const SIDE_WIDTH = 96;

type AppHeaderProps = {
  options: {
    title?: string;
    headerTitle?:
      | string
      | ((props: { children: string; tintColor?: string }) => ReactNode);
    headerBackTitle?: string;
  };
  back?: { title?: string } | undefined;
  navigation: { goBack: () => void };
};

export function AppHeader({ options, back, navigation }: AppHeaderProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  const title =
    typeof options.headerTitle === "string"
      ? options.headerTitle
      : options.title ?? "";

  const backLabel = options.headerBackTitle ?? back?.title ?? "Back";

  return (
    <View
      style={[
        styles.outer,
        {
          backgroundColor: c.background,
          paddingTop: insets.top,
          borderBottomColor: c.border,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.side}>
          {back ? (
            <Pressable
              onPress={navigation.goBack}
              hitSlop={8}
              style={styles.back}
            >
              <Text style={[styles.backText, { color: c.accent }]}>
                {Platform.OS === "ios" ? `‹ ${backLabel}` : `← ${backLabel}`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.side} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    height: HEADER_HEIGHT,
    width: "100%",
    maxWidth: ContentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
  },
  side: {
    width: SIDE_WIDTH,
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
  },
  back: {
    marginLeft: Platform.OS === "ios" ? -Spacing.one : 0,
  },
  backText: {
    fontSize: 17,
  },
});
