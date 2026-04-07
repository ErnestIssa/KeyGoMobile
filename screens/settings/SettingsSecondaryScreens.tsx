import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, useColorScheme, View } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { patchUserAddress, patchUserSettings } from '../../services/api';
import { friendlyErrorMessage } from '../../lib/userFacingError';
import { hapticSelection } from '../../services/haptics';
import type { AppSettings, UserAddress } from '../../types/appSettings';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

function ScreenHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  const { t } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
        <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
      </Pressable>
      <Text style={[styles.headerTitle, { color: t.canvasText, fontFamily: FF.bold }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 56 }} />
    </View>
  );
}

function defaultSettings(): AppSettings {
  return {
    privacy: { profileVisibility: 'everyone', shareAnalytics: true },
    accessibility: { reduceMotion: false, boldText: false },
    nightMode: 'system',
    shortcuts: { enabled: true },
    communication: { email: true, push: true, sms: false },
    navigation: { preferredMaps: 'google' },
    soundsVoice: { messageSounds: true, voiceGuidance: false },
    safety: {
      pinVerificationEnabled: true,
      followMyTripEnabled: false,
      tripCheckNotificationsEnabled: true,
    },
  };
}

function defaultAddress(): UserAddress {
  return { line1: '', line2: '', city: '', region: '', postalCode: '', country: '' };
}

export function ManageAccountSettingsScreen() {
  const { user } = useAuth();
  const { t } = useTheme();
  const kind = user?.accountKind === 'organization' ? 'Organization' : 'Individual';
  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Manage account" />
      <Card>
        <Text style={[styles.label, { color: t.textMuted }]}>Email</Text>
        <Text style={[styles.body, { color: t.text }]}>{user?.email ?? '—'}</Text>
        <View style={{ height: 16 }} />
        <Text style={[styles.label, { color: t.textMuted }]}>Account type</Text>
        <Text style={[styles.body, { color: t.text }]}>{kind}</Text>
        {user?.accountKind === 'organization' ? (
          <>
            <View style={{ height: 16 }} />
            <Text style={[styles.label, { color: t.textMuted }]}>Organization</Text>
            <Text style={[styles.body, { color: t.text }]}>{user?.organizationName ?? '—'}</Text>
            {user?.organizationType ? (
              <>
                <View style={{ height: 16 }} />
                <Text style={[styles.label, { color: t.textMuted }]}>Industry / type</Text>
                <Text style={[styles.body, { color: t.text }]}>{user.organizationType}</Text>
              </>
            ) : null}
          </>
        ) : null}
        <Text style={[styles.hint, { color: t.textMuted, marginTop: 16 }]}>
          Role (Owner / Driver) is switched from Profile — one login for both.
        </Text>
      </Card>
    </ScreenContainer>
  );
}

export function PrivacySettingsScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const s = user?.appSettings?.privacy ?? defaultSettings().privacy;
  const [vis, setVis] = useState(s.profileVisibility);
  const [analytics, setAnalytics] = useState(s.shareAnalytics);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = useCallback(async () => {
    setErr(null);
    setBusy(true);
    try {
      const { user: next } = await patchUserSettings({
        privacy: { profileVisibility: vis, shareAnalytics: analytics },
      });
      await updateUser(next);
    } catch (e) {
      setErr(friendlyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [vis, analytics, updateUser]);

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Privacy" />
      <Card>
        <Text style={[styles.label, { color: t.textMuted }]}>Profile visibility</Text>
        {(['everyone', 'drivers_only', 'minimal'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => {
              void hapticSelection();
              setVis(k);
            }}
            style={[styles.optionRow, vis === k && { backgroundColor: t.brandSoft }]}
          >
            <Text style={{ color: t.text, fontFamily: FF.regular }}>
              {k === 'everyone' ? 'Everyone' : k === 'drivers_only' ? 'Drivers only' : 'Minimal'}
            </Text>
            {vis === k ? <Ionicons name="checkmark-circle" size={22} color={t.brand} /> : null}
          </Pressable>
        ))}
        <View style={{ height: 16 }} />
        <View style={styles.switchRow}>
          <Text style={{ color: t.text, fontFamily: FF.regular, flex: 1 }}>Share analytics</Text>
          <Switch
            value={analytics}
            onValueChange={setAnalytics}
            trackColor={{ false: t.bgSubtle, true: t.brandSoft }}
            thumbColor={analytics ? t.brand : t.textMuted}
          />
        </View>
        {err ? <Text style={{ color: t.danger, marginTop: 8 }}>{err}</Text> : null}
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save
        </Button>
      </Card>
    </ScreenContainer>
  );
}

export function AddressSettingsScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const a = user?.address ?? defaultAddress();
  const [line1, setLine1] = useState(a.line1);
  const [line2, setLine2] = useState(a.line2);
  const [city, setCity] = useState(a.city);
  const [region, setRegion] = useState(a.region);
  const [postalCode, setPostalCode] = useState(a.postalCode);
  const [country, setCountry] = useState(a.country);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { user: next } = await patchUserAddress({ line1, line2, city, region, postalCode, country });
      await updateUser(next);
    } catch (e) {
      setErr(friendlyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const inp = (label: string, value: string, onChange: (v: string) => void) => (
    <>
      <Text style={[styles.label, { color: t.textMuted, marginTop: 10 }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholderTextColor={t.textMuted}
        style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.inputSurface }]}
      />
    </>
  );

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Edit address" />
      <Card>
        {inp('Line 1', line1, setLine1)}
        {inp('Line 2', line2, setLine2)}
        {inp('City', city, setCity)}
        {inp('State / region', region, setRegion)}
        {inp('Postal code', postalCode, setPostalCode)}
        {inp('Country', country, setCountry)}
        {err ? <Text style={{ color: t.danger, marginTop: 8 }}>{err}</Text> : null}
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save address
        </Button>
      </Card>
    </ScreenContainer>
  );
}

function BoolRow({
  label,
  value,
  onChange,
  t,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  t: ReturnType<typeof useTheme>['t'];
}) {
  return (
    <View style={styles.switchRow}>
      <Text style={{ color: t.text, fontFamily: FF.regular, flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: t.bgSubtle, true: t.brandSoft }}
        thumbColor={value ? t.brand : t.textMuted}
      />
    </View>
  );
}

export function AccessibilitySettingsScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const s = user?.appSettings?.accessibility ?? defaultSettings().accessibility;
  const [reduceMotion, setReduceMotion] = useState(s.reduceMotion);
  const [boldText, setBoldText] = useState(s.boldText);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { user: next } = await patchUserSettings({
        accessibility: { reduceMotion, boldText },
      });
      await updateUser(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Accessibility" />
      <Card>
        <BoolRow label="Reduce motion" value={reduceMotion} onChange={setReduceMotion} t={t} />
        <View style={{ height: 12 }} />
        <BoolRow label="Bold text (UI hint)" value={boldText} onChange={setBoldText} t={t} />
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save
        </Button>
      </Card>
    </ScreenContainer>
  );
}

export function NightModeSettingsScreen() {
  const { user, updateUser } = useAuth();
  const { setTheme, t } = useTheme();
  const systemScheme = useColorScheme();
  const s = user?.appSettings?.nightMode ?? defaultSettings().nightMode;
  const [mode, setMode] = useState(s);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      if (mode === 'system') {
        setTheme(systemScheme === 'dark' ? 'dark' : 'light');
      } else if (mode === 'light') {
        setTheme('light');
      } else {
        setTheme('dark');
      }
      const { user: next } = await patchUserSettings({ nightMode: mode });
      await updateUser(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Night mode" />
      <Card>
        {(['system', 'light', 'dark'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => {
              void hapticSelection();
              setMode(k);
            }}
            style={[styles.optionRow, mode === k && { backgroundColor: t.brandSoft }]}
          >
            <Text style={{ color: t.text, fontFamily: FF.regular }}>
              {k === 'system' ? 'Match system' : k === 'light' ? 'Always light' : 'Always dark'}
            </Text>
            {mode === k ? <Ionicons name="checkmark-circle" size={22} color={t.brand} /> : null}
          </Pressable>
        ))}
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save
        </Button>
      </Card>
    </ScreenContainer>
  );
}

export function ShortcutsSettingsScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const s = user?.appSettings?.shortcuts.enabled ?? true;
  const [enabled, setEnabled] = useState(s);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { user: next } = await patchUserSettings({ shortcuts: { enabled } });
      await updateUser(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Shortcuts" />
      <Card>
        <BoolRow label="Enable shortcuts" value={enabled} onChange={setEnabled} t={t} />
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save
        </Button>
      </Card>
    </ScreenContainer>
  );
}

export function CommunicationSettingsScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const c = user?.appSettings?.communication ?? defaultSettings().communication;
  const [email, setEmail] = useState(c.email);
  const [push, setPush] = useState(c.push);
  const [sms, setSms] = useState(c.sms);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { user: next } = await patchUserSettings({ communication: { email, push, sms } });
      await updateUser(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Communication" />
      <Card>
        <BoolRow label="Email updates" value={email} onChange={setEmail} t={t} />
        <View style={{ height: 12 }} />
        <BoolRow label="Push notifications" value={push} onChange={setPush} t={t} />
        <View style={{ height: 12 }} />
        <BoolRow label="SMS (when available)" value={sms} onChange={setSms} t={t} />
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save
        </Button>
      </Card>
    </ScreenContainer>
  );
}

export function NavigationPrefsSettingsScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const m = user?.appSettings?.navigation.preferredMaps ?? 'google';
  const [map, setMap] = useState(m);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { user: next } = await patchUserSettings({ navigation: { preferredMaps: map } });
      await updateUser(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Navigation" />
      <Card>
        {(['google', 'apple', 'waze'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => {
              void hapticSelection();
              setMap(k);
            }}
            style={[styles.optionRow, map === k && { backgroundColor: t.brandSoft }]}
          >
            <Text style={{ color: t.text, fontFamily: FF.regular, textTransform: 'capitalize' }}>{k} Maps</Text>
            {map === k ? <Ionicons name="checkmark-circle" size={22} color={t.brand} /> : null}
          </Pressable>
        ))}
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save
        </Button>
      </Card>
    </ScreenContainer>
  );
}

export function SoundsVoiceSettingsScreen() {
  const { user, updateUser } = useAuth();
  const { t } = useTheme();
  const sv = user?.appSettings?.soundsVoice ?? defaultSettings().soundsVoice;
  const [messageSounds, setMessageSounds] = useState(sv.messageSounds);
  const [voiceGuidance, setVoiceGuidance] = useState(sv.voiceGuidance);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const { user: next } = await patchUserSettings({
        soundsVoice: { messageSounds, voiceGuidance },
      });
      await updateUser(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer align="stretch" scrollable>
      <ScreenHeader title="Sounds & voice" />
      <Card>
        <BoolRow label="Message sounds" value={messageSounds} onChange={setMessageSounds} t={t} />
        <View style={{ height: 12 }} />
        <BoolRow label="Voice guidance (navigation)" value={voiceGuidance} onChange={setVoiceGuidance} t={t} />
        <Button onPress={() => void save()} loading={busy} fullWidth style={{ marginTop: 16 }}>
          Save
        </Button>
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
  headerTitle: { fontSize: 18, flex: 1, textAlign: 'center', fontFamily: FF.bold },
  label: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6, fontFamily: FF.semibold },
  body: { fontSize: 16, fontFamily: FF.regular },
  hint: { fontSize: 13, lineHeight: 20, fontFamily: FF.regular },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginTop: 6,
    fontFamily: FF.regular,
  },
});
