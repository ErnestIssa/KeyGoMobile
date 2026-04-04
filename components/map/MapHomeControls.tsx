import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FollowMode } from '../../context/VehicleFleetContext';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

/** Minimum horizontal gap from screen edges; symmetric with safe-area insets. */
const EDGE_GUTTER = 12;

export type MapVisualMode = 'day' | 'night';

type Props = {
  mapVisualMode: MapVisualMode;
  onToggleMapVisualMode: () => void;
  trafficEnabled: boolean;
  onToggleTraffic: () => void;
  followMode: FollowMode;
  onSetFollowMode: (m: FollowMode) => void;
  hasSelectedVehicle: boolean;
};

export function MapHomeControls({
  mapVisualMode,
  onToggleMapVisualMode,
  trafficEnabled,
  onToggleTraffic,
  followMode,
  onSetFollowMode,
  hasSelectedVehicle,
}: Props) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  const padLeft = Math.max(insets.left, EDGE_GUTTER);
  const padRight = Math.max(insets.right, EDGE_GUTTER);

  return (
    <View
      style={[
        styles.host,
        {
          paddingTop: insets.top + 8,
          paddingLeft: padLeft,
          paddingRight: padRight,
        },
      ]}
    >
      <View style={styles.toolbarRow}>
        <View style={[styles.pillRow, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mapVisualMode === 'day' ? 'Switch to night map' : 'Switch to day map'}
            onPress={onToggleMapVisualMode}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons
              name={mapVisualMode === 'day' ? 'moon-outline' : 'sunny-outline'}
              size={22}
              color={t.text}
            />
          </Pressable>
          <View style={[styles.sep, { backgroundColor: t.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trafficEnabled ? 'Disable traffic layer' : 'Show traffic'}
            onPress={onToggleTraffic}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons
              name="car-outline"
              size={22}
              color={trafficEnabled ? t.brand : t.textMuted}
            />
          </Pressable>
        </View>

        <View style={[styles.pillRow, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Follow my location"
            onPress={() => onSetFollowMode(followMode === 'user' ? 'none' : 'user')}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Ionicons
              name="navigate"
              size={18}
              color={followMode === 'user' ? t.brand : t.textMuted}
            />
            <Text style={[styles.chipLabel, { color: t.text, fontFamily: FF.semibold }]}>Me</Text>
          </Pressable>
          <View style={[styles.sep, { backgroundColor: t.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Follow selected vehicle"
            disabled={!hasSelectedVehicle}
            onPress={() =>
              onSetFollowMode(followMode === 'vehicle' ? 'none' : 'vehicle')
            }
            style={({ pressed }) => [
              styles.chip,
              !hasSelectedVehicle && { opacity: 0.35 },
              pressed && hasSelectedVehicle && styles.pressed,
            ]}
          >
            <Ionicons
              name="bus-outline"
              size={18}
              color={followMode === 'vehicle' ? t.brand : t.textMuted}
            />
            <Text style={[styles.chipLabel, { color: t.text, fontFamily: FF.semibold }]}>
              Vehicle
            </Text>
          </Pressable>
          <View style={[styles.sep, { backgroundColor: t.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Free pan — map stays put"
            onPress={() => onSetFollowMode('none')}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Ionicons
              name="hand-left-outline"
              size={18}
              color={followMode === 'none' ? t.brand : t.textMuted}
            />
            <Text style={[styles.chipLabel, { color: t.text, fontFamily: FF.semibold }]}>Pan</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
  },
  toolbarRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  chipLabel: {
    fontSize: 13,
  },
  sep: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    minHeight: 24,
  },
  pressed: {
    opacity: 0.75,
  },
});
