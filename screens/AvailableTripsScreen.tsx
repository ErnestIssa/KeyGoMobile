import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeContext';
import { ApiError, getJobs, type Trip } from '../services/api';
import { useNavigation } from '@react-navigation/native';

export function AvailableTripsScreen() {
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

  return (
    <ScreenContainer align="stretch">
      <Animated.View entering={FadeInDown.duration(280)} style={{ marginBottom: 12 }}>
        <Text style={[styles.kicker, { color: t.accent }]}>For drivers</Text>
        <Text style={[styles.title, { color: t.text }]}>Available trips</Text>
        {!loading && !error ? (
          <Text style={[styles.sub, { color: t.textMuted }]}>
            {trips.length} open {trips.length === 1 ? 'request' : 'requests'}
          </Text>
        ) : null}
      </Animated.View>

      {loading ? (
        <View style={styles.skeletonGrid} aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.skeleton,
                { backgroundColor: t.bgSubtle, borderColor: t.border },
              ]}
            />
          ))}
        </View>
      ) : error ? (
        <Card style={{ borderColor: t.danger, backgroundColor: 'transparent' }}>
          <Text style={{ color: t.danger, fontWeight: '700' }}>{error}</Text>
        </Card>
      ) : trips.length === 0 ? (
        <Card>
          <Text style={{ color: t.textMuted, textAlign: 'center', paddingVertical: 8 }}>
            Nothing open right now — check again soon.
          </Text>
        </Card>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(240)}>
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
                  <Text style={{ color: t.brand, marginTop: 10, fontWeight: '800' }}>
                    View details →
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
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skeleton: {
    height: 110,
    borderRadius: 20,
    borderWidth: 1,
    width: '48%',
  },
});

