import { StyleSheet, View } from 'react-native';
import { BrandedLoading } from '../components/ui/BrandedLoading';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';

export function RootNavigator() {
  const { user, ready } = useAuth();
  const { t, ready: themeReady } = useTheme();
  const bootDone = ready && themeReady;

  /** Session + theme init only — logo, no copy. Logout goes straight to auth; no marketing gate. */
  if (!bootDone) {
    return (
      <View style={[styles.boot, { backgroundColor: t.bgPage }]}>
        <BrandedLoading fullscreen minimal />
      </View>
    );
  }

  if (user != null) {
    return <AppTabs />;
  }
  return <AuthStack />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
