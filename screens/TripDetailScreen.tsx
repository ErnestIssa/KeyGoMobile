import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../navigation/types';
import { acceptTrip, ApiError, completeTrip, getTrip, type Trip } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

type Props = NativeStackScreenProps<AppStackParamList, 'TripDetail'>;

export function TripDetailScreen({ route, navigation }: Props) {
  const { t } = useTheme();
  const { user } = useAuth();
  const { id } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getTrip(id);
        if (!cancelled) setTrip(res.trip);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Could not load trip');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (trip?.pickupLocation && trip?.dropoffLocation) {
      navigation.setOptions({ title: 'Trip' });
    }
  }, [navigation, trip?.pickupLocation, trip?.dropoffLocation]);

  const canAccept = useMemo(() => user?.role === 'driver' && trip?.status === 'pending', [user?.role, trip?.status]);
  const canComplete = useMemo(
    () => user?.role === 'owner' && trip?.status === 'accepted',
    [user?.role, trip?.status]
  );

  const doAccept = async () => {
    Alert.alert('Accept trip', 'Do you want to accept this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        style: 'default',
        onPress: async () => {
          try {
            const res = await acceptTrip(id);
            setTrip(res.trip);
          } catch (e) {
            Alert.alert('Error', e instanceof ApiError ? e.message : 'Could not accept trip');
          }
        },
      },
    ]);
  };

  const doComplete = async () => {
    Alert.alert('Complete trip', 'Mark this trip as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        style: 'default',
        onPress: async () => {
          try {
            const res = await completeTrip(id);
            setTrip(res.trip);
          } catch (e) {
            Alert.alert('Error', e instanceof ApiError ? e.message : 'Could not complete trip');
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer align="stretch">
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ color: t.textMuted, marginTop: 10 }}>Loading…</Text>
        </View>
      ) : error ? (
        <Card style={{ borderColor: t.danger }}>
          <Text style={{ color: t.danger, fontWeight: '700' }}>{error}</Text>
        </Card>
      ) : !trip ? (
        <Card>
          <Text style={{ color: t.textMuted }}>Trip not found.</Text>
        </Card>
      ) : (
        <Animated.View entering={FadeInDown.duration(240)}>
          <Card>
            <Text style={[styles.route, { color: t.text }]}>
              {trip.pickupLocation} → {trip.dropoffLocation}
            </Text>
            <Text style={[styles.meta, { color: t.textMuted }]}>{trip.carDescription}</Text>
            <Text style={[styles.meta, { color: t.textMuted }]}>
              <Text style={{ color: t.brand, fontWeight: '800' }}>${trip.paymentAmount}</Text>
              <Text style={{ opacity: 0.6 }}> · </Text>
              Status: {trip.status}
            </Text>

            <View style={{ height: 14 }} />
            {canAccept ? (
              <Button onPress={() => void doAccept()}>Accept trip</Button>
            ) : null}
            {canComplete ? (
              <Button onPress={() => void doComplete()}>Mark complete</Button>
            ) : null}
            {!canAccept && !canComplete ? (
              <Button variant="secondary" onPress={() => navigation.goBack()}>
                Back
              </Button>
            ) : null}
          </Card>
        </Animated.View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  route: {
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    marginTop: 10,
    fontSize: 14,
  },
});

