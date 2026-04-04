import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ChatAvatar } from '../../components/chat/ChatAvatar';
import { useAuth } from '../../context/AuthContext';
import { useChatUnread } from '../../context/ChatUnreadContext';
import { outgoingDeliveryStatus } from '../../lib/chatDelivery';
import { friendlyErrorMessage } from '../../lib/userFacingError';
import { useChatThreadComposerBottomInset } from '../../navigation/floatingTabBar';
import type { ChatStackParamList } from '../../navigation/types';
import { listChatMessages, markConversationRead, postChatMessage, type ChatMessage } from '../../services/api';
import { connectChatSocket } from '../../services/chatSocket';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import type { Socket } from 'socket.io-client';

const TYPING_EMIT_MS = 400;
const TYPING_STOP_MS = 2800;
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function normalizeMessage(m: ChatMessage): ChatMessage {
  const createdAt =
    typeof m.createdAt === 'string'
      ? m.createdAt
      : (m.createdAt as unknown) instanceof Date
        ? ((m.createdAt as unknown) as Date).toISOString()
        : String(m.createdAt);
  return { ...m, createdAt };
}

export function ChatScreen() {
  const { t } = useTheme();
  const { user } = useAuth();
  const { refreshUnread } = useChatUnread();
  const insets = useSafeAreaInsets();
  const scrollPad = useChatThreadComposerBottomInset();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ChatStackParamList, 'ChatThread'>>();
  const {
    conversationId,
    peerUserId,
    peerDisplayName,
    peerAvatarUrl,
    peerName,
    otherUserName,
  } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef('');
  const typingEmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await listChatMessages(conversationId);
      setMessages(res.messages);
      setPeerLastReadAt(res.peerLastReadAt ?? null);
      setError(null);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/message-in.wav'),
          { shouldPlay: false, volume: 0.35 }
        );
        if (alive) soundRef.current = sound;
      } catch {
        /* no asset / simulator */
      }
    })();
    return () => {
      alive = false;
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  const playIncomingFx = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const s = soundRef.current;
      if (s) {
        await s.setPositionAsync(0);
        await s.playAsync();
      }
    } catch {
      /* ignore */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let activeSocket: Socket | null = null;
      setLoading(true);
      void loadMessages();
      void markConversationRead(conversationId).then(() => void refreshUnread());

      void (async () => {
        const socket = await connectChatSocket();
        if (cancelled || !socket) return;
        activeSocket = socket;
        socketRef.current = socket;

        const joinRoom = () => {
          socket.emit('join_conversation', conversationId);
          socket.emit('messages_read', { conversationId });
        };
        if (socket.connected) {
          joinRoom();
        } else {
          socket.on('connect', joinRoom);
        }

        const onNewMessage = (payload: { message: ChatMessage }) => {
          const raw = payload?.message;
          if (!raw) return;
          const m = normalizeMessage(raw);
          if (m.senderId !== myIdRef.current) {
            m.isUnread = true;
            void playIncomingFx();
          }
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
          if (m.senderId !== myIdRef.current) {
            void markConversationRead(conversationId).then(() => {
              void refreshUnread();
              socket.emit('messages_read', { conversationId });
              setMessages((prev) =>
                prev.map((x) => (x.senderId !== myIdRef.current ? { ...x, isUnread: false } : x))
              );
            });
          }
        };

        socket.on('new_message', onNewMessage);

        socket.on(
          'messages_read',
          (payload: { conversationId?: string; readerId?: string; readAt?: string }) => {
            if (!payload || payload.conversationId !== conversationId) return;
            if (payload.readerId === myIdRef.current) return;
            const readAt = payload.readAt;
            if (!readAt) return;
            setPeerLastReadAt((prev) => {
              if (!prev) return readAt;
              return new Date(readAt) > new Date(prev) ? readAt : prev;
            });
          }
        );

        socket.on(
          'user_typing',
          (payload: { conversationId?: string; userId?: string; isTyping?: boolean }) => {
            if (!payload || payload.conversationId !== conversationId) return;
            if (payload.userId === myIdRef.current) return;
            const typing = Boolean(payload.isTyping);
            if (peerTypingStopTimerRef.current) clearTimeout(peerTypingStopTimerRef.current);
            setPeerTyping(typing);
            if (typing) {
              peerTypingStopTimerRef.current = setTimeout(() => setPeerTyping(false), 6000);
            }
          }
        );
      })();

      return () => {
        cancelled = true;
        const s = activeSocket ?? socketRef.current;
        if (s) {
          s.emit('typing', { conversationId, isTyping: false });
          s.emit('leave_conversation', conversationId);
          s.removeAllListeners();
          s.disconnect();
        }
        socketRef.current = null;
        if (typingEmitTimerRef.current) clearTimeout(typingEmitTimerRef.current);
        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
        if (peerTypingStopTimerRef.current) clearTimeout(peerTypingStopTimerRef.current);
      };
    }, [conversationId, loadMessages, refreshUnread, playIncomingFx])
  );

  myIdRef.current = user?.id ?? '';

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, peerTyping]);

  const flushTypingEmit = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit('typing', { conversationId, isTyping: true });
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      socket.emit('typing', { conversationId, isTyping: false });
    }, TYPING_STOP_MS);
  }, [conversationId]);

  const onInputChange = useCallback(
    (text: string) => {
      setInput(text);
      if (!text.trim()) {
        if (typingEmitTimerRef.current) clearTimeout(typingEmitTimerRef.current);
        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
        socketRef.current?.emit('typing', { conversationId, isTyping: false });
        return;
      }
      if (typingEmitTimerRef.current) clearTimeout(typingEmitTimerRef.current);
      typingEmitTimerRef.current = setTimeout(() => {
        flushTypingEmit();
      }, TYPING_EMIT_MS);
    },
    [conversationId, flushTypingEmit]
  );

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    socketRef.current?.emit('typing', { conversationId, isTyping: false });

    const socket = socketRef.current;
    if (socket?.connected) {
      const ackTimer = setTimeout(() => setSending(false), 12000);
      socket.emit(
        'send_message',
        { conversationId, text },
        (ack: { ok: true } | { ok: false; error?: string } | undefined) => {
          clearTimeout(ackTimer);
          setSending(false);
          if (ack && 'ok' in ack && ack.ok === false) {
            void sendViaRest(text);
          }
        }
      );
      return;
    }

    await sendViaRest(text);
  };

  const sendViaRest = async (text: string) => {
    setSending(true);
    try {
      const res = await postChatMessage(conversationId, text);
      setMessages((prev) => (prev.some((x) => x.id === res.message.id) ? prev : [...prev, res.message]));
    } catch (e) {
      setError(friendlyErrorMessage(e));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const myId = user?.id ?? '';
  const peerLabel = peerDisplayName ?? otherUserName ?? peerName ?? 'Driver';

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const mine = item.senderId === myId;
      const inboundUnread = !mine && item.isUnread;
      const prev = index > 0 ? messages[index - 1] : undefined;
      const prevTime = prev ? new Date(prev.createdAt).getTime() : 0;
      const curTime = new Date(item.createdAt).getTime();
      const sameGroup =
        prev &&
        prev.senderId === item.senderId &&
        !Number.isNaN(prevTime) &&
        !Number.isNaN(curTime) &&
        curTime - prevTime < GROUP_WINDOW_MS;
      const showMeta = !sameGroup;

      const ds = mine
        ? outgoingDeliveryStatus(item.createdAt, peerLastReadAt)
        : item.deliveryStatus;
      const deliveryLabel =
        ds === 'read' ? 'Read' : ds === 'delivered' ? 'Delivered' : ds === 'sent' ? 'Sent' : '';
      const deliveryTint =
        ds === 'read'
          ? '#bbf7d0'
          : ds === 'delivered'
            ? '#93c5fd'
            : ds === 'sent'
              ? '#fbcfe8'
              : 'rgba(255,255,255,0.75)';
      return (
        <View
          style={[
            styles.bubbleRow,
            mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
            sameGroup ? { marginBottom: 4 } : { marginBottom: 10 },
          ]}
        >
          {!mine ? (
            sameGroup ? (
              <View style={{ width: 28 }} />
            ) : (
              <ChatAvatar
                name={item.senderName ?? item.senderDisplayName ?? '?'}
                avatarUrl={item.senderAvatarUrl}
                size={28}
              />
            )
          ) : null}
          <View
            style={[
              styles.bubble,
              mine
                ? { backgroundColor: t.brand }
                : {
                    backgroundColor: inboundUnread ? t.brandSoft : t.bgSubtle,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: inboundUnread ? t.brand : t.border,
                  },
            ]}
          >
            <Text
              style={{
                color: mine ? '#fff' : t.text,
                fontFamily: FF.regular,
                fontSize: 15,
                lineHeight: 21,
              }}
            >
              {item.text}
            </Text>
            {showMeta ? (
              <View style={styles.metaRow}>
                <Text
                  style={{
                    color: mine ? 'rgba(255,255,255,0.75)' : t.textMuted,
                    fontSize: 11,
                    fontFamily: FF.regular,
                  }}
                >
                  {new Date(item.createdAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {mine && deliveryLabel ? (
                  <Text style={{ color: deliveryTint, fontSize: 11, fontFamily: FF.semibold, marginLeft: 8 }}>
                    {deliveryLabel}
                  </Text>
                ) : null}
                {!mine && inboundUnread ? (
                  <Text style={{ color: t.brand, fontSize: 11, fontFamily: FF.semibold, marginLeft: 8 }}>
                    New
                  </Text>
                ) : null}
              </View>
            ) : mine ? (
              <View style={[styles.metaRow, { justifyContent: 'flex-end' }]}>
                {deliveryLabel ? (
                  <Text style={{ color: deliveryTint, fontSize: 11, fontFamily: FF.semibold, marginTop: 2 }}>
                    {deliveryLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          {mine ? (
            sameGroup ? (
              <View style={{ width: 28 }} />
            ) : (
              <ChatAvatar
                name={user?.name ?? '?'}
                firstName={user?.firstName}
                lastName={user?.lastName}
                avatarUrl={user?.avatarUrl}
                size={28}
              />
            )
          ) : null}
        </View>
      );
    },
    [messages, myId, peerLastReadAt, t, user]
  );

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), borderBottomColor: t.border }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backHit}>
            <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 16 }}>‹ Back</Text>
          </Pressable>
          <Pressable
            style={styles.headerCenter}
            onPress={() => {
              if (!peerUserId) return;
              navigation.getParent()?.navigate('Profile', {
                screen: 'UserProfile',
                params: { userId: peerUserId },
              });
            }}
            disabled={!peerUserId}
          >
            <ChatAvatar
              name={peerName ?? otherUserName ?? '?'}
              avatarUrl={peerAvatarUrl}
              size={32}
            />
            <Text style={[styles.headerTitle, { color: t.text, fontFamily: FF.bold }]} numberOfLines={1}>
              {peerDisplayName ?? otherUserName ?? 'Chat'}
            </Text>
          </Pressable>
          <View style={{ width: 56 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={t.brand} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            extraData={{ peerLastReadAt, messagesLen: messages.length }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            onEndReached={() => {
              socketRef.current?.emit('messages_read', { conversationId });
            }}
            onEndReachedThreshold={0.15}
            renderItem={renderMessage}
            ListEmptyComponent={
              <Text style={{ color: t.textMuted, fontFamily: FF.regular, textAlign: 'center', marginTop: 24 }}>
                No messages yet. Say hello!
              </Text>
            }
          />
        )}

        {error ? (
          <Text style={{ color: t.textMuted, paddingHorizontal: 16, fontFamily: FF.regular, fontSize: 13 }}>{error}</Text>
        ) : null}

        {peerTyping ? (
          <Text
            style={{
              paddingHorizontal: 16,
              paddingBottom: 6,
              fontSize: 13,
              fontFamily: FF.regular,
              color: t.textMuted,
              fontStyle: 'italic',
            }}
            numberOfLines={1}
          >
            {peerLabel} is typing…
          </Text>
        ) : null}

        <View
          style={[
            styles.inputRow,
            {
              borderTopColor: t.border,
              backgroundColor: t.bgElevated,
              paddingBottom: Math.max(scrollPad - 36, insets.bottom + 12),
            },
          ]}
        >
          <TextInput
            value={input}
            onChangeText={onInputChange}
            placeholder="Message…"
            placeholderTextColor={t.textMuted}
            style={[
              styles.input,
              { color: t.text, borderColor: t.border, backgroundColor: t.inputSurface, fontFamily: FF.regular },
            ]}
            multiline
            maxLength={4000}
            editable={!sending}
          />
          <Pressable
            onPress={() => void send()}
            disabled={sending || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: t.brand, opacity: sending || !input.trim() ? 0.45 : pressed ? 0.85 : 1 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: '#fff', fontFamily: FF.semibold }}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backHit: { paddingVertical: 8, paddingHorizontal: 8, minWidth: 56 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17 },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendBtn: {
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 72,
  },
});
