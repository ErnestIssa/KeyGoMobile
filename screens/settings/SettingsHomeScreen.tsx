import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/ui/Card';
import type { ProfileStackParamList } from '../../navigation/types';
import { hapticLight } from '../../services/haptics';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import { radii } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SettingsHome'>;

type SettingsDestination =
  | 'SettingsManageAccount'
  | 'SettingsPrivacy'
  | 'SettingsAddress'
  | 'SettingsAccessibility'
  | 'SettingsNightMode'
  | 'SettingsShortcuts'
  | 'SettingsCommunication'
  | 'SettingsNavigationPrefs'
  | 'SettingsSoundsVoice';

type Row = {
  key: SettingsDestination;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

const ACCOUNT: Row[] = [
  { key: 'SettingsManageAccount', icon: 'person-circle-outline', title: 'Manage KeyGo account', subtitle: 'Email, account type, organization' },
  { key: 'SettingsPrivacy', icon: 'lock-closed-outline', title: 'Privacy', subtitle: 'Profile visibility and analytics' },
  { key: 'SettingsAddress', icon: 'location-outline', title: 'Edit address', subtitle: 'Handoff and mailing details' },
];

const GENERAL: Row[] = [
  { key: 'SettingsAccessibility', icon: 'accessibility-outline', title: 'Accessibility', subtitle: 'Motion and text' },
  { key: 'SettingsNightMode', icon: 'moon-outline', title: 'Night mode', subtitle: 'Match system or override' },
  { key: 'SettingsShortcuts', icon: 'flash-outline', title: 'Shortcuts', subtitle: 'Quick actions in the app' },
  { key: 'SettingsCommunication', icon: 'chatbubbles-outline', title: 'Communication', subtitle: 'Email, push, SMS' },
  { key: 'SettingsNavigationPrefs', icon: 'navigate-outline', title: 'Navigation', subtitle: 'Preferred maps app' },
  { key: 'SettingsSoundsVoice', icon: 'volume-high-outline', title: 'Sounds & voice', subtitle: 'Message sounds and guidance' },
];

function RowItem({ row, onPress, t, last }: { row: Row; onPress: () => void; t: ReturnType<typeof useTheme>['t']; last?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
        pressed && { backgroundColor: t.bgSubtle },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: t.brandSoft }]}>
        <Ionicons name={row.icon} size={22} color={t.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: t.text, fontFamily: FF.semibold }]}>{row.title}</Text>
        {row.subtitle ? (
          <Text style={[styles.rowSub, { color: t.textMuted, fontFamily: FF.regular }]} numberOfLines={2}>
            {row.subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
    </Pressable>
  );
}

export function SettingsHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTheme();

  return (
    <ScreenContainer align="stretch" scrollable>
      <Animated.View entering={FadeInDown.duration(280)} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Settings</Text>
        <View style={{ width: 56 }} />
      </Animated.View>

      <Text style={[styles.groupLabel, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>Account</Text>
      <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
        {ACCOUNT.map((row, i) => (
          <RowItem
            key={row.key}
            row={row}
            last={i === ACCOUNT.length - 1}
            t={t}
            onPress={() => navigation.navigate(row.key)}
          />
        ))}
      </Card>

      <View style={{ height: 14 }} />

      <Text style={[styles.groupLabel, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>General</Text>
      <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
        {GENERAL.map((row, i) => (
          <RowItem
            key={row.key}
            row={row}
            last={i === GENERAL.length - 1}
            t={t}
            onPress={() => navigation.navigate(row.key)}
          />
        ))}
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
  headerTitle: { fontSize: 20, letterSpacing: -0.3 },
  groupLabel: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 16 },
  rowSub: { fontSize: 13, marginTop: 2, lineHeight: 18 },
});
