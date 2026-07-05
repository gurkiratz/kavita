import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { ContentMaxWidth, Gurmukhi, Spacing } from "@/constants/theme";
import { usePoems } from "@/context/PoemsContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/hooks/use-theme";
import { isGurmukhi } from "@/lib/search";

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
  route: { name: string };
  back?: { title?: string } | undefined;
  navigation: { goBack: () => void; canGoBack: () => boolean };
};

export function AppHeader({ options, route, back, navigation }: AppHeaderProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { refresh, refreshing } = usePoems();
  const { showToast } = useToast();

  const onRefresh = async () => {
    if (refreshing) return;
    const result = await refresh();
    if (result === "ok") showToast("Poems refreshed", "success");
    else if (result === "failed")
      showToast("Couldn’t refresh — check your connection", "error");
    else showToast("Live sync isn’t set up", "info");
  };

  const title =
    typeof options.headerTitle === "string"
      ? options.headerTitle
      : options.title ?? "";

  const backLabel = options.headerBackTitle ?? back?.title ?? "Back";
  const showBack = route.name !== "index";

  const onBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.replace("/");
    }
  };

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
          {showBack ? (
            <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
              <Text style={[styles.backText, { color: c.accent }]}>
                {Platform.OS === "ios" ? `‹ ${backLabel}` : `← ${backLabel}`}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Text
          style={[
            styles.title,
            { color: c.text },
            isGurmukhi(title) && { fontFamily: Gurmukhi.bold },
          ]}
          numberOfLines={1}>
          {title}
        </Text>

        <View style={[styles.side, styles.sideRight]}>
          <Pressable
            onPress={onRefresh}
            disabled={refreshing}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Refresh poems"
            style={styles.refresh}>
            {refreshing ? (
              <ActivityIndicator size="small" color={c.accent} />
            ) : (
              <Text style={[styles.refreshIcon, { color: c.accent }]}>↻</Text>
            )}
          </Pressable>
        </View>
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
  sideRight: {
    alignItems: "flex-end",
  },
  refresh: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshIcon: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 24,
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
