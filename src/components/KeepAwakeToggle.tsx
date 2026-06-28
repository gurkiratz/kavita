import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useKeepScreenOn } from '@/context/KeepAwakeContext';
import { useTheme } from '@/hooks/use-theme';

export function KeepAwakeToggle() {
  const c = useTheme();
  const { keepScreenOn, setKeepScreenOn } = useKeepScreenOn();

  if (Platform.OS === 'web') return null;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: c.text }]}>Keep screen on</Text>
      <Switch
        value={keepScreenOn}
        onValueChange={setKeepScreenOn}
        trackColor={{ false: c.border, true: c.accent }}
        thumbColor={c.background}
        accessibilityLabel="Keep screen on"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.one,
  },
  label: {
    fontSize: 15,
  },
});
