import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { useContentTopInset, useFloatingTabBarBottomInset } from '../navigation/floatingTabBar';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeContext';
import { hapticError, hapticSuccess } from '../services/haptics';
import { friendlyErrorMessage } from '../lib/userFacingError';
import { createTrip } from '../services/api';
import { playNotify, playSuccess } from '../services/sounds';

export function CreateTripScreen() {
  const { t } = useTheme();
  const topInset = useContentTopInset();
  const scrollPad = useFloatingTabBarBottomInset();
  const navigation = useNavigation();
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [carDescription, setCarDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const amount = Number(paymentAmount);
      await createTrip({
        pickupLocation,
        dropoffLocation,
        carDescription,
        paymentAmount: amount,
      });
      await hapticSuccess();
      void playSuccess();
      navigation.getParent()?.navigate('MyTrips', { screen: 'MyTripsList' });
    } catch (e) {
      void hapticError();
      void playNotify();
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: topInset,
            paddingHorizontal: 16,
            paddingBottom: scrollPad,
          }}
        >
        <Animated.View entering={FadeInDown.duration(280)} style={{ marginBottom: 12 }}>
          <Text style={[styles.kicker, { color: t.accent }]}>For owners</Text>
          <Text style={[styles.title, { color: t.canvasText }]}>Create a trip</Text>
          <Text style={[styles.sub, { color: t.canvasTextMuted }]}>Vehicle relocation only (no passengers).</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(280)}>
          <Card>
            <Text style={[styles.label, { color: t.textMuted }]}>Pickup location</Text>
            <Input value={pickupLocation} onChangeText={setPickupLocation} placeholder="e.g. Stockholm" />
            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: t.textMuted }]}>Dropoff location</Text>
            <Input value={dropoffLocation} onChangeText={setDropoffLocation} placeholder="e.g. Uppsala" />
            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: t.textMuted }]}>Vehicle details</Text>
            <Input value={carDescription} onChangeText={setCarDescription} placeholder="e.g. Blue Volvo V60, automatic" />
            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: t.textMuted }]}>Payment amount</Text>
            <Input value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" placeholder="0" />

            {error ? <Text style={[styles.error, { color: t.textMuted }]}>{error}</Text> : null}

            <View style={{ height: 14 }} />
            <Button onPress={onSubmit} disabled={loading} loading={loading}>
              Post trip
            </Button>
          </Card>
        </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  error: {
    marginTop: 12,
    fontWeight: '700',
  },
});
