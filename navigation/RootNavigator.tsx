import { StyleSheet, View } from 'react-native';
import { BrandedLoading } from '../components/ui/BrandedLoading';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';

export function RootNavigator() {
  const { user, ready, bootstrapStats } = useAuth();
  const { t, ready: themeReady } = useTheme();

  if (!ready || !themeReady) {
    return (
      <View style={[styles.boot, { backgroundColor: t.bgPage }]}>
        <BrandedLoading fullscreen stats={bootstrapStats} />
      </View>
    );
  }

  return user == null ? <AuthStack /> : <AppTabs />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
