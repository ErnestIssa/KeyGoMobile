import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeContext';
import { ApiError, listMyTrips, type Trip } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export function MyTripsScreen() {
  const { t } = useTheme();
  const navigation = useNavigation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScreenContainer align="stretch">
      <Animated.View entering={FadeInDown.duration(280)} style={{ marginBottom: 12 }}>
        <Text style={[styles.title, { color: t.text }]}>My trips</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>Requests you posted or trips you’re driving.</Text>
      </Animated.View>

      {loading ? (
        <Card>
          <Text style={{ color: t.textMuted, textAlign: 'center' }}>Loading…</Text>
        </Card>
      ) : error ? (
        <Card style={{ borderColor: t.danger }}>
          <Text style={{ color: t.danger, fontWeight: '700' }}>{error}</Text>
        </Card>
      ) : trips.length === 0 ? (
        <Card>
          <Text style={{ color: t.textMuted, textAlign: 'center' }}>No trips yet.</Text>
        </Card>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 35).duration(240)}>
              <Pressable
                onPress={() => {
                  // @ts-expect-error: runtime navigation works across nested stacks
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
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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

