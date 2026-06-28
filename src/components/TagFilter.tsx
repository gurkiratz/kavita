import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  tags: string[];
  active: string[];
  onToggle: (tag: string) => void;
};

export function TagFilter({ tags, active, onToggle }: Props) {
  const c = useTheme();
  if (tags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {tags.map((tag) => {
        const selected = active.includes(tag);
        return (
          <Pressable
            key={tag}
            onPress={() => onToggle(tag)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? c.accent : c.backgroundElement,
                borderColor: selected ? c.accent : c.border,
              },
            ]}>
            <Text
              style={[styles.label, { color: selected ? c.background : c.textSecondary }]}>
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
