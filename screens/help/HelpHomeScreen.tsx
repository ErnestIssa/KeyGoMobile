import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/ui/Button';
import type { ProfileStackParamList } from '../../navigation/types';
import { HELP_TOPICS, type HelpTopicId } from './helpContent';
import { hapticLight } from '../../services/haptics';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import { radii } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'HelpHome'>;

const TOPIC_ICONS: Record<HelpTopicId, keyof typeof Ionicons.glyphMap> = {
  trips: 'car-outline',
  account_app: 'person-circle-outline',
  payments: 'wallet-outline',
  guides: 'book-outline',
  lost_items: 'search-outline',
  incomplete_relocation: 'alert-circle-outline',
  safety: 'shield-checkmark-outline',
  accessibility: 'accessibility-outline',
  legal: 'document-text-outline',
  privacy: 'lock-closed-outline',
  diagnostics: 'bug-outline',
  map_issues: 'map-outline',
};

export function HelpHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTheme();

  return (
    <ScreenContainer align="stretch" scrollable>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Help</Text>
        <View style={{ width: 56 }} />
      </Animated.View>

      <Text style={[styles.lead, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
        Find answers by topic, or message support directly — no category required.
      </Text>

      <Button
        onPress={() => {
          void hapticLight();
          navigation.navigate('Inbox', {});
        }}
        fullWidth
        style={{ marginBottom: 16 }}
      >
        Open inbox
      </Button>

      <View style={styles.grid}>
        {HELP_TOPICS.map((topic, i) => (
          <Pressable
            key={topic.id}
            onPress={() => {
              void hapticLight();
              navigation.navigate('HelpTopic', { topicId: topic.id });
            }}
            style={({ pressed }) => [
              styles.tile,
              {
                backgroundColor: t.bgElevated,
                borderColor: t.border,
                shadowColor: t.shadow,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <View style={[styles.tileIcon, { backgroundColor: t.brandSoft }]}>
              <Ionicons name={TOPIC_ICONS[topic.id]} size={26} color={t.brand} />
            </View>
            <Text style={[styles.tileTitle, { color: t.text, fontFamily: FF.bold }]} numberOfLines={2}>
              {topic.title}
            </Text>
            <Text style={[styles.tileSub, { color: t.textMuted, fontFamily: FF.regular }]} numberOfLines={3}>
              {topic.summary}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backHit: { paddingVertical: 8, paddingHorizontal: 4, minWidth: 56 },
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  lead: { fontSize: 14, lineHeight: 21, marginBottom: 14, textAlign: 'center', paddingHorizontal: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  tile: {
    width: '48%',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    minHeight: 140,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: { fontSize: 14, marginBottom: 6, lineHeight: 18 },
  tileSub: { fontSize: 11, lineHeight: 15 },
});
