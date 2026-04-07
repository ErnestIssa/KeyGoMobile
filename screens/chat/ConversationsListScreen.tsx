import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, memo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Reanimated, { Extrapolate, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { BlurView } from 'expo-blur';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ChatAvatar } from '../../components/chat/ChatAvatar';
import { Button } from '../../components/ui/Button';
import { BlurModalScrim } from '../../components/ui/BlurModalScrim';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useChatUnread } from '../../context/ChatUnreadContext';
import { useContentTopInset, useFloatingTabBarBottomInset } from '../../navigation/floatingTabBar';
import type { ChatStackParamList } from '../../navigation/types';
import { friendlyErrorMessage } from '../../lib/userFacingError';
import {
  listChatMatches,
  listChatRecentTrips,
  listConversations,
  createConversation,
  deleteConversation,
  patchConversationSettings,
  clearConversationHistory,
  postConversationMarkUnread,
  postConversationLock,
  type ChatActivityLogRow,
  type ChatRecentTripRow,
  type ChatUserPreview,
  type ConversationListItem,
  type LastMessageStatus,
} from '../../services/api';
import { getSharedChatSocket } from '../../services/chatSocket';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PANEL_OPEN_MS = 950;
/** Longer collapse so the panel motion reads clearly after content is hidden. */
const PANEL_CLOSE_MS = 780;
const PANEL_OPEN_FADE_MS = Math.round(PANEL_OPEN_MS * 0.35);
const PANEL_EASING = Easing.bezier(0.22, 1, 0.36, 1);
/** Smooth deceleration — visible “flow” as height reaches zero. */
const PANEL_CLOSE_HEIGHT_EASING = Easing.bezier(0.33, 0.86, 0.45, 1);
/** Inset matches ScrollView horizontal padding — card aligns with dropdowns; swipe track bleeds past */
const CARD_H_INSET = 16;
const CONV_CARD_GAP = 10;
const PROFILE_BLUE = '#2563eb';
const DELETE_RED = '#dc2626';

const statusLabel: Record<string, string> = {
  pending: 'Open',
  accepted: 'In progress',
  completed: 'Done',
};

function formatShortTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function lastStatusMeta(
  status: LastMessageStatus | undefined,
  t: { textMuted: string; brand: string }
): { label: string; color: string } {
  switch (status) {
    case 'sent':
      return { label: 'Sent', color: '#ec4899' };
    case 'delivered':
      return { label: 'Delivered', color: '#3b82f6' };
    case 'read':
      return { label: 'Read', color: '#22c55e' };
    case 'received':
      return { label: 'New', color: '#ec4899' };
    default:
      return { label: '', color: t.textMuted };
  }
}

type ThemeT = ReturnType<typeof useTheme>['t'];

/** Shared list + modal body — message, time, status, icons. */
function ConversationCardContent({
  c,
  t,
  cardBg,
  previewLines = 2,
}: {
  c: ConversationListItem;
  t: ThemeT;
  cardBg: string;
  previewLines?: number;
}) {
  const settings = c.mySettings;
  const st = lastStatusMeta(c.lastMessageStatus, t);
  return (
    <View
      style={[
        styles.convCardShell,
        {
          borderColor: t.border,
          backgroundColor: cardBg,
        },
      ]}
    >
      <View style={styles.convRow}>
        <ChatAvatar name={c.otherUser.name} avatarUrl={c.otherUser.avatarUrl} size={40} />
        <View style={styles.flex}>
          <View style={styles.convTitleRow}>
            <Text style={{ color: t.text, fontFamily: FF.semibold, flex: 1 }} numberOfLines={1}>
              {c.otherUser.displayName ?? c.otherUser.name}
            </Text>
            {c.lastMessageAt ? (
              <Text style={{ color: t.textMuted, fontFamily: FF.regular, fontSize: 11, marginLeft: 8 }}>
                {formatShortTime(c.lastMessageAt)}
              </Text>
            ) : null}
          </View>
          {settings?.favorite || settings?.muted || c.isLocked ? (
            <View style={styles.statusIcons}>
              {settings?.favorite ? <Ionicons name="star" size={16} color="#ca8a04" /> : null}
              {settings?.muted ? <Ionicons name="notifications-off" size={16} color={t.textMuted} /> : null}
              {c.isLocked ? <Ionicons name="lock-closed" size={16} color={t.textMuted} /> : null}
            </View>
          ) : null}
          {settings?.listTag ? (
            <Text style={{ color: t.brand, fontFamily: FF.regular, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
              {settings.listTag}
            </Text>
          ) : null}
          {c.lastMessagePreview ? (
            <Text
              style={{ color: t.textMuted, fontFamily: FF.regular, marginTop: 6, fontSize: 14 }}
              numberOfLines={previewLines}
            >
              {c.lastMessagePreview}
            </Text>
          ) : (
            <Text style={{ color: t.textMuted, fontFamily: FF.regular, marginTop: 6, fontSize: 13 }}>No messages yet</Text>
          )}
          {st.label ? (
            <View style={styles.convCardStatusRow}>
              <Text style={{ color: st.color, fontFamily: FF.semibold, fontSize: 11 }}>{st.label}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function LeftSwipeAction({
  progress,
  translation,
  cardBg,
  maxStretch,
  onPress,
}: {
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  cardBg: string;
  maxStretch: number;
  onPress: () => void;
}) {
  const widthStyle = useAnimatedStyle(() => {
    const tr = Math.max(0, translation.value);
    const w = interpolate(tr, [0, maxStretch], [36, maxStretch], Extrapolate.CLAMP);
    return { width: w };
  });
  const tintStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolate.CLAMP),
    };
  });
  const iconBlueStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const t = interpolate(p, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolate.CLAMP);
    return { opacity: interpolate(t, [0, 0.5, 1], [1, 0.2, 0], Extrapolate.CLAMP) };
  });
  const iconWhiteStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const t = interpolate(p, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolate.CLAMP);
    return { opacity: interpolate(t, [0, 0.45, 1], [0, 0.85, 1], Extrapolate.CLAMP) };
  });
  const iconScaleStyle = useAnimatedStyle(() => {
    const tr = Math.max(0, translation.value);
    const p = progress.value;
    const s = interpolate(tr, [0, maxStretch * 0.5, maxStretch], [0.82, 0.98, 1.06], Extrapolate.CLAMP);
    const s2 = interpolate(p, [0, 1], [0.9, 1.04], Extrapolate.CLAMP);
    return { transform: [{ scale: (s + s2) / 2 }] };
  });

  return (
    <Reanimated.View style={[styles.actionStretch, widthStyle, { marginRight: 8, marginBottom: CONV_CARD_GAP }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: cardBg,
            borderTopLeftRadius: 14,
            borderBottomLeftRadius: 14,
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
          },
        ]}
      />
      <Reanimated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: PROFILE_BLUE,
            borderTopLeftRadius: 14,
            borderBottomLeftRadius: 14,
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
          },
          tintStyle,
        ]}
      />
      <Pressable accessibilityRole="button" onPress={onPress} style={StyleSheet.absoluteFill}>
        <Reanimated.View style={[styles.actionIconCenter, iconScaleStyle]} pointerEvents="none">
          <Reanimated.View style={[{ position: 'absolute' }, iconBlueStyle]}>
            <Ionicons name="person-circle" size={30} color={PROFILE_BLUE} />
          </Reanimated.View>
          <Reanimated.View style={[{ position: 'absolute' }, iconWhiteStyle]}>
            <Ionicons name="person-circle" size={30} color="#ffffff" />
          </Reanimated.View>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

function RightSwipeAction({
  progress,
  translation,
  cardBg,
  maxStretch,
  onPress,
}: {
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  cardBg: string;
  maxStretch: number;
  onPress: () => void;
}) {
  const widthStyle = useAnimatedStyle(() => {
    const tr = Math.max(0, -translation.value);
    const w = interpolate(tr, [0, maxStretch], [36, maxStretch], Extrapolate.CLAMP);
    return { width: w };
  });
  const tintStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolate.CLAMP),
    };
  });
  const iconRedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const t = interpolate(p, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolate.CLAMP);
    return { opacity: interpolate(t, [0, 0.5, 1], [1, 0.2, 0], Extrapolate.CLAMP) };
  });
  const iconWhiteStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const t = interpolate(p, [0, 0.45, 0.55, 1], [0, 0, 1, 1], Extrapolate.CLAMP);
    return { opacity: interpolate(t, [0, 0.45, 1], [0, 0.85, 1], Extrapolate.CLAMP) };
  });
  const iconScaleStyle = useAnimatedStyle(() => {
    const tr = Math.max(0, -translation.value);
    const p = progress.value;
    const s = interpolate(tr, [0, maxStretch * 0.5, maxStretch], [0.82, 0.98, 1.06], Extrapolate.CLAMP);
    const s2 = interpolate(p, [0, 1], [0.9, 1.04], Extrapolate.CLAMP);
    return { transform: [{ scale: (s + s2) / 2 }] };
  });

  return (
    <Reanimated.View style={[styles.actionStretch, widthStyle, { marginLeft: 8, marginBottom: CONV_CARD_GAP }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: cardBg,
            borderTopRightRadius: 14,
            borderBottomRightRadius: 14,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
          },
        ]}
      />
      <Reanimated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: DELETE_RED,
            borderTopRightRadius: 14,
            borderBottomRightRadius: 14,
            borderTopLeftRadius: 4,
            borderBottomLeftRadius: 4,
          },
          tintStyle,
        ]}
      />
      <Pressable accessibilityRole="button" onPress={onPress} style={StyleSheet.absoluteFill}>
        <Reanimated.View style={[styles.actionIconCenter, iconScaleStyle]} pointerEvents="none">
          <Reanimated.View style={[{ position: 'absolute' }, iconRedStyle]}>
            <Ionicons name="trash" size={26} color={DELETE_RED} />
          </Reanimated.View>
          <Reanimated.View style={[{ position: 'absolute' }, iconWhiteStyle]}>
            <Ionicons name="trash" size={26} color="#ffffff" />
          </Reanimated.View>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

/** Height animates smoothly; inner opacity hides instantly on close so only the shell moves. */
function SmoothCollapse({ expanded, children, t }: { expanded: boolean; children: ReactNode; t: { border: string } }) {
  const heightT = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const opacityT = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    heightT.stopAnimation();
    opacityT.stopAnimation();
    if (expanded) {
      Animated.parallel([
        Animated.timing(heightT, {
          toValue: 1,
          duration: PANEL_OPEN_MS,
          easing: PANEL_EASING,
          useNativeDriver: false,
        }),
        Animated.timing(opacityT, {
          toValue: 1,
          duration: PANEL_OPEN_FADE_MS,
          easing: PANEL_EASING,
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      opacityT.setValue(0);
      Animated.timing(heightT, {
        toValue: 0,
        duration: PANEL_CLOSE_MS,
        easing: PANEL_CLOSE_HEIGHT_EASING,
        useNativeDriver: false,
      }).start();
    }
  }, [expanded, heightT, opacityT]);

  const maxH = heightT.interpolate({ inputRange: [0, 1], outputRange: [0, 8000] });

  return (
    <Animated.View
      style={{
        overflow: 'hidden',
        maxHeight: maxH,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: t.border,
      }}
    >
      <Animated.View style={{ opacity: opacityT }}>{children}</Animated.View>
    </Animated.View>
  );
}

const ConversationSwipeRow = memo(function ConversationSwipeRow({
  c,
  t,
  cardBg,
  onOpenThread,
  onProfile,
  onDeleteRequest,
  onLongPress,
  closeOthers,
  swipeRegistry,
}: {
  c: ConversationListItem;
  t: ThemeT;
  cardBg: string;
  onOpenThread: (conversationId: string, peer: { id: string; name: string; displayName?: string; avatarUrl?: string }) => void;
  onProfile: (userId: string) => void;
  onDeleteRequest: (row: ConversationListItem) => void;
  onLongPress: (row: ConversationListItem) => void;
  closeOthers: (exceptId: string) => void;
  swipeRegistry: React.MutableRefObject<Map<string, SwipeableMethods>>;
}) {
  const swipeRef = useRef<SwipeableMethods>(null);
  const { width: screenW } = useWindowDimensions();
  const maxStretch = Math.min(screenW * 0.52, 280);

  useLayoutEffect(() => {
    const r = swipeRef.current;
    if (r) swipeRegistry.current.set(c.id, r);
    return () => {
      swipeRegistry.current.delete(c.id);
    };
  }, [c.id, swipeRegistry]);

  return (
    <View style={styles.swipeBleed}>
      <ReanimatedSwipeable
        ref={swipeRef}
        friction={1}
        overshootLeft
        overshootRight
        dragOffsetFromLeftEdge={4}
        dragOffsetFromRightEdge={4}
        onSwipeableWillOpen={() => closeOthers(c.id)}
        onSwipeableOpen={(direction) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (direction === SwipeDirection.RIGHT) {
            onProfile(c.otherUserId);
            swipeRef.current?.close();
          } else {
            onDeleteRequest(c);
            swipeRef.current?.close();
          }
        }}
        containerStyle={[styles.swipeContainerBleed, { marginBottom: CONV_CARD_GAP }]}
        childrenContainerStyle={[styles.swipeChild, { marginHorizontal: CARD_H_INSET }]}
        renderLeftActions={(progress, translation) => (
          <LeftSwipeAction
            progress={progress}
            translation={translation}
            cardBg={cardBg}
            maxStretch={maxStretch}
            onPress={() => {
              onProfile(c.otherUserId);
              swipeRef.current?.close();
            }}
          />
        )}
        renderRightActions={(progress, translation) => (
          <RightSwipeAction
            progress={progress}
            translation={translation}
            cardBg={cardBg}
            maxStretch={maxStretch}
            onPress={() => onDeleteRequest(c)}
          />
        )}
      >
        <Pressable
          onPress={() =>
            onOpenThread(c.id, {
              id: c.otherUserId,
              name: c.otherUser.name,
              displayName: c.otherUser.displayName,
              avatarUrl: c.otherUser.avatarUrl,
            })
          }
          onLongPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLongPress(c);
          }}
          delayLongPress={420}
          style={({ pressed }) => [pressed && { opacity: 0.96 }]}
        >
          <ConversationCardContent c={c} t={t} cardBg={cardBg} />
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
});

/** Single bordered panel: header + collapsible body (activity / people). */
function DropdownPanel({
  title,
  expanded,
  onToggle,
  children,
  t,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  t: ReturnType<typeof useTheme>['t'];
}) {
  return (
    <View style={[styles.dropdownPanel, { borderColor: t.border, backgroundColor: t.bgElevated }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.dropdownHeaderInner, pressed && { opacity: 0.92 }]}
      >
        <Text style={[styles.dropdownTitle, { color: t.text, fontFamily: FF.semibold }]}>{title}</Text>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <Ionicons name="chevron-down" size={22} color={t.textMuted} />
        </View>
      </Pressable>
      <SmoothCollapse expanded={expanded} t={t}>
        <View style={styles.dropdownBodyInner}>{children}</View>
      </SmoothCollapse>
    </View>
  );
}

export function ConversationsListScreen() {
  const { t } = useTheme();
  const { user } = useAuth();
  const { refreshUnread, conversationListVersion } = useChatUnread();
  const topInset = useContentTopInset();
  const scrollPad = useFloatingTabBarBottomInset();
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList>>();

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [matches, setMatches] = useState<{ user: ChatUserPreview; conversationId: string | null }[]>([]);
  const [recentTrips, setRecentTrips] = useState<ChatRecentTripRow[]>([]);
  const [activities, setActivities] = useState<ChatActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  /** Only one of the two chat dropdowns expanded at a time (`null` = both collapsed). */
  const [openChatPanel, setOpenChatPanel] = useState<'activity' | 'people' | null>('activity');

  const toggleActivityPanel = useCallback(() => {
    setOpenChatPanel((prev) => (prev === 'activity' ? null : 'activity'));
  }, []);
  const togglePeoplePanel = useCallback(() => {
    setOpenChatPanel((prev) => (prev === 'people' ? null : 'people'));
  }, []);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [longPressConvo, setLongPressConvo] = useState<ConversationListItem | null>(null);
  const [listTagDraft, setListTagDraft] = useState('');
  const [listTagMode, setListTagMode] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const swipeRefs = useRef<Map<string, SwipeableMethods>>(new Map());
  const swipeRegistry = swipeRefs;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [convRes, matchRes, tripRes] = await Promise.all([
        listConversations(includeArchived),
        listChatMatches(),
        listChatRecentTrips(),
      ]);
      setConversations(convRes.conversations);
      const sock = await getSharedChatSocket();
      if (sock) {
        for (const c of convRes.conversations) {
          sock.emit('join_conversation', c.id);
        }
      }
      setMatches(matchRes.matches);
      setRecentTrips(tripRes.trips);
      setActivities(tripRes.activities ?? []);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    void refreshUnread();
  }, [refreshUnread, includeArchived]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  useEffect(() => {
    if (conversationListVersion === 0) return;
    void load();
  }, [conversationListVersion, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const displayMatches = useMemo(
    () => (user?.id ? matches.filter((m) => m.user.id !== user.id) : matches),
    [matches, user?.id]
  );
  const displayConversations = useMemo(
    () => (user?.id ? conversations.filter((c) => c.otherUserId !== user.id) : conversations),
    [conversations, user?.id]
  );

  const openThread = (
    conversationId: string,
    peer: { id: string; name: string; displayName?: string; avatarUrl?: string }
  ) => {
    navigation.navigate('ChatThread', {
      conversationId,
      peerUserId: peer.id,
      peerDisplayName: peer.displayName ?? peer.name,
      peerAvatarUrl: peer.avatarUrl,
      peerName: peer.name,
    });
  };

  const goPeerProfile = (userId: string) => {
    navigation.getParent()?.navigate('Profile', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

  const startOrOpenChat = async (
    participantId: string,
    peer: { id: string; name: string; displayName?: string; avatarUrl?: string },
    existingId: string | null
  ) => {
    if (user?.id && participantId === user.id) {
      return;
    }
    if (existingId) {
      openThread(existingId, peer);
      return;
    }
    setStartingId(participantId);
    try {
      const res = await createConversation(participantId);
      openThread(res.conversation.id, { ...peer, id: participantId });
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setStartingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteConversation(deleteTarget.id);
      setConversations((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      void refreshUnread();
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const closeOthers = (exceptId: string) => {
    swipeRefs.current.forEach((sw, id) => {
      if (id !== exceptId) {
        try {
          sw.close();
        } catch {
          /* ignore */
        }
      }
    });
  };

  const runSettings = async (fn: () => Promise<void>) => {
    setSettingsBusy(true);
    try {
      await fn();
      await load();
      void refreshUnread();
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSettingsBusy(false);
    }
  };

  const activityRows = activities.length
    ? activities
    : recentTrips.map((trip) => ({
        id: `${trip.id}-fallback`,
        tripId: trip.id,
        at: trip.updatedAt ?? trip.createdAt,
        who: [trip.owner?.name, trip.driver?.name].filter(Boolean).join(' & ') || 'Trip',
        summary: `${statusLabel[trip.status] ?? trip.status} · ${trip.pickupLocation} → ${trip.dropoffLocation}`,
      }));

  const cardBg = t.bgElevated;

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <ScrollView
        style={styles.flex}
        scrollEnabled={longPressConvo == null && deleteTarget == null}
        contentContainerStyle={{
          paddingTop: topInset,
          paddingHorizontal: 16,
          paddingBottom: scrollPad,
          flexGrow: 1,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: t.canvasText, fontFamily: FF.bold }]}>Chat</Text>
        <Text style={[styles.sub, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
          Trip updates and messages with drivers or owners you&apos;ve paired with on a trip.
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.brand} />
          </View>
        ) : null}

        {error ? (
          <Card style={{ ...styles.card, borderColor: t.border, backgroundColor: t.bgSubtle }}>
            <Text style={{ color: t.textMuted, fontFamily: FF.regular }}>{error}</Text>
          </Card>
        ) : null}

        {!loading && activityRows.length > 0 ? (
          <DropdownPanel title="Recent activity" expanded={openChatPanel === 'activity'} onToggle={toggleActivityPanel} t={t}>
            {activityRows.map((row) => (
              <View key={row.id} style={[styles.logRow, { borderBottomColor: t.border }]}>
                <Text style={{ color: t.textMuted, fontFamily: FF.regular, fontSize: 12 }}>
                  {formatShortTime(row.at)}
                </Text>
                <Text style={{ color: t.text, fontFamily: FF.semibold, fontSize: 14, marginTop: 4 }} numberOfLines={2}>
                  {row.summary}
                </Text>
                <Text style={{ color: t.textMuted, fontFamily: FF.regular, fontSize: 13, marginTop: 4 }} numberOfLines={1}>
                  {row.who}
                </Text>
              </View>
            ))}
          </DropdownPanel>
        ) : null}

        {!loading && displayMatches.length > 0 ? (
          <DropdownPanel
            title="People you can message"
            expanded={openChatPanel === 'people'}
            onToggle={togglePeoplePanel}
            t={t}
          >
            {displayMatches.map((m) => (
              <Card
                key={m.user.id}
                style={{ ...styles.rowCard, borderColor: t.border, backgroundColor: t.bgElevated, marginBottom: 10 }}
              >
                <View style={styles.rowBetween}>
                  <ChatAvatar name={m.user.name} avatarUrl={m.user.avatarUrl} size={40} />
                  <View style={styles.flex}>
                    <Text style={{ color: t.text, fontFamily: FF.semibold }} numberOfLines={1}>
                      {m.user.displayName ?? m.user.name}
                    </Text>
                    <Text style={{ color: t.textMuted, fontFamily: FF.regular, fontSize: 12, marginTop: 2 }}>
                      {m.conversationId ? 'Tap to continue' : 'Matched on a trip'}
                    </Text>
                  </View>
                  <Button
                    onPress={() =>
                      void startOrOpenChat(
                        m.user.id,
                        {
                          id: m.user.id,
                          name: m.user.name,
                          displayName: m.user.displayName,
                          avatarUrl: m.user.avatarUrl,
                        },
                        m.conversationId
                      )
                    }
                    disabled={startingId === m.user.id}
                    loading={startingId === m.user.id}
                    variant="primary"
                  >
                    {m.conversationId ? 'Open' : 'Message'}
                  </Button>
                </View>
              </Card>
            ))}
          </DropdownPanel>
        ) : null}

        {!loading ? (
          <Pressable
            onPress={() => setIncludeArchived((a) => !a)}
            style={({ pressed }) => [styles.archiveToggle, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 13 }}>
              {includeArchived ? 'Hide archived' : 'Show archived'}
            </Text>
          </Pressable>
        ) : null}

        {!loading && displayConversations.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitleStatic, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>
              Conversations
            </Text>
            <View>
              {displayConversations.map((c) => (
                <ConversationSwipeRow
                  key={c.id}
                  c={c}
                  t={t}
                  cardBg={cardBg}
                  swipeRegistry={swipeRegistry}
                  closeOthers={closeOthers}
                  onOpenThread={openThread}
                  onProfile={goPeerProfile}
                  onDeleteRequest={(row) => setDeleteTarget(row)}
                  onLongPress={(row) => {
                    setLongPressConvo(row);
                    setListTagMode(false);
                    setListTagDraft(row.mySettings?.listTag ?? '');
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {!loading && displayMatches.length === 0 && displayConversations.length === 0 ? (
          <Card style={{ ...styles.card, borderColor: t.border, backgroundColor: t.bgElevated }}>
            <Text style={{ color: t.textMuted, fontFamily: FF.regular }}>
              When a driver accepts your trip (or you accept one), they&apos;ll appear here for chat.
            </Text>
          </Card>
        ) : null}
      </ScrollView>

      <BlurModalScrim visible={deleteTarget != null} onRequestClose={() => !deleting && setDeleteTarget(null)}>
        <View style={[styles.modalCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <Text style={{ color: t.text, fontFamily: FF.bold, fontSize: 18 }}>Delete conversation?</Text>
          <Text style={{ color: t.textMuted, fontFamily: FF.regular, marginTop: 10, lineHeight: 20 }}>
            This removes the thread and its messages for you and {deleteTarget?.otherUser.displayName ?? 'this person'}.
          </Text>
          <View style={styles.modalActions}>
            <Button variant="ghost" onPress={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="primary" onPress={() => void confirmDelete()} loading={deleting}>
              Delete
            </Button>
          </View>
        </View>
      </BlurModalScrim>

      <Modal visible={longPressConvo != null} transparent animationType="fade" statusBarTranslucent>
        <BlurView
          intensity={Platform.OS === 'ios' ? 55 : 90}
          tint="dark"
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={styles.blurFill}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setLongPressConvo(null)}>
          <Pressable style={[styles.floatingStack, { pointerEvents: 'box-none' }]} onPress={(e) => e.stopPropagation()}>
            {longPressConvo ? (
              <View style={styles.previewFloat}>
                <ConversationCardContent c={longPressConvo} t={t} cardBg={t.bgElevated} previewLines={8} />
              </View>
            ) : null}

            <View style={[styles.menuFloat, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
              {listTagMode ? (
                <>
                  <Text style={{ color: t.text, fontFamily: FF.semibold, marginBottom: 8 }}>List name</Text>
                  <TextInput
                    value={listTagDraft}
                    onChangeText={setListTagDraft}
                    placeholder="e.g. Work"
                    placeholderTextColor={t.textMuted}
                    style={{
                      borderWidth: 1,
                      borderColor: t.border,
                      borderRadius: 10,
                      padding: 10,
                      color: t.text,
                      fontFamily: FF.regular,
                      marginBottom: 10,
                    }}
                  />
                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" onPress={() => setListTagMode(false)}>
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      loading={settingsBusy}
                      onPress={() => {
                        if (!longPressConvo) return;
                        const id = longPressConvo.id;
                        void runSettings(async () => {
                          await patchConversationSettings(id, { listTag: listTagDraft.trim() || null });
                        });
                        setLongPressConvo(null);
                        setListTagMode(false);
                      }}
                    >
                      Save
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() =>
                      void runSettings(async () => {
                        if (!longPressConvo) return;
                        await postConversationMarkUnread(longPressConvo.id);
                        setLongPressConvo(null);
                      })
                    }
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 15 }}>Mark as unread</Text>
                  </Pressable>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() =>
                      void runSettings(async () => {
                        if (!longPressConvo) return;
                        await patchConversationSettings(longPressConvo.id, { archived: true });
                        setLongPressConvo(null);
                      })
                    }
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 15 }}>Archive</Text>
                  </Pressable>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() =>
                      void runSettings(async () => {
                        if (!longPressConvo) return;
                        const next = !longPressConvo.mySettings?.muted;
                        await patchConversationSettings(longPressConvo.id, { muted: next });
                        setLongPressConvo(null);
                      })
                    }
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 15 }}>
                      {longPressConvo?.mySettings?.muted ? 'Unmute' : 'Mute'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() =>
                      void runSettings(async () => {
                        if (!longPressConvo) return;
                        await postConversationLock(longPressConvo.id, !longPressConvo.isLocked);
                        setLongPressConvo(null);
                      })
                    }
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 15 }}>
                      {longPressConvo?.isLocked ? 'Unlock chat' : 'Lock chat'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() =>
                      void runSettings(async () => {
                        if (!longPressConvo) return;
                        const next = !longPressConvo.mySettings?.favorite;
                        await patchConversationSettings(longPressConvo.id, { favorite: next });
                        setLongPressConvo(null);
                      })
                    }
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 15 }}>
                      {longPressConvo?.mySettings?.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() => setListTagMode(true)}
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 15 }}>Add to list</Text>
                  </Pressable>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() =>
                      void runSettings(async () => {
                        if (!longPressConvo) return;
                        await clearConversationHistory(longPressConvo.id);
                        setLongPressConvo(null);
                      })
                    }
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: t.text, fontFamily: FF.regular, fontSize: 15 }}>Clear chat</Text>
                  </Pressable>
                  <Pressable
                    disabled={settingsBusy}
                    onPress={() => {
                      if (longPressConvo) setDeleteTarget(longPressConvo);
                      setLongPressConvo(null);
                    }}
                    style={({ pressed }) => [styles.menuRow, { backgroundColor: pressed ? t.bgSubtle : 'transparent' }]}
                  >
                    <Text style={{ color: '#dc2626', fontFamily: FF.bold, fontSize: 15 }}>Delete chat</Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
        </BlurView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { paddingVertical: 24, alignItems: 'center' },
  title: { fontSize: 26, marginBottom: 6 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitleStatic: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 4 },
  dropdownPanel: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  dropdownTitle: { fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  dropdownBodyInner: { paddingHorizontal: 14, paddingBottom: 14 },
  card: { padding: 14, borderRadius: 14, marginBottom: 10 },
  rowCard: { paddingVertical: 14, paddingHorizontal: 14, marginBottom: 0 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  convRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  convTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swipeBleed: {
    marginHorizontal: -CARD_H_INSET,
  },
  swipeContainerBleed: {
    overflow: 'visible',
  },
  swipeChild: {
    flex: 1,
  },
  actionStretch: {
    alignSelf: 'stretch',
    minHeight: 92,
    overflow: 'hidden',
  },
  actionIconCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  convCardShell: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  convCardStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  actionSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInner: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  archiveToggle: { paddingVertical: 8, marginBottom: 8 },
  blurFill: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  floatingStack: { gap: 12 },
  previewFloat: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  menuFloat: {
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  menuRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
});
