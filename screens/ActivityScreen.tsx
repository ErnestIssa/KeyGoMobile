import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { ApiError, listMyTrips, type Trip } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

export function ActivityScreen() {
  const { t } = useTheme();
  const [items, setItems] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listMyTrips();
        if (!cancelled) setItems(res.trips.slice(0, 10));
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load activity');
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
      <Animated.View entering={FadeInDown.duration(240)} style={{ marginBottom: 12 }}>
        <Text style={[styles.title, { color: t.text }]}>Activity</Text>
        <Text style={[styles.sub, { color: t.textMuted }]}>Recent trip updates.</Text>
      </Animated.View>

      {loading ? (
        <Card>
          <Text style={{ color: t.textMuted, textAlign: 'center' }}>Loading…</Text>
        </Card>
      ) : error ? (
        <Card style={{ borderColor: t.danger }}>
          <Text style={{ color: t.danger, fontWeight: '700' }}>{error}</Text>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <Text style={{ color: t.textMuted, textAlign: 'center' }}>No activity yet.</Text>
        </Card>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 25).duration(220)}>
              <Card>
                <Text style={{ color: t.text, fontWeight: '800' }} numberOfLines={2}>
                  {item.pickupLocation} → {item.dropoffLocation}
                </Text>
                <Text style={{ color: t.textMuted, marginTop: 8 }}>Status: {item.status}</Text>
              </Card>
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

