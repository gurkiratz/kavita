import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChange: (text: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  const c = useTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: c.backgroundElement, borderColor: c.border }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="ਖੋਜੋ · Search in Punjabi or English"
        placeholderTextColor={c.textSecondary}
        style={[
          styles.input,
          { color: c.text },
          // Web-only: remove the default focus outline (not in RN's TextStyle types).
          Platform.OS === 'web' && ({ outlineStyle: 'none', outlineWidth: 0 } as object),
        ]}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChange('')}
          hitSlop={10}
          accessibilityLabel="Clear search"
          style={styles.clear}>
          <View style={[styles.clearDot, { backgroundColor: c.textSecondary }]} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  clear: {
    padding: Spacing.one,
  },
  clearDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    opacity: 0.6,
  },
});
