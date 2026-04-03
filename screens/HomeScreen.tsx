import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { AppTabParamList } from '../navigation/types';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user } = useAuth();
  const { t } = useTheme();

  return (
    <ScreenContainer align="stretch">
      <Animated.View entering={FadeInDown.duration(320)} style={styles.hero}>
        <Text style={[styles.kicker, { color: t.accent, fontFamily: FF.semibold }]}>Overview</Text>
        <Text style={[styles.h1, { color: t.canvasText, fontFamily: FF.bold }]}>Hello, {user?.name}</Text>
        <Text style={[styles.lede, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
          KeyGo helps move your <Text style={{ color: t.canvasText, fontFamily: FF.extrabold }}>car</Text> when you can’t drive it
          yourself — <Text style={{ color: t.canvasText, fontFamily: FF.extrabold }}>vehicle only</Text>.
        </Text>
        <Text style={[styles.roleLine, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
          Signed in as <Text style={{ color: t.canvasText, fontFamily: FF.extrabold }}>{user?.role}</Text>.
        </Text>
      </Animated.View>

      <View style={styles.grid}>
        {user?.role === 'owner' ? (
          <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.cardWrap}>
            <Card>
              <Text style={[styles.cardTitle, { color: t.text, fontFamily: FF.bold }]}>Need your car moved?</Text>
              <Text style={[styles.cardBody, { color: t.textMuted, fontFamily: FF.regular }]}>
                Post pickup, dropoff, and vehicle details. A driver accepts and relocates the vehicle only.
              </Text>
              <View style={{ height: 12 }} />
              <Button
                onPress={() => {
                  navigation.navigate('Action', { screen: 'Create' });
                }}
              >
                Create a trip
              </Button>
            </Card>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.cardWrap}>
            <Card>
              <Text style={[styles.cardTitle, { color: t.text, fontFamily: FF.bold }]}>Relocate vehicles</Text>
              <Text style={[styles.cardBody, { color: t.textMuted, fontFamily: FF.regular }]}>
                Browse open requests and accept trips you can complete (vehicle only, A → B).
              </Text>
              <View style={{ height: 12 }} />
              <Button
                onPress={() => {
                  navigation.navigate('Action', { screen: 'Browse' });
                }}
              >
                View available trips
              </Button>
            </Card>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(80).duration(280)} style={styles.cardWrap}>
          <Card>
            <Text style={[styles.cardTitle, { color: t.text, fontFamily: FF.bold }]}>Your trips</Text>
            <Text style={[styles.cardBody, { color: t.textMuted, fontFamily: FF.regular }]}>
              Requests you posted or trips you’re driving.
            </Text>
            <View style={{ height: 12 }} />
            <Button
              variant="secondary"
              onPress={() => {
                navigation.navigate('MyTrips', { screen: 'MyTripsList' });
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
  hero: {
    marginBottom: 14,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  h1: {
    fontSize: 28,
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
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
