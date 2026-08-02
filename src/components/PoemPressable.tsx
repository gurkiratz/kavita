import { forwardRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Applied on top of `style` while pressed — for the row/tile background. */
  pressedStyle?: StyleProp<ViewStyle>;
};

/**
 * A tappable poem, with consistent press feedback across the grid and the index.
 *
 * `forwardRef` and the prop spread are what let `<Link asChild>` hand its own
 * onPress and (on web) href down — without them the tile renders but never
 * navigates.
 *
 * ⚠️ Callers under `<Link asChild>` MUST pass `style` as a single flat object —
 * use `StyleSheet.flatten([...])`, never a bare array or a function.
 *
 * `Link asChild` renders through Radix's `Slot`, which merges style by object
 * spread: `{ ...slotStyle, ...childStyle }`. Spreading an array yields indexed
 * keys (`{0: …, 1: …}`), which react-native-web then tries to assign to a DOM
 * node's style — "Failed to set an indexed property [0] on
 * 'CSSStyleDeclaration'". Spreading a function yields `{}`, silently dropping
 * every style instead. Either way the layout collapses.
 */
export const PoemPressable = forwardRef<View, Props>(function PoemPressable(
  { style, pressedStyle, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      style={({ pressed }) => [style, pressed && { opacity: 0.7 }, pressed && pressedStyle]}
      {...rest}
    />
  );
});
