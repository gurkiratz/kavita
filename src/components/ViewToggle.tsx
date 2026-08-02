import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ViewMode } from '@/hooks/use-view-mode';

type Props = {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
};

/**
 * Grid / index switch for the collection.
 *
 * The icons are drawn from plain Views rather than pulled from an icon font —
 * two shapes don't justify a dependency, and these stay crisp at any scale.
 */
export function ViewToggle({ mode, onChange }: Props) {
  const c = useTheme();

  return (
    <View style={[styles.group, { borderColor: c.border }]}>
      <Option
        selected={mode === 'grid'}
        onPress={() => onChange('grid')}
        label="Show scans as a grid">
        <GridIcon color={mode === 'grid' ? c.background : c.textSecondary} />
      </Option>
      <Option
        selected={mode === 'index'}
        onPress={() => onChange('index')}
        label="Show titles as a list">
        <IndexIcon color={mode === 'index' ? c.background : c.textSecondary} />
      </Option>
    </View>
  );
}

function Option({
  selected,
  onPress,
  label,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.option, selected && { backgroundColor: c.accent }]}>
      {children}
    </Pressable>
  );
}

/** Four squares. */
function GridIcon({ color }: { color: string }) {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.gridCell, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** Three stacked rules. */
function IndexIcon({ color }: { color: string }) {
  return (
    <View style={styles.index}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.indexLine, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  option: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  gridCell: {
    width: 6.5,
    height: 6.5,
    borderRadius: 1.5,
  },
  index: {
    width: 16,
    gap: 3,
  },
  indexLine: {
    height: 2,
    borderRadius: 1,
  },
});
