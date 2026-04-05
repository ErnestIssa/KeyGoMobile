import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { IconEditPencil } from '../components/icons/navIcons';
import { AvatarEditorModal } from '../components/profile/AvatarEditorModal';
import { RoleModeSection } from '../components/profile/RoleModeSection';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/ui/Button';
import { BlurModalScrim } from '../components/ui/BlurModalScrim';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import type { AppTabParamList, ProfileStackParamList } from '../navigation/types';
import { uploadAvatar } from '../services/api';
import { resolveAvatarUri } from '../services/mediaUrl';
import { hapticLight, hapticSelection } from '../services/haptics';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';
import { radii } from '../theme/tokens';

const KEY_PUSH = 'keygo_pref_push';
const KEY_LOC = 'keygo_pref_location';

const AVATAR = 104;
const RING = 4;

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

function TopChip({
  label,
  icon,
  onPress,
  t,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  t: ReturnType<typeof useTheme>['t'];
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: t.bgElevated,
          borderColor: t.border,
          shadowColor: t.shadow,
        },
        pressed && { opacity: 0.88 },
      ]}
    >
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={[styles.chipLabel, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionRow({
  title,
  subtitle,
  onPress,
  t,
  last,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  t: ReturnType<typeof useTheme>['t'];
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.sectionRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
        pressed && { backgroundColor: t.bgSubtle },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.sectionTitle, { color: t.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sectionSub, { color: t.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.chevron, { color: t.brand }]}>›</Text>
    </Pressable>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const tabNavigation = navigation.getParent<BottomTabNavigationProp<AppTabParamList>>();
  const { user, signOut, refreshProfile, updateUser } = useAuth();
  const { theme, setTheme, t, ready: themeReady } = useTheme();
  const [pushOn, setPushOn] = useState(true);
  const [locOn, setLocOn] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** Bust RN image cache after upload so the new file at the same path reloads. */
  const [avatarCacheKey, setAvatarCacheKey] = useState(0);
  /** Show picker file:// immediately while upload runs (avoids blank if remote URL is slow or cache-stale). */
  const [avatarLocalUri, setAvatarLocalUri] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  /** Bumped once when prefs + theme are hydrated so native Switches remount with correct on-colors (RN quirk). */
  const [prefSwitchRevision, setPrefSwitchRevision] = useState(0);
  const prefHydrateOnceRef = useRef(false);

  const loadPrefs = useCallback(async () => {
    try {
      const [p, l] = await Promise.all([AsyncStorage.getItem(KEY_PUSH), AsyncStorage.getItem(KEY_LOC)]);
      if (p != null) setPushOn(p === '1');
      if (l != null) setLocOn(l === '1');
    } finally {
      setPrefsReady(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPrefs();
      void refreshProfile();
    }, [loadPrefs, refreshProfile])
  );

  const goSection = (title: string, subtitle: string) => {
    navigation.navigate('Section', { title, subtitle });
  };

  const applyAvatarDataUri = useCallback(
    async (dataUri: string) => {
      setUploading(true);
      try {
        const { user: next } = await uploadAvatar(dataUri);
        await updateUser(next);
        setAvatarCacheKey((k) => k + 1);
        setAvatarLocalUri(null);
      } catch (e) {
        setAvatarLocalUri(null);
        throw e;
      } finally {
        setUploading(false);
      }
    },
    [updateUser]
  );

  const prefsHydrated = prefsReady && themeReady;

  useLayoutEffect(() => {
    if (!prefsHydrated || prefHydrateOnceRef.current) return;
    prefHydrateOnceRef.current = true;
    setPrefSwitchRevision((n) => n + 1);
  }, [prefsHydrated]);

  const switchTrackColor = useMemo(
    () => ({ false: t.bgSubtle, true: t.brandSoft }),
    [t.bgSubtle, t.brandSoft]
  );

  /**
   * `prefSwitchRevision` in keys: one remount after storage + theme load so Android/iOS
   * Switch paints the blue “on” track/thumb. `theme` in key: new tokens after dark-mode toggle.
   */
  const row = (label: string, value: boolean, onChange: (v: boolean) => void, switchId: string) => (
    <View style={styles.switchRow}>
      <Text style={[styles.switchLabel, { color: t.text }]}>{label}</Text>
      <Switch
        key={`${switchId}-${theme}-r${prefSwitchRevision}`}
        value={value}
        onValueChange={(v) => {
          void hapticSelection();
          onChange(v);
        }}
        trackColor={switchTrackColor}
        thumbColor={value ? t.brand : t.textMuted}
        ios_backgroundColor={t.bgSubtle}
      />
    </View>
  );

  const rating = user?.ratingAverage ?? 5;
  const remoteAvatarUri = resolveAvatarUri(user?.avatarUrl);
  const avatarUriWithBust = useMemo(() => {
    if (!remoteAvatarUri) return undefined;
    const sep = remoteAvatarUri.includes('?') ? '&' : '?';
    return `${remoteAvatarUri}${sep}v=${avatarCacheKey}`;
  }, [remoteAvatarUri, avatarCacheKey]);
  const avatarDisplayUri = avatarLocalUri ?? avatarUriWithBust;
  const ringSize = AVATAR + RING * 2;
  const cx = ringSize / 2;
  const rOuter = AVATAR / 2 + RING - 1;

  const scrollLocked = helpOpen || safetyOpen || signOutOpen || avatarEditorOpen || roleModalOpen;

  return (
    <ScreenContainer align="stretch" scrollEnabled={!scrollLocked}>
      <Animated.View entering={FadeInDown.duration(260)} style={styles.topRow}>
        <TopChip label="Help" icon="❓" onPress={() => setHelpOpen(true)} t={t} />
        <TopChip label="Safety" icon="🛡" onPress={() => setSafetyOpen(true)} t={t} />
        <TopChip label="Settings" icon="⚙" onPress={() => navigation.navigate('SettingsHome')} t={t} />
      </Animated.View>

      <BlurModalScrim visible={helpOpen} onRequestClose={() => setHelpOpen(false)}>
        <View style={[styles.modalCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <Text style={[styles.modalTitle, { color: t.text }]}>Help</Text>
          <Text style={[styles.modalBody, { color: t.textMuted }]}>
            Browse FAQs, contact support, and troubleshoot trips. Full in-app help is coming soon — for now use your trip screens and account email for support.
          </Text>
          <Button variant="secondary" onPress={() => setHelpOpen(false)}>
            Close
          </Button>
        </View>
      </BlurModalScrim>

      <BlurModalScrim visible={safetyOpen} onRequestClose={() => setSafetyOpen(false)}>
        <View style={[styles.modalCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <Text style={[styles.modalTitle, { color: t.text }]}>Safety</Text>
          <Text style={[styles.modalBody, { color: t.textMuted }]}>
            Meet in public places when handing off keys, verify driver identity, and report issues immediately. We are building trust and safety tools into every trip.
          </Text>
          <Button variant="secondary" onPress={() => setSafetyOpen(false)}>
            Close
          </Button>
        </View>
      </BlurModalScrim>

      <BlurModalScrim visible={signOutOpen} onRequestClose={() => setSignOutOpen(false)}>
        <View style={[styles.modalCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <Text style={[styles.modalTitle, { color: t.text }]}>Sign out?</Text>
          <Text style={[styles.modalMeta, { color: t.textMuted }]}>
            Signed in as{' '}
            <Text style={{ color: t.text, fontFamily: FF.semibold }}>{user?.email}</Text>
          </Text>
          <Text style={[styles.modalMeta, { color: t.textMuted, marginTop: 6 }]}>
            Role: <Text style={{ color: t.brand, fontFamily: FF.bold, textTransform: 'capitalize' }}>{user?.role}</Text>
          </Text>
          <Text style={[styles.modalBody, { color: t.textMuted, marginTop: 14 }]}>
            Signing out clears this session on this device. To use Owner vs Driver tools, use Role mode above — no second account needed.
          </Text>
          <View style={styles.modalActions}>
            <Button variant="danger" fullWidth onPress={() => { setSignOutOpen(false); void signOut(); }}>
              Sign out
            </Button>
            <Button variant="secondary" fullWidth onPress={() => setSignOutOpen(false)}>
              Cancel
            </Button>
          </View>
        </View>
      </BlurModalScrim>

      <AvatarEditorModal
        visible={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        initialRemoteUri={avatarDisplayUri ?? undefined}
        initialLetter={(user?.name ?? '?').trim().charAt(0).toUpperCase() || '?'}
        onApplyUpload={applyAvatarDataUri}
      />

      <Animated.View entering={FadeInDown.delay(40).duration(280)} style={styles.hero}>
        <View style={styles.avatarWrap}>
          <Svg width={ringSize} height={ringSize} style={styles.ringSvg} pointerEvents="none">
            <Defs>
              <SvgLinearGradient id="avRing" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={t.brand} />
                <Stop offset="0.5" stopColor={t.accent} />
                <Stop offset="1" stopColor={t.brandHover} />
              </SvgLinearGradient>
            </Defs>
            <Circle cx={cx} cy={cx} r={rOuter} stroke="url(#avRing)" strokeWidth={RING} fill="none" />
          </Svg>
          <Pressable
            onPress={() => {
              void hapticLight();
              setAvatarEditorOpen(true);
            }}
            disabled={uploading}
            style={[styles.avatarInner, { backgroundColor: t.bgSubtle, borderColor: t.bgElevated, zIndex: 1 }]}
            accessibilityLabel="Profile photo"
          >
            {avatarDisplayUri ? (
              <Image
                key={`${avatarDisplayUri}-${avatarCacheKey}`}
                source={{ uri: avatarDisplayUri }}
                style={styles.avatarImg}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: t.brand }]}>
                {(user?.name ?? '?').trim().charAt(0).toUpperCase() || '?'}
              </Text>
            )}
            {uploading ? (
              <View style={[styles.uploadOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
            <View
              style={[styles.editBadge, { backgroundColor: t.brand, borderColor: t.bgElevated }]}
              pointerEvents="none"
            >
              <IconEditPencil size={11} color="#ffffff" strokeWidth={2.2} />
            </View>
          </Pressable>
        </View>

        <View style={styles.heroText}>
          <Text style={[styles.displayName, { color: t.canvasText }]} numberOfLines={2}>
            {user?.name ?? 'Account'}
          </Text>
          <Text style={[styles.emailLine, { color: t.canvasTextMuted }]} numberOfLines={1}>
            {user?.email}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={[styles.starIcon, { color: t.accent }]}>★</Text>
            <Text style={[styles.ratingNum, { color: t.canvasText }]}>{rating.toFixed(1)}</Text>
            <Text style={[styles.ratingLabel, { color: t.canvasTextMuted }]}>rating</Text>
          </View>
        </View>
      </Animated.View>

      <View style={{ height: 14 }} />

      <Animated.View entering={FadeInDown.delay(56).duration(280)}>
        <RoleModeSection onSwitched={() => tabNavigation?.navigate('Home')} onModalVisibilityChange={setRoleModalOpen} />
      </Animated.View>

      <View style={{ height: 12 }} />

      <Animated.View entering={FadeInDown.delay(80).duration(260)}>
        <Text style={[styles.groupLabel, { color: t.canvasTextMuted }]}>Manage</Text>
        <Card style={{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
          <SectionRow
            title="Vehicles"
            subtitle="Garage, plates, and handoff preferences"
            onPress={() => goSection('Vehicles', 'Manage cars you relocate with KeyGo.')}
            t={t}
          />
          <SectionRow
            title="Documents"
            subtitle="License, registration, verification"
            onPress={() => goSection('Documents', 'Store and manage documents securely.')}
            t={t}
          />
          <SectionRow
            title="Insurance"
            subtitle="Coverage and policy details"
            onPress={() => goSection('Insurance', 'Link coverage details for peace of mind.')}
            t={t}
            last
          />
        </Card>
      </Animated.View>

      <View style={{ height: 12 }} />

      <Animated.View entering={FadeInDown.delay(100).duration(260)}>
        <Text style={[styles.groupLabel, { color: t.canvasTextMuted }]}>Money</Text>
        <Card style={{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
          <SectionRow
            title="Tax info"
            subtitle="Forms and reporting helpers"
            onPress={() => goSection('Tax info', 'Tax-related information for earnings and payouts.')}
            t={t}
          />
          <SectionRow
            title="Payments"
            subtitle="Payout methods and history"
            onPress={() => goSection('Payments', 'How you get paid for completed trips.')}
            t={t}
            last
          />
        </Card>
      </Animated.View>

      <View style={{ height: 12 }} />

      <Animated.View entering={FadeInDown.delay(120).duration(260)}>
        <Text style={[styles.groupLabel, { color: t.canvasTextMuted }]}>Resources</Text>
        <Card style={{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
          <SectionRow
            title="Tips & info"
            subtitle="Guides for owners and drivers"
            onPress={() => goSection('Tips & info', 'Best practices for smooth relocations.')}
            t={t}
          />
          <SectionRow
            title="About"
            subtitle="KeyGo version and legal"
            onPress={() => goSection('About', 'Product information and policies.')}
            t={t}
            last
          />
        </Card>
      </Animated.View>

      <View style={{ height: 12 }} />

      <Animated.View entering={FadeInDown.delay(140).duration(260)}>
        <Text style={[styles.groupLabel, { color: t.canvasTextMuted }]}>Switch account</Text>
        <Card style={{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
          <Pressable
            onPress={() => {
              void hapticLight();
              setSignOutOpen(true);
            }}
            style={({ pressed }) => [
              styles.sectionRow,
              pressed && { backgroundColor: t.bgSubtle },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.sectionTitle, { color: t.danger }]}>Sign out</Text>
              <Text style={[styles.sectionSub, { color: t.textMuted }]} numberOfLines={2}>
                End this session on this device. Switch Owner/Driver anytime in Role mode above.
              </Text>
            </View>
            <Text style={[styles.chevron, { color: t.danger }]}>›</Text>
          </Pressable>
        </Card>
      </Animated.View>

      <View style={{ height: 14 }} />

      <Card>
        <Text style={[styles.sectionHead, { color: t.text }]}>Preferences</Text>
        {prefsHydrated ? (
          <>
            {row('Dark mode', theme === 'dark', (v) => setTheme(v ? 'dark' : 'light'), 'pref-dark')}
            <View style={styles.divider} />
            {row(
              'Push notifications',
              pushOn,
              async (v) => {
                setPushOn(v);
                await AsyncStorage.setItem(KEY_PUSH, v ? '1' : '0');
              },
              'pref-push'
            )}
            <View style={styles.divider} />
            {row(
              'Location sharing',
              locOn,
              async (v) => {
                setLocOn(v);
                await AsyncStorage.setItem(KEY_LOC, v ? '1' : '0');
              },
              'pref-loc'
            )}
          </>
        ) : (
          <Text style={{ color: t.textMuted }}>Loading preferences…</Text>
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '34%',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  chipIcon: {
    fontSize: 15,
  },
  chipLabel: {
    fontSize: 11,
    fontFamily: FF.bold,
    fontWeight: '800',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  avatarWrap: {
    width: AVATAR + RING * 2,
    height: AVATAR + RING * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  avatarInner: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
  },
  avatarImg: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: FF.extrabold,
    fontWeight: '900',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 22,
    fontFamily: FF.extrabold,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  emailLine: {
    marginTop: 4,
    fontSize: 13,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  starIcon: {
    fontSize: 18,
    marginTop: -2,
  },
  ratingNum: {
    fontSize: 17,
    fontFamily: FF.bold,
    fontWeight: '800',
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: FF.bold,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionHead: {
    fontSize: 16,
    fontFamily: FF.bold,
    fontWeight: '800',
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FF.semibold,
    fontWeight: '700',
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  switchLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
    marginVertical: 10,
  },
  modalCard: {
    borderRadius: radii.card + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FF.extrabold,
    fontWeight: '900',
    marginBottom: 10,
  },
  modalMeta: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalActions: {
    gap: 10,
    marginTop: 4,
  },
});
