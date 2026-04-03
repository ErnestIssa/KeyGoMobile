import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSyncGlobalLoading } from '../context/LoadingOverlayContext';
import { useContentTopInset, useFloatingTabBarBottomInset } from '../navigation/floatingTabBar';
import type { AppTabParamList, MyTripsStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { hapticLight } from '../services/haptics';
import { ApiError, listMyTrips, type Trip } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

function scrollContentPad(scrollPad: number, topInset: number) {
  return {
    paddingTop: topInset,
    paddingHorizontal: 16,
    paddingBottom: scrollPad,
    flexGrow: 1 as const,
  };
}

export function MyTripsScreen() {
  const { t } = useTheme();
  const { user } = useAuth();
  const topInset = useContentTopInset();
  const scrollPad = useFloatingTabBarBottomInset();
  const navigation = useNavigation<NativeStackNavigationProp<MyTripsStackParamList>>();
  const tabNav = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
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
        const res = await listMyTrips();
        if (!cancelled) setTrips(res.trips);
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
          <Text style={[styles.title, { color: t.canvasText }]}>My trips</Text>
          <Text style={[styles.sub, { color: t.canvasTextMuted }]}>Requests you posted or trips you’re driving.</Text>
        </Animated.View>
      </View>
    ),
    [topInset, t.canvasText, t.canvasTextMuted]
  );

  if (loading) {
    return (
      <ScreenContainer align="stretch" scrollable={false}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={scrollContentPad(scrollPad, topInset)}
          keyboardShouldPersistTaps="handled"
        >
          <ListHeader />
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
          <Card style={{ borderColor: t.danger }}>
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
          <Card
            style={{
              alignItems: 'center',
              paddingVertical: 28,
              paddingHorizontal: 22,
              borderWidth: 1,
              borderColor: t.border,
              shadowColor: t.shadowLg,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.2,
              shadowRadius: 28,
              elevation: 12,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: t.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Text style={{ fontSize: 26 }}>🗺</Text>
            </View>
            <Text style={{ color: t.text, fontWeight: '900', fontSize: 18, textAlign: 'center' }}>No trips yet</Text>
            <Text style={{ color: t.textMuted, textAlign: 'center', marginTop: 10, lineHeight: 22, fontSize: 14 }}>
              When you post a request or accept a drive, your trips show up here with status and payout details.
            </Text>
            <View style={{ height: 20 }} />
            <Button
              variant="primary"
              onPress={() => {
                void hapticLight();
                if (user?.role === 'owner') {
                  tabNav.navigate('Action', { screen: 'Create' });
                } else {
                  tabNav.navigate('Action', { screen: 'Browse' });
                }
              }}
            >
              {user?.role === 'owner' ? 'Create a trip' : 'Browse available trips'}
            </Button>
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
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 28).duration(220)}>
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
