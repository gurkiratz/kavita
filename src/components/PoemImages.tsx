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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Bundled asset module ids (from require()), in display order. */
  sources: number[];
  alt?: string;
};

/** One full-width scan that adopts its image's natural aspect ratio once loaded. */
function ScanImage({
  source,
  onPress,
  label,
  bg,
}: {
  source: number;
  onPress: () => void;
  label: string;
  bg: string;
}) {
  // Default to a portrait ratio until the real dimensions arrive from onLoad.
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

/** Fullscreen modal with horizontal paging between all images. */
function ImageViewer({
  sources,
  startIndex,
  onClose,
}: {
  sources: number[];
  startIndex: number | null;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visible = startIndex !== null;
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (startIndex !== null) setPage(startIndex);
  }, [startIndex]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {visible && (
          <FlatList
            data={sources}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={startIndex ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) =>
              setPage(Math.round(e.nativeEvent.contentOffset.x / width))
            }
            renderItem={({ item }) => (
              <Pressable style={{ width, height }} onPress={onClose}>
                <Image source={item} style={{ width, height }} contentFit="contain" />
              </Pressable>
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

        {sources.length > 1 && (
          <View style={[styles.counter, { bottom: insets.bottom + Spacing.four }]}>
            <Text style={styles.counterText}>
              {page + 1} / {sources.length}
            </Text>
          </View>
        )}
      </View>
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
