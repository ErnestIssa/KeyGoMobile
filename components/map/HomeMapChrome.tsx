import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFloatingTabBarBottomInset } from '../../navigation/floatingTabBar';
import { MapPlaceholder } from './MapPlaceholder';

type Props = {
  /** Swap for Mapbox `MapView` when integrated. */
  map?: ReactNode;
  /** Future: search, status, menu — keep minimal for now. */
  topBar?: ReactNode;
  /** Future: trip summary, vehicle list — sits above the tab bar inset. */
  bottomSheet?: ReactNode;
  /** Future: recenter, layers — anchored bottom-end above tab bar. */
  floatingActions?: ReactNode;
};

/**
 * Full-screen map host for the Home tab: map layer + reserved overlay slots.
 * Overlay rows use `pointerEvents="box-none"` so the map receives pan/pinch in empty areas.
 */
export function HomeMapChrome({ map, topBar, bottomSheet, floatingActions }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = useFloatingTabBarBottomInset();

  const topPad = Math.max(insets.top, 0) + 8;
  const bottomReserve = tabBarBottomInset + 8;

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFillObject}>{map ?? <MapPlaceholder />}</View>

      <View style={styles.overlay} pointerEvents="box-none">
        <View
          style={[styles.topSlot, { paddingTop: topPad }]}
          pointerEvents="box-none"
        >
          {topBar != null ? (
            <View style={styles.topInner} pointerEvents="auto">
              {topBar}
            </View>
          ) : (
            <View style={styles.topSpacer} />
          )}
        </View>

        <View style={styles.flexFill} pointerEvents="box-none" />

        <View
          style={[styles.bottomZone, { paddingBottom: bottomReserve }]}
          pointerEvents="box-none"
        >
          {bottomSheet != null ? (
            <View style={styles.bottomInner} pointerEvents="auto">
              {bottomSheet}
            </View>
          ) : (
            <View style={styles.bottomSpacer} />
          )}
        </View>

        {floatingActions != null ? (
          <View
            style={[
              styles.fabAnchor,
              { bottom: bottomReserve + 8, right: 16 + Math.max(insets.right, 0) },
            ]}
            pointerEvents="box-none"
          >
            <View pointerEvents="auto">{floatingActions}</View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topSlot: {
    width: '100%',
  },
  topInner: {
    paddingHorizontal: 16,
  },
  /** Reserved height when no topBar — avoids layout shift when you add one. */
  topSpacer: {
    minHeight: 44,
  },
  flexFill: {
    flex: 1,
  },
  bottomZone: {
    width: '100%',
  },
  bottomInner: {
    paddingHorizontal: 16,
  },
  /** Collapsed sheet rail — swap for real sheet UI later. */
  bottomSpacer: {
    minHeight: 56,
  },
  fabAnchor: {
    position: 'absolute',
    right: 16,
  },
});
