import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ChatAvatar } from '../../components/chat/ChatAvatar';
import { Button } from '../../components/ui/Button';
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
  type ChatActivityLogRow,
  type ChatRecentTripRow,
  type ChatUserPreview,
  type ConversationListItem,
  type LastMessageStatus,
} from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

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

function CollapsibleSection({
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
    <View style={styles.section}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.dropdownHeader,
          { borderColor: t.border, backgroundColor: t.bgElevated },
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>{title}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={t.textMuted} />
      </Pressable>
      {expanded ? <View style={styles.dropdownBody}>{children}</View> : null}
    </View>
  );
}

export function ConversationsListScreen() {
  const { t } = useTheme();
  const { user } = useAuth();
  const { refreshUnread } = useChatUnread();
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
  const [activityOpen, setActivityOpen] = useState(true);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConversationListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [convRes, matchRes, tripRes] = await Promise.all([
        listConversations(),
        listChatMatches(),
        listChatRecentTrips(),
      ]);
      setConversations(convRes.conversations);
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
  }, [refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

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

  const activityRows = activities.length
    ? activities
    : recentTrips.map((trip) => ({
        id: `${trip.id}-fallback`,
        tripId: trip.id,
        at: trip.updatedAt ?? trip.createdAt,
        who: [trip.owner?.name, trip.driver?.name].filter(Boolean).join(' & ') || 'Trip',
        summary: `${statusLabel[trip.status] ?? trip.status} · ${trip.pickupLocation} → ${trip.dropoffLocation}`,
      }));

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <ScrollView
        style={styles.flex}
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
          <CollapsibleSection
            title="Recent activity"
            expanded={activityOpen}
            onToggle={() => setActivityOpen((o) => !o)}
            t={t}
          >
            {activityRows.map((row) => (
              <View
                key={row.id}
                style={[styles.logRow, { borderBottomColor: t.border }]}
              >
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
          </CollapsibleSection>
        ) : null}

        {!loading && displayMatches.length > 0 ? (
          <CollapsibleSection
            title="People you can message"
            expanded={peopleOpen}
            onToggle={() => setPeopleOpen((o) => !o)}
            t={t}
          >
            {displayMatches.map((m) => (
              <Card
                key={m.user.id}
                style={{ ...styles.rowCard, borderColor: t.border, backgroundColor: t.bgElevated }}
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
          </CollapsibleSection>
        ) : null}

        {!loading && displayConversations.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitleStatic, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>
              Conversations
            </Text>
            {displayConversations.map((c) => {
              const st = lastStatusMeta(c.lastMessageStatus, t);
              return (
                <ReanimatedSwipeable
                  key={c.id}
                  friction={2}
                  overshootLeft={false}
                  overshootRight={false}
                  renderLeftActions={() => (
                    <View style={[styles.swipeSide, { backgroundColor: t.brand }]}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => goPeerProfile(c.otherUserId)}
                        style={styles.swipeBtn}
                      >
                        <Ionicons name="person-circle" size={30} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                  renderRightActions={() => (
                    <View style={[styles.swipeSide, { backgroundColor: '#dc2626' }]}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setDeleteTarget(c)}
                        style={styles.swipeBtn}
                      >
                        <Ionicons name="trash" size={26} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                >
                  <Pressable
                    onPress={() =>
                      openThread(c.id, {
                        id: c.otherUserId,
                        name: c.otherUser.name,
                        displayName: c.otherUser.displayName,
                        avatarUrl: c.otherUser.avatarUrl,
                      })
                    }
                    style={({ pressed }) => [pressed && { opacity: 0.92 }]}
                  >
                    <Card style={{ ...styles.rowCard, borderColor: t.border, backgroundColor: t.bgElevated }}>
                      <View style={styles.convRow}>
                        <ChatAvatar name={c.otherUser.name} avatarUrl={c.otherUser.avatarUrl} size={40} />
                        <View style={styles.flex}>
                          <View style={styles.convTitleRow}>
                            <Text
                              style={{ color: t.text, fontFamily: FF.semibold, flex: 1 }}
                              numberOfLines={1}
                            >
                              {c.otherUser.displayName ?? c.otherUser.name}
                            </Text>
                            {c.lastMessageAt ? (
                              <Text style={{ color: t.textMuted, fontFamily: FF.regular, fontSize: 11, marginLeft: 8 }}>
                                {formatShortTime(c.lastMessageAt)}
                              </Text>
                            ) : null}
                          </View>
                          {st.label ? (
                            <Text style={{ color: st.color, fontFamily: FF.semibold, fontSize: 11, marginTop: 2 }}>
                              {st.label}
                            </Text>
                          ) : null}
                          {c.lastMessagePreview ? (
                            <Text
                              style={{ color: t.textMuted, fontFamily: FF.regular, marginTop: 4, fontSize: 14 }}
                              numberOfLines={2}
                            >
                              {c.lastMessagePreview}
                            </Text>
                          ) : (
                            <Text style={{ color: t.textMuted, fontFamily: FF.regular, marginTop: 4, fontSize: 13 }}>
                              No messages yet
                            </Text>
                          )}
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                </ReanimatedSwipeable>
              );
            })}
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

      <Modal visible={deleteTarget != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
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
        </View>
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
  sectionTitleStatic: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  dropdownBody: { paddingBottom: 4 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  card: { padding: 14, borderRadius: 14, marginBottom: 10 },
  rowCard: { padding: 14, borderRadius: 14, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  convRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  convTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swipeSide: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 76,
    marginBottom: 10,
    borderRadius: 14,
  },
  swipeBtn: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
});
