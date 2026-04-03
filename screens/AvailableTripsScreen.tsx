import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ScreenContainer';
import { useContentTopInset, useFloatingTabBarBottomInset } from '../navigation/floatingTabBar';
import { Card } from '../components/ui/Card';
import { useSyncGlobalLoading } from '../context/LoadingOverlayContext';
import type { ActionStackParamList } from '../navigation/types';
import { hapticLight } from '../services/haptics';
import { ApiError, getJobs, type Trip } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

function scrollContentPad(scrollPad: number, topInset: number) {
  return {
    paddingTop: topInset,
    paddingHorizontal: 16,
    paddingBottom: scrollPad,
    flexGrow: 1 as const,
  };
}

export function AvailableTripsScreen() {
  const { t } = useTheme();
  const topInset = useContentTopInset();
  const scrollPad = useFloatingTabBarBottomInset();
  const navigation = useNavigation<NativeStackNavigationProp<ActionStackParamList>>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSyncGlobalLoading(loading);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getJobs();
        if (!cancelled) setTrips(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load trips');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ListHeader = useCallback(
    () => (
      <View style={{ paddingTop: topInset, marginBottom: 12 }}>
        <Animated.View entering={FadeInDown.duration(280)}>
          <Text style={[styles.kicker, { color: t.accent }]}>For drivers</Text>
          <Text style={[styles.title, { color: t.canvasText }]}>Available trips</Text>
          {!loading && !error ? (
            <Text style={[styles.sub, { color: t.canvasTextMuted }]}>
              {trips.length} open {trips.length === 1 ? 'request' : 'requests'}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    ),
    [topInset, t.accent, t.canvasText, t.canvasTextMuted, loading, error, trips.length]
  );

  if (loading) {
    return (
      <ScreenContainer align="stretch" scrollable={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={scrollContentPad(scrollPad, topInset)}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ marginBottom: 12 }}>
            <Animated.View entering={FadeInDown.duration(280)}>
              <Text style={[styles.kicker, { color: t.accent }]}>For drivers</Text>
              <Text style={[styles.title, { color: t.canvasText }]}>Available trips</Text>
            </Animated.View>
          </View>
          <View style={{ minHeight: 200 }} accessibilityElementsHidden />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer align="stretch" scrollable={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={scrollContentPad(scrollPad, topInset)}
          keyboardShouldPersistTaps="handled"
        >
          <ListHeader />
          <Card style={{ borderColor: t.danger, backgroundColor: 'transparent' }}>
            <Text style={{ color: t.danger, fontWeight: '700' }}>{error}</Text>
          </Card>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (trips.length === 0) {
    return (
      <ScreenContainer align="stretch" scrollable={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={scrollContentPad(scrollPad, topInset)}
          keyboardShouldPersistTaps="handled"
        >
          <ListHeader />
          <Card>
            <Text style={{ color: t.textMuted, textAlign: 'center', paddingVertical: 8 }}>
              Nothing open right now — check again soon.
            </Text>
          </Card>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        style={styles.flex}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingBottom: scrollPad }}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 32).duration(220)}>
            <Pressable
              onPress={() => {
                void hapticLight();
                navigation.navigate('TripDetail', { id: item.id });
              }}
            >
              <Card>
                <Text style={{ color: t.text, fontWeight: '800' }} numberOfLines={2}>
                  {item.pickupLocation} → {item.dropoffLocation}
                </Text>
                <Text style={{ color: t.textMuted, marginTop: 8, fontSize: 12 }}>
                  <Text style={{ color: t.brand, fontWeight: '800' }}>${item.paymentAmount}</Text>
                  <Text style={{ opacity: 0.6 }}> · </Text>
                  Status: {item.status}
                </Text>
                <Text style={{ color: t.brand, marginTop: 10, fontWeight: '800' }}>
                  View details →
                </Text>
              </Card>
            </Pressable>
          </Animated.View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
  },
});
