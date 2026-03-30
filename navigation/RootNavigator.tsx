import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';

export function RootNavigator() {
  const { user, ready } = useAuth();
  const { t, ready: themeReady } = useTheme();

  if (!ready || !themeReady) {
    return (
      <View style={[styles.boot, { backgroundColor: t.bgPage }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return user == null ? <AuthStack /> : <AppStack />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
