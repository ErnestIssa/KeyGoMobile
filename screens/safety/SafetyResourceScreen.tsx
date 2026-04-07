import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/ui/Card';
import type { ProfileStackParamList } from '../../navigation/types';
import { hapticLight } from '../../services/haptics';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

type R = RouteProp<ProfileStackParamList, 'SafetyResource'>;

const COPY: Record<
  'learning' | 'insurance' | 'driver',
  { title: string; body: string }
> = {
  learning: {
    title: 'Learning centre — safety tips',
    body:
      '• Meet in well-lit public places for key handoffs.\n• Verify the other party’s profile and vehicle before starting.\n• Share trip progress only with people you trust.\n• Report anything unusual from Profile → Help → Safety.\n\nMore structured courses will appear here as we grow the programme.',
  },
  insurance: {
    title: 'Insurance',
    body:
      'KeyGo connects owners and drivers for vehicle relocation — coverage depends on your personal or commercial policies.\n\n• Confirm liability and cargo coverage before accepting a trip.\n• Keep registration and insurance documents in Vehicles / Documents in Profile.\n• For claims, contact your insurer first, then notify us through Help → Inbox.',
  },
  driver: {
    title: 'Driver safety',
    body:
      '• Pre-trip: rest, vehicle walkaround, secure keys and documents.\n• On the road: follow traffic laws; use TripCheck alerts responsibly.\n• Handoff: use PIN verification when enabled to confirm the right owner.\n• If you feel unsafe, end the interaction and contact support.\n\nThis section is tailored for Driver mode.',
  },
};

export function SafetyResourceScreen() {
  const navigation = useNavigation();
  const route = useRoute<R>();
  const { kind } = route.params;
  const { t } = useTheme();
  const c = COPY[kind];

  return (
    <ScreenContainer align="stretch" scrollable>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.header}>
        <Pressable
          onPress={() => {
            void hapticLight();
            navigation.goBack();
          }}
          hitSlop={12}
          style={styles.backHit}
        >
          <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]} numberOfLines={1}>
          {c.title}
        </Text>
        <View style={{ width: 56 }} />
      </Animated.View>
      <Card>
        <Text style={[styles.body, { color: t.text, fontFamily: FF.regular }]}>{c.body}</Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backHit: { paddingVertical: 8, paddingHorizontal: 4, minWidth: 56 },
  headerTitle: { fontSize: 17, flex: 1, textAlign: 'center', fontFamily: FF.bold },
  body: { fontSize: 15, lineHeight: 23 },
});
