import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BlurModalScrim } from '../../components/ui/BlurModalScrim';
import { Card } from '../../components/ui/Card';
import { ThemedSwitch } from '../../components/ui/ThemedSwitch';
import { useAuth } from '../../context/AuthContext';
import type { AppSettings } from '../../types/appSettings';
import type { ProfileStackParamList } from '../../navigation/types';
import { patchUserSettings } from '../../services/api';
import { friendlyErrorMessage } from '../../lib/userFacingError';
import { hapticLight, hapticSelection } from '../../services/haptics';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import { radii } from '../../theme/tokens';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'SafetyHome'>;

function defaultSafety(): AppSettings['safety'] {
  return {
    pinVerificationEnabled: true,
    followMyTripEnabled: false,
    tripCheckNotificationsEnabled: true,
  };
}

const INFO = {
  pin: {
    title: 'PIN verification',
    body:
      'When enabled, KeyGo can prompt you to confirm a short code with the other party before handoff so you know you are meeting the right driver or owner. Codes are generated for active trips and expire when the trip ends.',
  },
  follow: {
    title: 'Follow my trip',
    body:
      'Let trusted contacts follow along with your live location and trip status on a secure link. You can send the link from an active trip — recipients do not need the app. Turn this on to allow sharing when you choose.',
  },
  tripCheck: {
    title: 'TripCheck',
    body:
      'Ride-style check notifications: reminders before pickup, alerts if the route deviates unusually, and optional check-in prompts during relocation. Tune these to stay aware without noise.',
  },
} as const;

export function SafetyHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const safety = user?.appSettings?.safety ?? defaultSafety();

  const [prefsOpen, setPrefsOpen] = useState(true);
  const [resOpen, setResOpen] = useState(true);
  const [infoKey, setInfoKey] = useState<keyof typeof INFO | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pin, setPin] = useState(safety.pinVerificationEnabled);
  const [follow, setFollow] = useState(safety.followMyTripEnabled);
  const [tripCheck, setTripCheck] = useState(safety.tripCheckNotificationsEnabled);

  const persist = useCallback(
    async (next: Partial<AppSettings['safety']>) => {
      setErr(null);
      setBusy(true);
      try {
        const { user: u } = await patchUserSettings({ safety: next });
        await updateUser(u);
      } catch (e) {
        setErr(friendlyErrorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [updateUser]
  );

  const isDriver = user?.role === 'driver';

  const GroupHeader = ({
    title,
    open,
    onToggle,
  }: {
    title: string;
    open: boolean;
    onToggle: () => void;
  }) => (
    <Pressable
      onPress={() => {
        void hapticLight();
        onToggle();
      }}
      style={({ pressed }) => [styles.groupHead, pressed && { opacity: 0.88 }]}
    >
      <Text style={[styles.groupTitle, { color: t.canvasText, fontFamily: FF.bold }]}>{title}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={t.textMuted} />
    </Pressable>
  );

  const PrefRow = ({
    title,
    subtitle,
    value,
    onValue,
    info,
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onValue: (v: boolean) => void;
    info: keyof typeof INFO;
  }) => (
    <View style={[styles.prefRow, { borderBottomColor: t.border }]}>
      <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
        <Text style={[styles.prefTitle, { color: t.text, fontFamily: FF.semibold }]}>{title}</Text>
        <Text style={[styles.prefSub, { color: t.textMuted, fontFamily: FF.regular }]} numberOfLines={3}>
          {subtitle}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          void hapticLight();
          setInfoKey(info);
        }}
        hitSlop={10}
        style={styles.infoHit}
      >
        <Ionicons name="information-circle-outline" size={26} color={t.brand} />
      </Pressable>
      <ThemedSwitch
        value={value}
        disabled={busy}
        onValueChange={(v) => {
          void hapticSelection();
          onValue(v);
        }}
      />
    </View>
  );

  return (
    <ScreenContainer align="stretch" scrollable>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
          <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Safety</Text>
        <View style={{ width: 56 }} />
      </Animated.View>

      {err ? (
        <Text style={{ color: t.danger, fontFamily: FF.regular, marginBottom: 8 }}>{err}</Text>
      ) : null}

      <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
        <GroupHeader title="Preferences & controls" open={prefsOpen} onToggle={() => setPrefsOpen((o) => !o)} />
        {prefsOpen ? (
          <View style={{ paddingHorizontal: 4, paddingBottom: 8 }}>
            <PrefRow
              title="PIN verification"
              subtitle="Confirm you have the right driver or owner before handoff."
              value={pin}
              info="pin"
              onValue={async (v) => {
                setPin(v);
                await persist({
                  pinVerificationEnabled: v,
                  followMyTripEnabled: follow,
                  tripCheckNotificationsEnabled: tripCheck,
                });
              }}
            />
            <PrefRow
              title="Follow my trip"
              subtitle="Share a live link with friends and family when you choose."
              value={follow}
              info="follow"
              onValue={async (v) => {
                setFollow(v);
                await persist({
                  pinVerificationEnabled: pin,
                  followMyTripEnabled: v,
                  tripCheckNotificationsEnabled: tripCheck,
                });
              }}
            />
            <PrefRow
              title="TripCheck"
              subtitle="Ride check notifications and related alerts."
              value={tripCheck}
              info="tripCheck"
              onValue={async (v) => {
                setTripCheck(v);
                await persist({
                  pinVerificationEnabled: pin,
                  followMyTripEnabled: follow,
                  tripCheckNotificationsEnabled: v,
                });
              }}
            />
          </View>
        ) : null}
      </Card>

      <View style={{ height: 14 }} />

      <Card style={{ paddingVertical: 0, overflow: 'hidden' }}>
        <GroupHeader title="Resources" open={resOpen} onToggle={() => setResOpen((o) => !o)} />
        {resOpen ? (
          <View style={{ paddingBottom: 4 }}>
            <ResourceRow
              icon="school-outline"
              title="Learning centre — safety tips"
              subtitle="Guides and best practices for smooth relocations."
              t={t}
              onPress={() => navigation.navigate('SafetyResource', { kind: 'learning' })}
            />
            <ResourceRow
              icon="shield-checkmark-outline"
              title="Insurance"
              subtitle="Coverage, claims, and what to verify before a trip."
              t={t}
              onPress={() => navigation.navigate('SafetyResource', { kind: 'insurance' })}
            />
            <ResourceRow
              icon="car-sport-outline"
              title="Driver safety"
              subtitle={isDriver ? 'Checklists and on-road habits for drivers.' : 'Switch to Driver mode in Profile to unlock.'}
              t={t}
              disabled={!isDriver}
              onPress={() => {
                if (isDriver) navigation.navigate('SafetyResource', { kind: 'driver' });
              }}
            />
          </View>
        ) : null}
      </Card>

      <BlurModalScrim visible={infoKey != null} onRequestClose={() => setInfoKey(null)}>
        <View style={[styles.infoCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          {infoKey ? (
            <>
              <Text style={[styles.infoTitle, { color: t.text, fontFamily: FF.bold }]}>{INFO[infoKey].title}</Text>
              <Text style={[styles.infoBody, { color: t.textMuted, fontFamily: FF.regular }]}>{INFO[infoKey].body}</Text>
            </>
          ) : null}
          <Pressable
            onPress={() => setInfoKey(null)}
            style={[styles.infoClose, { backgroundColor: t.brand }]}
          >
            <Text style={{ color: '#fff', fontFamily: FF.semibold, textAlign: 'center' }}>Got it</Text>
          </Pressable>
        </View>
      </BlurModalScrim>
    </ScreenContainer>
  );
}

function ResourceRow({
  icon,
  title,
  subtitle,
  t,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  t: ReturnType<typeof useTheme>['t'];
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.resRow,
        { borderBottomColor: t.border, opacity: disabled ? 0.45 : 1 },
        pressed && !disabled && { backgroundColor: t.bgSubtle },
      ]}
    >
      <View style={[styles.resIcon, { backgroundColor: t.brandSoft }]}>
        <Ionicons name={icon} size={22} color={t.brand} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.prefTitle, { color: t.text, fontFamily: FF.semibold }]}>{title}</Text>
        <Text style={[styles.prefSub, { color: t.textMuted, fontFamily: FF.regular }]} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
    </Pressable>
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
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  groupTitle: { fontSize: 15 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  prefTitle: { fontSize: 15 },
  prefSub: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  infoHit: { padding: 4 },
  resRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    maxWidth: 360,
    width: '100%',
  },
  infoTitle: { fontSize: 18, marginBottom: 10 },
  infoBody: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  infoClose: { paddingVertical: 12, borderRadius: 12 },
});
