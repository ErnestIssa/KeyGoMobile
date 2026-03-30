import { useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BlobsBackground } from '../components/BlobsBackground';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

export function HomeScreen() {
  const navigation = useNavigation();
  const { signOut, user } = useAuth();
  const { t } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => void signOut()} hitSlop={12} accessibilityRole="button">
          <Text style={[styles.signOut, { color: t.brand }]}>Log out</Text>
        </Pressable>
      ),
    });
  }, [navigation, signOut, t.brand]);

  return (
    <ScreenContainer align="stretch">
      <BlobsBackground />
      <Animated.View entering={FadeInDown.duration(320)} style={styles.hero}>
        <Text style={[styles.kicker, { color: t.accent }]}>Overview</Text>
        <Text style={[styles.h1, { color: t.text }]}>Hello, {user?.name}</Text>
        <Text style={[styles.lede, { color: t.textMuted }]}>
          KeyGo helps move your <Text style={{ color: t.text, fontWeight: '800' }}>car</Text> when you can’t drive it
          yourself — <Text style={{ color: t.text, fontWeight: '800' }}>vehicle only</Text>.
        </Text>
        <Text style={[styles.roleLine, { color: t.textMuted }]}>
          Signed in as <Text style={{ color: t.text, fontWeight: '800' }}>{user?.role}</Text>.
        </Text>
      </Animated.View>

      <View style={styles.grid}>
        {user?.role === 'owner' ? (
          <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.cardWrap}>
            <Card>
              <Text style={[styles.cardTitle, { color: t.text }]}>Need your car moved?</Text>
              <Text style={[styles.cardBody, { color: t.textMuted }]}>
                Post pickup, dropoff, and vehicle details. A driver accepts and relocates the vehicle only.
              </Text>
              <View style={{ height: 12 }} />
              <Button
                onPress={() => {
                  // jump to center Action tab (Create)
                  // @ts-expect-error: runtime navigation works across nested navigators
                  navigation.navigate('Tabs', { screen: 'Action' });
                }}
              >
                Create a trip
              </Button>
            </Card>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.cardWrap}>
            <Card>
              <Text style={[styles.cardTitle, { color: t.text }]}>Relocate vehicles</Text>
              <Text style={[styles.cardBody, { color: t.textMuted }]}>
                Browse open requests and accept trips you can complete (vehicle only, A → B).
              </Text>
              <View style={{ height: 12 }} />
              <Button
                onPress={() => {
                  // @ts-expect-error: runtime navigation works across nested navigators
                  navigation.navigate('Tabs', { screen: 'Action' });
                }}
              >
                View available trips
              </Button>
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(80).duration(280)} style={styles.cardWrap}>
          <Card>
            <Text style={[styles.cardTitle, { color: t.text }]}>Your trips</Text>
            <Text style={[styles.cardBody, { color: t.textMuted }]}>Requests you posted or trips you’re driving.</Text>
            <View style={{ height: 12 }} />
            <Button
              variant="secondary"
              onPress={() => {
                // @ts-expect-error: runtime navigation works across nested navigators
                navigation.navigate('Tabs', { screen: 'MyTrips' });
              }}
            >
              Open my trips
            </Button>
          </Card>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  signOut: {
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    marginBottom: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  h1: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  lede: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  roleLine: {
    marginTop: 8,
    fontSize: 14,
  },
  grid: {
    gap: 12,
  },
  cardWrap: {
    width: '100%',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
