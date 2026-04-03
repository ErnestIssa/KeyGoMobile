import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useSyncGlobalLoading } from '../context/LoadingOverlayContext';
import { hapticError, hapticMedium, hapticSuccess } from '../services/haptics';
import { acceptTrip, ApiError, completeTrip, getTrip, type Trip } from '../services/api';
import { playNotify, playSuccess } from '../services/sounds';
import { useTheme } from '../theme/ThemeContext';

type TripDetailNav = {
  TripDetail: { id: string };
};

type Props = NativeStackScreenProps<TripDetailNav, 'TripDetail'>;

export function TripDetailScreen({ route, navigation }: Props) {
  const { t } = useTheme();
  const { user } = useAuth();
  const { id } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSyncGlobalLoading(loading);

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

  const doAccept = () => {
    Alert.alert('Accept trip', 'Do you want to accept this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        style: 'default',
        onPress: () => {
          void (async () => {
            try {
              const res = await acceptTrip(id);
              setTrip(res.trip);
              await hapticMedium();
              await hapticSuccess();
              void playSuccess();
            } catch (e) {
              void hapticError();
              void playNotify();
              Alert.alert('Error', e instanceof ApiError ? e.message : 'Could not accept trip');
            }
          })();
        },
      },
    ]);
  };

  const doComplete = () => {
    Alert.alert('Complete trip', 'Mark this trip as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        style: 'default',
        onPress: () => {
          void (async () => {
            try {
              const res = await completeTrip(id);
              setTrip(res.trip);
              await hapticMedium();
              await hapticSuccess();
              void playSuccess();
            } catch (e) {
              void hapticError();
              void playNotify();
              Alert.alert('Error', e instanceof ApiError ? e.message : 'Could not complete trip');
            }
          })();
        },
      },
    ]);
  };

  return (
    <ScreenContainer align="stretch">
      {loading ? (
        <View style={{ minHeight: 240 }} accessibilityElementsHidden />
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

            {user?.role === 'driver' && trip.status === 'pending' && trip.owner?.id === user.id ? (
              <Text style={[styles.hint, { color: t.textMuted }]}>
                This is your own request — another driver can accept it.
              </Text>
            ) : null}

            <View style={{ height: 14 }} />
            {trip.allowedActions?.accept ? <Button onPress={doAccept}>Accept trip</Button> : null}
            {trip.allowedActions?.complete ? <Button onPress={doComplete}>Mark complete</Button> : null}
            {!trip.allowedActions?.accept && !trip.allowedActions?.complete ? (
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
  route: {
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    marginTop: 10,
    fontSize: 14,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
  },
});
