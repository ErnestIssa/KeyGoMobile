import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import type { LiveRelocationMapMarker } from '../../hooks/useTripLiveTracking';

type Props = {
  marker: LiveRelocationMapMarker;
  accentColor: string;
  mutedColor: string;
};

/**
 * Top-down car + person pin — rotation follows `headingDeg` (map bearing, deg clockwise from north).
 */
export function MapLiveRelocationMarkerView({ marker, accentColor, mutedColor }: Props) {
  const rot =
    marker.kind === 'car' && marker.headingDeg != null && !Number.isNaN(marker.headingDeg)
      ? marker.headingDeg
      : 0;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.rotate, { transform: [{ rotate: `${rot}deg` }] }]}>
        {marker.kind === 'car' ? (
          <TopDownCarSvg accent={accentColor} outline={mutedColor} />
        ) : (
          <PersonPinSvg accent={accentColor} outline={mutedColor} />
        )}
      </View>
    </View>
  );
}

const S = 44;

function TopDownCarSvg({ accent, outline }: { accent: string; outline: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 48 48">
      <G>
        {/* Body */}
        <Path
          d="M24 6 L38 18 L38 30 L24 42 L10 30 L10 18 Z"
          fill={accent}
          fillOpacity={0.92}
          stroke={outline}
          strokeWidth={1.35}
          strokeLinejoin="round"
        />
        {/* Windshield (front = top of SVG / forward) */}
        <Path d="M18 14 L24 10 L30 14 L28 22 L20 22 Z" fill="#ffffff" fillOpacity={0.55} />
        {/* Rear */}
        <Path d="M20 30 L24 34 L28 30 L27 26 L21 26 Z" fill={outline} fillOpacity={0.35} />
        {/* Center hub */}
        <Circle cx={24} cy={24} r={2.2} fill={outline} fillOpacity={0.5} />
      </G>
    </Svg>
  );
}

function PersonPinSvg({ accent, outline }: { accent: string; outline: string }) {
  return (
    <Svg width={S} height={S} viewBox="0 0 48 48">
      <Path
        d="M24 4 C17 4 12 9 12 16 C12 24 24 40 24 40 C24 40 36 24 36 16 C36 9 31 4 24 4 Z"
        fill={accent}
        fillOpacity={0.95}
        stroke={outline}
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
      <Circle cx={24} cy={16} r={6.5} fill="#ffffff" fillOpacity={0.9} stroke={outline} strokeWidth={0.8} />
      <Circle cx={24} cy={16} r={2.8} fill={accent} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotate: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
