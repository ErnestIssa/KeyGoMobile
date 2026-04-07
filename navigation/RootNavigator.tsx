import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BrandedLoading } from '../components/ui/BrandedLoading';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';

export function RootNavigator() {
  const { user, ready, bootstrapStats } = useAuth();
  const { t, ready: themeReady } = useTheme();
  const bootDone = ready && themeReady;

  /** Full marketing rotation finished at least once (required before Login/Register when not signed in). */
  const [authMarketingCycleDone, setAuthMarketingCycleDone] = useState(false);
  const prevUserRef = useRef<typeof user>(undefined);

  useEffect(() => {
    if (prevUserRef.current != null && user == null) {
      setAuthMarketingCycleDone(false);
    }
    prevUserRef.current = user;
  }, [user]);

  const mustShowAuthBootstrap =
    !bootDone || (bootDone && user == null && !authMarketingCycleDone);

  if (!mustShowAuthBootstrap) {
    if (user != null) {
      return <AppTabs />;
    }
    return <AuthStack />;
  }

  return (
    <View style={[styles.boot, { backgroundColor: t.bgPage }]}>
      <BrandedLoading
        fullscreen
        stats={bootstrapStats}
        showMarketingLines
        onMarketingCycleComplete={() => setAuthMarketingCycleDone(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
