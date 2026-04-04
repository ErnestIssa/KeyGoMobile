import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  type ChatRecentTripRow,
  type ChatUserPreview,
  type ConversationListItem,
} from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

const statusLabel: Record<string, string> = {
  pending: 'Open',
  accepted: 'In progress',
  completed: 'Done',
};

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

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
    peer: { name: string; displayName?: string; avatarUrl?: string }
  ) => {
    navigation.navigate('ChatThread', {
      conversationId,
      peerDisplayName: peer.displayName ?? peer.name,
      peerAvatarUrl: peer.avatarUrl,
      peerName: peer.name,
    });
  };

  const startOrOpenChat = async (
    participantId: string,
    peer: { name: string; displayName?: string; avatarUrl?: string },
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
      openThread(res.conversation.id, peer);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setStartingId(null);
    }
  };

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

        {!loading && recentTrips.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>
              Recent activity
            </Text>
            {recentTrips.slice(0, 8).map((trip) => (
              <Card key={trip.id} style={{ ...styles.card, borderColor: t.border, backgroundColor: t.bgElevated }}>
                <Text style={{ color: t.text, fontFamily: FF.semibold }} numberOfLines={1}>
                  {trip.pickupLocation} → {trip.dropoffLocation}
                </Text>
                <Text style={{ color: t.textMuted, fontFamily: FF.regular, marginTop: 4, fontSize: 13 }}>
                  {statusLabel[trip.status] ?? trip.status}
                  {trip.owner?.name || trip.driver?.name
                    ? ` · ${trip.owner?.name ?? '?'} & ${trip.driver?.name ?? '?'}`
                    : ''}
                </Text>
              </Card>
            ))}
          </View>
        ) : null}

        {!loading && displayMatches.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>
              People you can message
            </Text>
            {displayMatches.map((m) => (
              <Card
                key={m.user.id}
                style={{ ...styles.rowCard, borderColor: t.border, backgroundColor: t.bgElevated }}
              >
                <View style={styles.rowBetween}>
                  <ChatAvatar
                    name={m.user.name}
                    avatarUrl={m.user.avatarUrl}
                    size={40}
                  />
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
          </View>
        ) : null}

        {!loading && displayConversations.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>
              Conversations
            </Text>
            {displayConversations.map((c) => (
              <Pressable
                key={c.id}
                onPress={() =>
                  openThread(c.id, {
                    name: c.otherUser.name,
                    displayName: c.otherUser.displayName,
                    avatarUrl: c.otherUser.avatarUrl,
                  })
                }
                style={({ pressed }) => [pressed && { opacity: 0.85 }]}
              >
                <Card style={{ ...styles.rowCard, borderColor: t.border, backgroundColor: t.bgElevated }}>
                  <View style={styles.convRow}>
                    <ChatAvatar name={c.otherUser.name} avatarUrl={c.otherUser.avatarUrl} size={40} />
                    <View style={styles.flex}>
                  <Text style={{ color: t.text, fontFamily: FF.semibold }} numberOfLines={1}>
                    {c.otherUser.displayName ?? c.otherUser.name}
                  </Text>
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
            ))}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { paddingVertical: 24, alignItems: 'center' },
  title: { fontSize: 26, marginBottom: 6 },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  card: { padding: 14, borderRadius: 14, marginBottom: 10 },
  rowCard: { padding: 14, borderRadius: 14, marginBottom: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
