import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PoemImageSource } from '@/lib/imageMap';

type Props = {
  /** Images in display order — bundled assets or remote URLs. */
  sources: PoemImageSource[];
  alt?: string;
};

/** One full-width scan that adopts its image's natural aspect ratio once loaded. */
function ScanImage({
  source,
  onPress,
  label,
  bg,
}: {
  source: PoemImageSource;
  onPress: () => void;
  label: string;
  bg: string;
}) {
  const [aspectRatio, setAspectRatio] = useState(0.7);

  return (
    <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={label}>
      <Image
        source={source}
        style={[styles.image, { aspectRatio, backgroundColor: bg }]}
        contentFit="contain"
        transition={150}
        onLoad={(e) => {
          const { width, height } = e.source;
          if (width && height) setAspectRatio(width / height);
        }}
      />
    </Pressable>
  );
}

/** A vertical stack of full-width, uncropped scans; tap any to open the swipeable viewer. */
export function PoemImages({ sources, alt }: Props) {
  const c = useTheme();
  const [openAt, setOpenAt] = useState<number | null>(null);

  return (
    <View style={styles.stack}>
      {sources.map((src, i) => (
        <ScanImage
          key={i}
          source={src}
          bg={c.backgroundElement}
          onPress={() => setOpenAt(i)}
          label={
            alt ? `${alt} — image ${i + 1} of ${sources.length}, tap to enlarge` : 'Tap to enlarge'
          }
        />
      ))}

      <ImageViewer sources={sources} startIndex={openAt} onClose={() => setOpenAt(null)} />
    </View>
  );
}

/** A single fullscreen image with pinch-to-zoom, pan, and double-tap zoom. */
function ZoomablePage({
  source,
  width,
  height,
  zoomed,
  onZoomChange,
  onClose,
}: {
  source: PoemImageSource;
  width: number;
  height: number;
  zoomed: boolean;
  onZoomChange: (z: boolean) => void;
  onClose: () => void;
}) {
  const scale = useSharedValue(1);
  const start = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  function reset() {
    'worklet';
    scale.value = withTiming(1);
    start.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    startX.value = 0;
    startY.value = 0;
  }

  // Furthest the image can be panned before its edge crosses the screen edge.
  function maxOffset(dimension: number) {
    'worklet';
    return Math.max(0, (dimension * scale.value - dimension) / 2);
  }
  function clamp(value: number, limit: number) {
    'worklet';
    return Math.min(Math.max(value, -limit), limit);
  }

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, start.value * e.scale);
    })
    .onEnd(() => {
      start.value = scale.value;
      if (scale.value <= 1.01) {
        reset();
        runOnJS(onZoomChange)(false);
      } else {
        // Zooming out can leave the image off-centre — pull it back in bounds.
        const clampedX = clamp(tx.value, maxOffset(width));
        const clampedY = clamp(ty.value, maxOffset(height));
        tx.value = withTiming(clampedX);
        ty.value = withTiming(clampedY);
        startX.value = clampedX;
        startY.value = clampedY;
        runOnJS(onZoomChange)(true);
      }
    });

  // Pan only while zoomed, so it doesn't steal horizontal swipes from the pager.
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      tx.value = clamp(startX.value + e.translationX, maxOffset(width));
      ty.value = clamp(startY.value + e.translationY, maxOffset(height));
    })
    .onEnd(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
        runOnJS(onZoomChange)(false);
      } else {
        scale.value = withTiming(2.5);
        start.value = 2.5;
        runOnJS(onZoomChange)(true);
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (scale.value <= 1) runOnJS(onClose)();
    });

  const gesture = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.Image
          source={source}
          style={[{ width, height }, animatedStyle]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

/** Fullscreen modal with horizontal paging + per-image zoom. */
function ImageViewer({
  sources,
  startIndex,
  onClose,
}: {
  sources: PoemImageSource[];
  startIndex: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visible = startIndex !== null;
  const [page, setPage] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (startIndex !== null) {
      setPage(startIndex);
      setZoomed(false);
    }
  }, [startIndex]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.backdrop}>
        {visible && (
          <FlatList
            data={sources}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={startIndex ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item }) => (
              <ZoomablePage
                source={item}
                width={width}
                height={height}
                zoomed={zoomed}
                onZoomChange={setZoomed}
                onClose={onClose}
              />
            )}
          />
        )}

        <Pressable
          style={[styles.close, { top: insets.top + Spacing.two }]}
          onPress={onClose}
          hitSlop={14}
          accessibilityRole="button"
          accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        {sources.length > 1 && !zoomed && (
          <View style={[styles.counter, { bottom: insets.bottom + Spacing.four }]}>
            <Text style={styles.counterText}>
              {page + 1} / {sources.length}
            </Text>
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three,
  },
  image: {
    width: '100%',
    borderRadius: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  close: {
    position: 'absolute',
    right: Spacing.three,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  counterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
