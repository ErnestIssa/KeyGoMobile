import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  ROLE_CONFIRM_DRIVER,
  ROLE_CONFIRM_OWNER,
  ROLE_INFO_DRIVER_BODY,
  ROLE_INFO_DRIVER_TITLE,
  ROLE_INFO_OWNER_BODY,
  ROLE_INFO_OWNER_TITLE,
} from '../../constants/roleModeCopy';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import { radii } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { hapticLight, hapticSelection } from '../../services/haptics';

const SPRING = { damping: 22, stiffness: 220, mass: 0.85 } as const;
const TRACK_PAD = 4;

type AppRole = 'owner' | 'driver';

type Props = {
  /** After a successful server role change — e.g. navigate to Home tab. */
  onSwitched: () => void;
};

function InfoGlyph({ color }: { color: string }) {
  return (
    <View style={[styles.infoGlyph, { borderColor: color }]}>
      <Text style={[styles.infoGlyphText, { color }]}>i</Text>
    </View>
  );
}

export function RoleModeSection({ onSwitched }: Props) {
  const { user, switchRole } = useAuth();
  const { t } = useTheme();
  const [trackW, setTrackW] = useState(0);
  const pillX = useSharedValue(0);
  const [confirmTarget, setConfirmTarget] = useState<AppRole | null>(null);
  const [infoTarget, setInfoTarget] = useState<AppRole | null>(null);
  const [busy, setBusy] = useState(false);

  const role = user?.role;
  const canShow = role === 'owner' || role === 'driver';
  const active: AppRole = role === 'owner' ? 'owner' : 'driver';

  const innerW = Math.max(0, trackW - TRACK_PAD * 2);
  const segmentW = innerW > 0 ? innerW / 2 : 0;
  const pillW = Math.max(0, segmentW - 4);

  useEffect(() => {
    if (innerW <= 0) return;
    const x = active === 'owner' ? TRACK_PAD + 2 : TRACK_PAD + 2 + segmentW;
    pillX.value = withSpring(x, SPRING);
  }, [active, innerW, segmentW, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  const onTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      setTrackW(e.nativeEvent.layout.width);
    },
    []
  );

  const openConfirm = (target: AppRole) => {
    if (target === active) return;
    void hapticSelection();
    setConfirmTarget(target);
  };

  const runSwitch = async () => {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      await switchRole(confirmTarget);
      setConfirmTarget(null);
      void hapticLight();
      onSwitched();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Could not update role';
      Alert.alert('Role change failed', msg);
    } finally {
      setBusy(false);
    }
  };

  if (!canShow) return null;

  return (
    <>
      <Modal visible={infoTarget !== null} transparent animationType="fade" onRequestClose={() => setInfoTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoTarget(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: t.text }]}>
              {infoTarget === 'owner' ? ROLE_INFO_OWNER_TITLE : ROLE_INFO_DRIVER_TITLE}
            </Text>
            <ScrollView style={styles.infoScroll} showsVerticalScrollIndicator>
              <Text style={[styles.infoBody, { color: t.textMuted }]}>
                {infoTarget === 'owner' ? ROLE_INFO_OWNER_BODY : ROLE_INFO_DRIVER_BODY}
              </Text>
            </ScrollView>
            <Button variant="secondary" onPress={() => setInfoTarget(null)}>
              Close
            </Button>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={confirmTarget !== null} transparent animationType="fade" onRequestClose={() => !busy && setConfirmTarget(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !busy && setConfirmTarget(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: t.text }]}>Switch role mode?</Text>
            <Text style={[styles.modalBody, { color: t.textMuted }]}>
              {confirmTarget === 'owner' ? ROLE_CONFIRM_OWNER : ROLE_CONFIRM_DRIVER}
            </Text>
            <View style={styles.modalActions}>
              <Button variant="primary" fullWidth loading={busy} onPress={() => void runSwitch()}>
                Confirm switch
              </Button>
              <Button variant="secondary" fullWidth disabled={busy} onPress={() => setConfirmTarget(null)}>
                Cancel
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.sectionLabelWrap}>
        <Text style={[styles.groupLabel, { color: t.canvasTextMuted }]}>Role mode</Text>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.lead, { color: t.textMuted }]}>
          One account — switch between listing relocations (Owner) and completing them (Driver). Your email and password stay the same; the server updates your active mode.
        </Text>

        <View
          style={[styles.track, { backgroundColor: t.bgSubtle, borderColor: t.border }]}
          onLayout={onTrackLayout}
        >
          {innerW > 0 && pillW > 0 ? (
            <Animated.View
              style={[
                styles.pill,
                { width: pillW, backgroundColor: t.brandSoft, borderColor: t.brand },
                pillStyle,
              ]}
            />
          ) : null}

          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => openConfirm('owner')}
              style={({ pressed }) => [styles.segment, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.segmentHead}>
                <Text
                  style={[
                    styles.segmentTitle,
                    { color: active === 'owner' ? t.brand : t.text, fontFamily: FF.bold },
                  ]}
                >
                  Owner
                </Text>
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    void hapticLight();
                    setInfoTarget('owner');
                  }}
                  accessibilityLabel="About Owner mode"
                >
                  <InfoGlyph color={t.brand} />
                </Pressable>
              </View>
              <Text style={[styles.segmentHint, { color: t.textMuted }]} numberOfLines={2}>
                Post trips & manage listings
              </Text>
            </Pressable>

            <Pressable
              onPress={() => openConfirm('driver')}
              style={({ pressed }) => [styles.segment, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.segmentHead}>
                <Text
                  style={[
                    styles.segmentTitle,
                    { color: active === 'driver' ? t.brand : t.text, fontFamily: FF.bold },
                  ]}
                >
                  Driver
                </Text>
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    void hapticLight();
                    setInfoTarget('driver');
                  }}
                  accessibilityLabel="About Driver mode"
                >
                  <InfoGlyph color={t.brand} />
                </Pressable>
              </View>
              <Text style={[styles.segmentHint, { color: t.textMuted }]} numberOfLines={2}>
                Browse & accept relocations
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.footerNote, { color: t.textMuted }]}>
          Active: <Text style={{ color: t.brand, fontFamily: FF.bold }}>{active}</Text>
        </Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabelWrap: {
    marginBottom: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: FF.bold,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft: 4,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  lead: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  track: {
    borderRadius: radii.card + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: TRACK_PAD,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 88,
  },
  pill: {
    position: 'absolute',
    top: TRACK_PAD + 2,
    bottom: TRACK_PAD + 2,
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentRow: {
    flexDirection: 'row',
    zIndex: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 76,
    justifyContent: 'center',
  },
  segmentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  segmentTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  segmentHint: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  infoGlyph: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoGlyphText: {
    fontSize: 12,
    fontFamily: FF.bold,
    fontWeight: '900',
    marginTop: -1,
  },
  footerNote: {
    marginTop: 12,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: radii.card + 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FF.extrabold,
    fontWeight: '900',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  modalActions: {
    gap: 10,
  },
  infoScroll: {
    maxHeight: 320,
    marginBottom: 12,
  },
  infoBody: {
    fontSize: 14,
    lineHeight: 22,
  },
});
