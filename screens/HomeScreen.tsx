import { StyleSheet, View } from 'react-native';
import { HomeMapChrome } from '../components/map/HomeMapChrome';
import { useTheme } from '../theme/ThemeContext';

/**
 * Home tab: full-screen map host (Mapbox to be mounted inside `HomeMapChrome`).
 * Quick actions live on other tabs; overlay slots are reserved for future map UI.
 */
export function HomeScreen() {
  const { t } = useTheme();

  return (
    <View style={[styles.fill, { backgroundColor: t.bgPage }]}>
      <HomeMapChrome />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
