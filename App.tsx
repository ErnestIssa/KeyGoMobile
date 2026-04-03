import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { LoadingOverlayProvider } from './context/LoadingOverlayContext';
import { BrandedLoading } from './components/ui/BrandedLoading';
import { RootNavigator } from './navigation/RootNavigator';
import { initSounds } from './services/sounds';
import { ThemeProvider, useTheme } from './theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  useEffect(() => {
    void initSounds();
  }, []);

  if (!fontsLoaded) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <BrandedLoading fullscreen />
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LoadingOverlayProvider>
            <AuthProvider>
              <ThemedApp />
            </AuthProvider>
          </LoadingOverlayProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp() {
  const { theme, t } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor('transparent');
    }
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: t.bgPage }]}>
      <NavigationContainer theme={navTheme(theme)}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} translucent />
    </View>
  );
}

function navTheme(mode: 'light' | 'dark'): NavTheme {
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: 'transparent',
      card: 'transparent',
    },
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
