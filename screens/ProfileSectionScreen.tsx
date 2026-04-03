import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/ui/Card';
import type { ProfileStackParamList } from '../navigation/types';
import { hapticLight } from '../services/haptics';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Section'>;

export function ProfileSectionScreen({ navigation, route }: Props) {
  const { t } = useTheme();
  const { title, subtitle } = route.params;

  return (
    <ScreenContainer align="stretch">
      <Animated.View entering={FadeInDown.duration(240)}>
        <Pressable
          onPress={() => {
            void hapticLight();
            navigation.goBack();
          }}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.75 }]}
          hitSlop={12}
        >
          <Text style={[styles.backText, { color: t.brand }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: t.canvasText }]}>{title}</Text>
        <Text style={[styles.sub, { color: t.canvasTextMuted }]}>{subtitle}</Text>
      </Animated.View>

      <View style={{ height: 20 }} />

      <Card>
        <Text style={[styles.body, { color: t.textMuted }]}>
          This area will connect to live data and workflows soon. Use the back control to return to your profile.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 6,
    paddingRight: 12,
  },
  backText: {
    fontSize: 15,
    fontFamily: FF.semibold,
    fontWeight: '600',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
});
