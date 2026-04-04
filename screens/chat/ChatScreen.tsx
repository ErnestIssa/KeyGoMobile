import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
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
import { useChatThreadComposerBottomInset } from '../../navigation/floatingTabBar';
import type { ChatStackParamList } from '../../navigation/types';
import { friendlyErrorMessage } from '../../lib/userFacingError';
import { listChatMessages, markConversationRead, postChatMessage, type ChatMessage } from '../../services/api';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

const POLL_MS = 4000;

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
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await listChatMessages(conversationId);
      setMessages(res.messages);
      setError(null);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadMessages();
      void markConversationRead(conversationId).then(() => void refreshUnread());
      const id = setInterval(() => void loadMessages(), POLL_MS);
      return () => clearInterval(id);
    }, [conversationId, loadMessages, refreshUnread])
  );

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await postChatMessage(conversationId, text);
      setMessages((prev) => [...prev, res.message]);
    } catch (e) {
      setError(friendlyErrorMessage(e));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const myId = user?.id ?? '';

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
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const mine = item.senderId === myId;
              const inboundUnread = !mine && item.isUnread;
              const ds = item.deliveryStatus;
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
                  ]}
                >
                  {!mine ? (
                    <ChatAvatar
                      name={item.senderName ?? item.senderDisplayName ?? '?'}
                      avatarUrl={item.senderAvatarUrl}
                      size={28}
                    />
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
                  </View>
                  {mine ? (
                    <ChatAvatar
                      name={user?.name ?? '?'}
                      firstName={user?.firstName}
                      lastName={user?.lastName}
                      avatarUrl={user?.avatarUrl}
                      size={28}
                    />
                  ) : null}
                </View>
              );
            }}
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
            onChangeText={setInput}
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
    marginBottom: 10,
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
