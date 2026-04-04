import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VehiclePositionRow } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

const TAB_BAR_CLEARANCE = 112;

type Props = {
  vehicle: VehiclePositionRow | null;
  onClose: () => void;
};

export function MapVehicleInfoCard({ vehicle, onClose }: Props) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();

  if (!vehicle) return null;

  const speedLabel =
    vehicle.speedKmh != null && !Number.isNaN(vehicle.speedKmh)
      ? `${vehicle.speedKmh} km/h`
      : '—';

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 12) + TAB_BAR_CLEARANCE,
          backgroundColor: 'transparent',
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.card, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
        <View style={styles.row}>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: t.text, fontFamily: FF.bold }]} numberOfLines={1}>
              {vehicle.id}
            </Text>
            <Text style={[styles.sub, { color: t.textMuted, fontFamily: FF.regular }]}>
              Status: {vehicle.status ?? '—'}
            </Text>
            <Text style={[styles.sub, { color: t.textMuted, fontFamily: FF.regular }]}>
              Speed: {speedLabel}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={{ color: t.textMuted, fontFamily: FF.semibold, fontSize: 14 }}>✕</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
  },
});
