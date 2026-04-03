import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Full-bleed stand-in until `@rnmapbox/maps` (or Expo Mapbox) is wired.
 * Replace this component with the real map view — layout shells stay the same.
 */
export function MapPlaceholder() {
  const { t } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.bgSubtle }]} pointerEvents="none">
      <View style={[styles.gridLine, styles.h1, { backgroundColor: t.border }]} />
      <View style={[styles.gridLine, styles.h2, { backgroundColor: t.border }]} />
      <View style={[styles.gridLine, styles.v1, { backgroundColor: t.border }]} />
      <View style={[styles.gridLine, styles.v2, { backgroundColor: t.border }]} />
      <View style={[styles.dot, { backgroundColor: t.brand, opacity: 0.35 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    opacity: 0.25,
  },
  h1: {
    left: '12%',
    right: '12%',
    top: '38%',
    height: StyleSheet.hairlineWidth,
  },
  h2: {
    left: '12%',
    right: '12%',
    top: '62%',
    height: StyleSheet.hairlineWidth,
  },
  v1: {
    top: '18%',
    bottom: '22%',
    left: '35%',
    width: StyleSheet.hairlineWidth,
  },
  v2: {
    top: '18%',
    bottom: '22%',
    right: '35%',
    width: StyleSheet.hairlineWidth,
  },
  dot: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
  },
});
