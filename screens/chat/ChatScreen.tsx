import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenContainer } from '../../components/ScreenContainer';
import { BlurModalScrim } from '../../components/ui/BlurModalScrim';
import { ChatAvatar } from '../../components/chat/ChatAvatar';
import { ChatBottomSheet } from '../../components/chat/ChatBottomSheet';
import { useAuth } from '../../context/AuthContext';
import { useChatUnread } from '../../context/ChatUnreadContext';
import { outgoingDeliveryStatus } from '../../lib/chatDelivery';
import { friendlyErrorMessage } from '../../lib/userFacingError';
import { useChatThreadComposerBottomInset } from '../../navigation/floatingTabBar';
import type { ChatStackParamList } from '../../navigation/types';
import {
  deleteChatMessageApi,
  patchConversationPin,
  patchMessageReaction,
  patchMessageStar,
  postChatCallLog,
  postChatMessage as apiPostChatMessage,
  reportChatMessage,
  uploadChatMedia,
  listChatMessages,
  markConversationRead,
  type ChatMessage,
} from '../../services/api';
import { resolveChatMediaUrl } from '../../services/mediaUrl';
import { setActiveChatConversationId } from '../../services/chatPresence';
import { getSharedChatSocket } from '../../services/chatSocket';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import type { Socket } from 'socket.io-client';

const TYPING_EMIT_MS = 400;
const TYPING_STOP_MS = 2800;
const GROUP_WINDOW_MS = 5 * 60 * 1000;
/** FlatList uses paddingHorizontal 16 each side; this is extra breathing room inside that column. */
const THREAD_BUBBLE_HORIZONTAL_GUTTER = 8;
/** Extra vertical gap when the other person replies after you (or vice versa). */
const DIFFERENT_SENDER_EXTRA_GAP = 14;
const MAX_AUDIO_SEC = 120;
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏'];
const EMOJI_SUGGESTIONS = [...QUICK_REACTIONS, '✨', '🔥', '💯', '😊', '🎉', '👏'];
/** Drag mic up past this (negative Y) to lock hands-free recording. */
const VOICE_LOCK_DRAG_PX = -56;

function MicWaveBars({ active, color }: { active: boolean; color: string }) {
  const barHeights = useRef(Array.from({ length: 9 }, (_, i) => new Animated.Value(6 + (i % 3) * 2))).current;

  useEffect(() => {
    if (!active) {
      barHeights.forEach((a) => a.setValue(6));
      return;
    }
    const loops = barHeights.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 22 + (i % 5) * 2,
            duration: 160 + ((i * 37) % 120),
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 8,
            duration: 180,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => {
      loops.forEach((l) => l.stop());
    };
  }, [active, barHeights]);

  return (
    <View style={styles.micWaveRow}>
      {barHeights.map((h, i) => (
        <Animated.View key={i} style={[styles.micWaveBar, { backgroundColor: color, height: h }]} />
      ))}
    </View>
  );
}

function normalizeMessage(m: ChatMessage): ChatMessage {
  const createdAt =
    typeof m.createdAt === 'string'
      ? m.createdAt
      : (m.createdAt as unknown) instanceof Date
        ? ((m.createdAt as unknown) as Date).toISOString()
        : String(m.createdAt);
  return { ...m, createdAt };
}

function mergeUpdated(prev: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const n = normalizeMessage(next);
  const i = prev.findIndex((x) => x.id === n.id);
  if (i === -1) return [...prev, n];
  const copy = [...prev];
  copy[i] = n;
  return copy;
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
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [showEmojiSuggestions, setShowEmojiSuggestions] = useState(false);
  const [voicePreview, setVoicePreview] = useState<{ uri: string; durationSec: number } | null>(null);
  const [recordLocked, setRecordLocked] = useState(false);
  const [actionMsg, setActionMsg] = useState<ChatMessage | null>(null);
  const [reactionMsg, setReactionMsg] = useState<ChatMessage | null>(null);
  const [customEmoji, setCustomEmoji] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordSecs, setRecordSecs] = useState(0);
  /** Incoming messages received live in this session — rendered bolder. */
  const [newMessageHighlightIds, setNewMessageHighlightIds] = useState<Record<string, boolean>>({});
  const [pulsingMessageId, setPulsingMessageId] = useState<string | null>(null);
  const pulseOpacity = useRef(new Animated.Value(1)).current;
  const composerActionAnim = useRef(new Animated.Value(0)).current;

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  /** Avoid re-scrolling to the same pinned message on every `messages` update. */
  const pinScrollDoneKeyRef = useRef<string | null>(null);
  const composerInputRef = useRef<TextInput>(null);
  const swipeableByMessageId = useRef<Map<string, SwipeableMethods>>(new Map());
  const replySwipePulseScale = useRef<Map<string, Animated.Value>>(new Map());
  const getReplySwipePulseScale = useCallback((messageId: string) => {
    const m = replySwipePulseScale.current;
    let v = m.get(messageId);
    if (!v) {
      v = new Animated.Value(1);
      m.set(messageId, v);
    }
    return v;
  }, []);
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef('');
  const typingEmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingLockedRef = useRef(false);

  messagesRef.current = messages;

  const scrollToPinnedMessageId = useCallback((messageId: string | null | undefined) => {
    if (!messageId || !listRef.current) return;
    const idx = messagesRef.current.findIndex((m) => m.id === messageId);
    if (idx < 0) return;
    const run = () => {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.32 });
      } catch {
        /* scrollToIndex can throw if list not ready */
      }
    };
    requestAnimationFrame(() => setTimeout(run, 48));
  }, []);

  useEffect(() => {
    pinScrollDoneKeyRef.current = null;
  }, [conversationId]);

  /** After load or when pin exists, scroll to pinned once per conversation+pin id. */
  useEffect(() => {
    if (loading || !pinnedMessageId || messages.length === 0) return;
    const idx = messages.findIndex((m) => m.id === pinnedMessageId);
    if (idx < 0) return;
    const key = `${conversationId}:${pinnedMessageId}`;
    if (pinScrollDoneKeyRef.current === key) return;
    const t = setTimeout(() => {
      pinScrollDoneKeyRef.current = key;
      scrollToPinnedMessageId(pinnedMessageId);
    }, 280);
    return () => clearTimeout(t);
  }, [loading, conversationId, pinnedMessageId, messages, scrollToPinnedMessageId]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await listChatMessages(conversationId);
      setMessages(res.messages.map(normalizeMessage));
      setPeerLastReadAt(res.peerLastReadAt ?? null);
      setPinnedMessageId(res.pinnedMessageId ?? null);
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
        /* no asset */
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
      setActiveChatConversationId(conversationId);
      setLoading(true);
      void loadMessages();
      void markConversationRead(conversationId).then(() => void refreshUnread());

      const onConnect = () => {
        const sock = socketRef.current;
        if (!sock) return;
        sock.emit('join_conversation', conversationId);
        sock.emit('messages_read', { conversationId });
      };

      const onNewMessage = (payload: { message: ChatMessage }) => {
        const raw = payload?.message;
        if (!raw) return;
        const m = normalizeMessage(raw);
        if (m.conversationId !== conversationId) return;
        if (m.senderId !== myIdRef.current) {
          m.isUnread = true;
          void playIncomingFx();
          const sock = socketRef.current;
          sock?.emit('message_delivered', { messageId: m.id });
          setNewMessageHighlightIds((prev) => ({ ...prev, [m.id]: true }));
          setPulsingMessageId(m.id);
        }
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        if (m.senderId !== myIdRef.current) {
          void markConversationRead(conversationId).then(() => {
            void refreshUnread();
            const sock = socketRef.current;
            sock?.emit('messages_read', { conversationId });
            setMessages((prev) =>
              prev.map((x) => (x.senderId !== myIdRef.current ? { ...x, isUnread: false } : x))
            );
          });
        }
      };

      const onMessageUpdated = (payload: { message?: ChatMessage }) => {
        const m = payload?.message;
        if (!m || m.conversationId !== conversationId) return;
        setMessages((prev) => mergeUpdated(prev, normalizeMessage(m)));
      };

      const onMessageDelivery = (payload: { conversationId?: string; messageId?: string }) => {
        if (!payload || payload.conversationId !== conversationId || !payload.messageId) return;
        setMessages((prev) =>
          prev.map((x) =>
            x.id === payload.messageId && x.senderId === myIdRef.current
              ? { ...x, deliveryStatus: 'delivered' }
              : x
          )
        );
      };

      const onMessagesRead = (payload: { conversationId?: string; readerId?: string; readAt?: string }) => {
        if (!payload || payload.conversationId !== conversationId) return;
        if (payload.readerId === myIdRef.current) return;
        const readAt = payload.readAt;
        if (!readAt) return;
        setPeerLastReadAt((prev) => {
          if (!prev) return readAt;
          return new Date(readAt) > new Date(prev) ? readAt : prev;
        });
      };

      const onUserTyping = (payload: { conversationId?: string; userId?: string; isTyping?: boolean }) => {
        if (!payload || payload.conversationId !== conversationId) return;
        if (payload.userId === myIdRef.current) return;
        const typing = Boolean(payload.isTyping);
        if (peerTypingStopTimerRef.current) clearTimeout(peerTypingStopTimerRef.current);
        setPeerTyping(typing);
        if (typing) {
          peerTypingStopTimerRef.current = setTimeout(() => setPeerTyping(false), 6000);
        }
      };

      void (async () => {
        const socket = await getSharedChatSocket();
        if (cancelled || !socket) return;
        socketRef.current = socket;
        if (socket.connected) onConnect();
        else socket.on('connect', onConnect);

        socket.on('new_message', onNewMessage);
        socket.on('message_updated', onMessageUpdated);
        socket.on('message_delivery', onMessageDelivery);
        socket.on('messages_read', onMessagesRead);
        socket.on('user_typing', onUserTyping);
      })();

      return () => {
        cancelled = true;
        setActiveChatConversationId(null);
        const s = socketRef.current;
        if (s) {
          s.emit('typing', { conversationId, isTyping: false });
          s.off('connect', onConnect);
          s.off('new_message', onNewMessage);
          s.off('message_updated', onMessageUpdated);
          s.off('message_delivery', onMessageDelivery);
          s.off('messages_read', onMessagesRead);
          s.off('user_typing', onUserTyping);
        }
        socketRef.current = null;
        if (typingEmitTimerRef.current) clearTimeout(typingEmitTimerRef.current);
        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
        if (peerTypingStopTimerRef.current) clearTimeout(peerTypingStopTimerRef.current);
      };
    }, [conversationId, loadMessages, refreshUnread, playIncomingFx])
  );

  useEffect(() => {
    setNewMessageHighlightIds({});
    setPulsingMessageId(null);
  }, [conversationId]);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      setShowEmojiSuggestions(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!pulsingMessageId) return;
    pulseOpacity.setValue(1);
    const steps: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < 3; i++) {
      steps.push(
        Animated.timing(pulseOpacity, { toValue: 0.58, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 1, duration: 150, useNativeDriver: true })
      );
    }
    const seq = Animated.sequence(steps);
    seq.start(({ finished }) => {
      if (finished) setPulsingMessageId(null);
    });
    return () => seq.stop();
  }, [pulsingMessageId, pulseOpacity]);

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

  const sendPayload = useCallback(
    async (text: string, extra?: Parameters<typeof apiPostChatMessage>[2]) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      setInput('');
      setReplyTo(null);
      socketRef.current?.emit('typing', { conversationId, isTyping: false });

      const socket = socketRef.current;
      const payload = {
        conversationId,
        text: trimmed,
        replyToMessageId: extra?.replyToMessageId,
        kind: extra?.kind,
        mediaUrl: extra?.mediaUrl,
        fileName: extra?.fileName,
        mimeType: extra?.mimeType,
        durationSec: extra?.durationSec,
      };

      if (socket?.connected) {
        const ackTimer = setTimeout(() => setSending(false), 12000);
        socket.emit(
          'send_message',
          payload,
          (ack: { ok: true } | { ok: false; error?: string } | undefined) => {
            clearTimeout(ackTimer);
            setSending(false);
            if (ack && 'ok' in ack && ack.ok === false) {
              void apiPostChatMessage(conversationId, trimmed, extra).then((res) => {
                setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
              }).catch((e) => {
                setError(friendlyErrorMessage(e));
                setInput(trimmed);
              });
            }
          }
        );
        return;
      }

      try {
        const res = await apiPostChatMessage(conversationId, trimmed, extra);
        setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
      } catch (e) {
        setError(friendlyErrorMessage(e));
        setInput(trimmed);
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending]
  );

  const send = () => void sendPayload(input, replyTo ? { replyToMessageId: replyTo.id } : undefined);

  const pickImage = async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow library access to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSending(true);
    try {
      const asset = result.assets[0];
      const res = await uploadChatMedia(
        conversationId,
        'image',
        { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: 'image/jpeg' },
        {}
      );
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const pickVideo = async () => {
    setShowAttach(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSending(true);
    try {
      const asset = result.assets[0];
      const res = await uploadChatMedia(
        conversationId,
        'video',
        { uri: asset.uri, name: asset.fileName ?? 'video.mp4', type: 'video/mp4' },
        {}
      );
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const takePhotoFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Allow camera access to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSending(true);
    try {
      const asset = result.assets[0];
      const res = await uploadChatMedia(
        conversationId,
        'image',
        { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: 'image/jpeg' },
        {}
      );
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const recordVideoFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera', 'Allow camera access to record video.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      videoMaxDuration: 120,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setSending(true);
    try {
      const asset = result.assets[0];
      const res = await uploadChatMedia(
        conversationId,
        'video',
        { uri: asset.uri, name: asset.fileName ?? 'video.mp4', type: 'video/mp4' },
        {}
      );
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const openComposerCameraMenu = () => {
    void Haptics.selectionAsync();
    const run = (which: 'libPhoto' | 'libVideo' | 'camPhoto' | 'camVideo') => {
      if (which === 'libPhoto') void pickImage();
      else if (which === 'libVideo') void pickVideo();
      else if (which === 'camPhoto') void takePhotoFromCamera();
      else void recordVideoFromCamera();
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Photo library', 'Video library', 'Take photo', 'Record video'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) run('libPhoto');
          else if (buttonIndex === 2) run('libVideo');
          else if (buttonIndex === 3) run('camPhoto');
          else if (buttonIndex === 4) run('camVideo');
        }
      );
    } else {
      Alert.alert('Photo or video', 'Choose a source', [
        { text: 'Photo library', onPress: () => run('libPhoto') },
        { text: 'Video library', onPress: () => run('libVideo') },
        { text: 'Take photo', onPress: () => run('camPhoto') },
        { text: 'Record video', onPress: () => run('camVideo') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const pickFile = async () => {
    setShowAttach(false);
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setSending(true);
    try {
      const r = await uploadChatMedia(
        conversationId,
        'file',
        { uri: a.uri, name: a.name ?? 'file', type: a.mimeType ?? 'application/octet-stream' },
        {}
      );
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(r.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const cancelRecordingInProgress = useCallback(async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = recordingRef.current ?? recording;
    recordingRef.current = null;
    setRecording(null);
    recordingLockedRef.current = false;
    setRecordLocked(false);
    setRecordSecs(0);
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
    } catch {
      /* ignore */
    }
  }, [recording]);

  const finishRecordingToPreview = useCallback(async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = recordingRef.current ?? recording;
    recordingRef.current = null;
    setRecording(null);
    recordingLockedRef.current = false;
    setRecordLocked(false);
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      const status = await rec.getStatusAsync();
      const durMs = status.durationMillis ?? recordSecs * 1000;
      const durationSec = Math.min(MAX_AUDIO_SEC, Math.max(1, Math.round(durMs / 1000)));
      if (!uri || durationSec < 1) return;
      setVoicePreview({ uri, durationSec });
    } catch (e) {
      setError(friendlyErrorMessage(e));
    } finally {
      setRecordSecs(0);
    }
  }, [recordSecs, recording]);

  const finishRecordingToPreviewRef = useRef(finishRecordingToPreview);
  finishRecordingToPreviewRef.current = finishRecordingToPreview;

  const sendVoiceFromPreview = useCallback(async () => {
    if (!voicePreview) return;
    const { uri, durationSec } = voicePreview;
    setVoicePreview(null);
    setSending(true);
    try {
      const r = await uploadChatMedia(
        conversationId,
        'audio',
        { uri, name: 'voice.m4a', type: 'audio/m4a' },
        { durationSec }
      );
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(r.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
      setVoicePreview({ uri, durationSec });
    } finally {
      setSending(false);
    }
  }, [conversationId, voicePreview]);

  const discardVoicePreview = useCallback(() => {
    setVoicePreview(null);
  }, []);

  const startRecording = useCallback(async (fromAttachModal = false) => {
    if (fromAttachModal) setShowAttach(false);
    if (voicePreview || sending || recordingRef.current) return;
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Microphone', 'Allow microphone to send voice messages.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = rec;
      setRecording(rec);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          const n = s + 1;
          if (n >= MAX_AUDIO_SEC) {
            void finishRecordingToPreviewRef.current();
          }
          return n;
        });
      }, 1000);
    } catch (e) {
      setError(friendlyErrorMessage(e));
    }
  }, [voicePreview, sending]);

  const handleMicGestureBegin = useCallback(() => {
    if (sending || voicePreview) return;
    recordingLockedRef.current = false;
    setRecordLocked(false);
    void startRecording(false);
  }, [sending, voicePreview, startRecording]);

  const handleMicGestureLock = useCallback(() => {
    if (recordingLockedRef.current || !recordingRef.current) return;
    recordingLockedRef.current = true;
    setRecordLocked(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleMicGestureEnd = useCallback(() => {
    if (recordingLockedRef.current) return;
    setTimeout(() => {
      void finishRecordingToPreview();
    }, 48);
  }, [finishRecordingToPreview]);

  const micHoldGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onStart(() => {
          runOnJS(handleMicGestureBegin)();
        })
        .onUpdate((e) => {
          if (e.translationY < VOICE_LOCK_DRAG_PX) {
            runOnJS(handleMicGestureLock)();
          }
        })
        .onEnd(() => {
          runOnJS(handleMicGestureEnd)();
        }),
    [handleMicGestureBegin, handleMicGestureLock, handleMicGestureEnd]
  );

  const logCall = async (callKind: 'voice' | 'video', status: 'completed' | 'missed' | 'declined', durationSec?: number) => {
    try {
      const res = await postChatCallLog(conversationId, { callKind, status, durationSec });
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
    }
  };

  const onVoiceHeader = () => {
    void Haptics.selectionAsync();
    Alert.alert(
      'Voice call',
      'A voice call entry will be added to this chat. Full in-app calling may use your system dialer when a phone number is available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log call',
          onPress: () => void logCall('voice', 'completed', 0),
        },
      ]
    );
  };

  const onVideoHeader = () => {
    void Haptics.selectionAsync();
    Alert.alert(
      'Video call',
      'A video call entry will be added to this chat. In-app video uses your device camera when supported.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log call',
          onPress: () => void logCall('video', 'completed', 0),
        },
      ]
    );
  };

  const applyReaction = async (emoji: string) => {
    if (!reactionMsg) return;
    try {
      const res = await patchMessageReaction(reactionMsg.id, emoji);
      setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
    } catch (e) {
      setError(friendlyErrorMessage(e));
    }
    setReactionMsg(null);
    setCustomEmoji('');
  };

  const myId = user?.id ?? '';
  const peerLabel = peerDisplayName ?? otherUserName ?? peerName ?? 'Driver';
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  /** List content width = screen − 32px horizontal padding; bubbles can span nearly that full width. */
  const listContentWidth = Math.max(200, windowWidth - 32);
  const maxBubbleWidth = Math.max(200, listContentWidth - THREAD_BUBBLE_HORIZONTAL_GUTTER);
  /** Multiline composer grows with content but caps relative to screen (keyboard / small devices). */
  const composerInputMaxHeight = Math.min(180, Math.max(96, Math.round(windowHeight * 0.32)));

  const focusComposer = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => composerInputRef.current?.focus(), 32);
    });
  }, []);

  /**
   * Outside keyboard + composer: dismiss keyboard. If there is no draft text, abort reply.
   * If the user already typed something, keep draft and replyTo until they send or clear manually.
   */
  const handleDismissComposerZoneOutside = useCallback(() => {
    Keyboard.dismiss();
    if (!input.trim() && replyTo) {
      setReplyTo(null);
    }
  }, [input, replyTo]);

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const mine = item.senderId === myId;
      const prev = index > 0 ? messages[index - 1] : undefined;
      const prevTime = prev ? new Date(prev.createdAt).getTime() : 0;
      const curTime = new Date(item.createdAt).getTime();
      const sameGroup =
        prev &&
        prev.senderId === item.senderId &&
        !Number.isNaN(prevTime) &&
        !Number.isNaN(curTime) &&
        curTime - prevTime < GROUP_WINDOW_MS;
      const senderSwitched = Boolean(prev && prev.senderId !== item.senderId);
      const showMeta = !sameGroup;
      const rowMarginBottom = sameGroup ? 4 : senderSwitched ? 10 + DIFFERENT_SENDER_EXTRA_GAP : 10;

      const ds = mine ? outgoingDeliveryStatus(item.createdAt, peerLastReadAt) : item.deliveryStatus;
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

      const incomingBold = !mine && Boolean(newMessageHighlightIds[item.id]);
      const showPulse = !mine && pulsingMessageId === item.id;
      const BubbleShell = showPulse ? Animated.View : View;

      const reactionList = item.reactions ?? [];
      const emojiCounts = new Map<string, number>();
      for (const r of reactionList) {
        emojiCounts.set(r.emoji, (emojiCounts.get(r.emoji) ?? 0) + 1);
      }
      const emojiEntries = [...emojiCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const hasBottomCluster =
        Boolean(item.isPinned) || Boolean(item.starredByMe) || emojiEntries.length > 0;

      const clusterChipBg = mine
        ? { backgroundColor: t.brand }
        : { backgroundColor: item.isUnread && !mine ? t.brandSoft : t.bgSubtle };
      const clusterChipBorder = mine
        ? { borderColor: 'rgba(255,255,255,0.38)' }
        : { borderColor: item.isUnread && !mine ? t.brand : t.border };

      const bubble = (
        <View
          style={[
            styles.messageBodyFrame,
            { maxWidth: maxBubbleWidth, alignSelf: mine ? 'flex-end' : 'flex-start' },
          ]}
        >
          <View style={styles.bubbleWrap}>
          <Pressable
            onPress={handleDismissComposerZoneOutside}
            onLongPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setActionMsg(item);
            }}
            delayLongPress={380}
            style={({ pressed }) => [pressed && { opacity: 0.92 }]}
          >
            <BubbleShell
              style={[
                styles.bubble,
                { maxWidth: maxBubbleWidth },
                mine
                  ? {
                      backgroundColor: t.brand,
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,255,255,0.38)',
                    }
                  : {
                      backgroundColor: item.isUnread && !mine ? t.brandSoft : t.bgSubtle,
                      borderWidth: 1.5,
                      borderColor: item.isUnread && !mine ? t.brand : t.border,
                    },
                hasBottomCluster ? { paddingBottom: 14 } : undefined,
                showPulse ? { opacity: pulseOpacity } : undefined,
              ]}
            >
            {item.replyToPreview ? (
              <View
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: mine ? 'rgba(255,255,255,0.6)' : t.brand,
                  paddingLeft: 8,
                  marginBottom: 6,
                }}
              >
                <Text
                  numberOfLines={2}
                  style={{ color: mine ? 'rgba(255,255,255,0.85)' : t.textMuted, fontSize: 12, fontFamily: FF.regular }}
                >
                  {item.replyToPreview}
                </Text>
              </View>
            ) : null}
            {item.kind === 'image' && item.mediaUrl ? (
              <Image
                source={{ uri: resolveChatMediaUrl(item.mediaUrl) ?? '' }}
                style={{
                  width: Math.max(120, Math.min(280, maxBubbleWidth - 28)),
                  height: 160,
                  borderRadius: 12,
                  marginBottom: item.text ? 6 : 0,
                  maxWidth: '100%',
                }}
                resizeMode="cover"
              />
            ) : null}
            {item.kind === 'video' && item.mediaUrl ? (
              <Text
                style={{
                  color: mine ? '#fff' : t.text,
                  fontFamily: incomingBold && !mine ? FF.bold : FF.semibold,
                  marginBottom: 4,
                }}
              >
                🎬 Video
              </Text>
            ) : null}
            {item.kind === 'file' ? (
              <Text
                style={{
                  color: mine ? '#fff' : t.brand,
                  fontFamily: incomingBold && !mine ? FF.bold : FF.semibold,
                  marginBottom: 4,
                }}
              >
                📎 {item.fileName ?? 'File'}
              </Text>
            ) : null}
            {item.kind === 'audio' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
                <Ionicons name="mic" size={18} color={mine ? '#fff' : t.brand} />
                <Text
                  style={{
                    color: mine ? '#fff' : t.text,
                    fontFamily: incomingBold && !mine ? FF.semibold : FF.semibold,
                    fontSize: 15,
                  }}
                >
                  {item.durationSec != null ? `${item.durationSec}s` : 'Voice'}
                </Text>
                <Text
                  style={{
                    color: mine ? 'rgba(255,255,255,0.75)' : t.textMuted,
                    fontSize: 11,
                    fontFamily: FF.regular,
                  }}
                >
                  {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {mine && deliveryLabel ? (
                  <Text style={{ color: deliveryTint, fontSize: 11, fontFamily: FF.semibold }}>{deliveryLabel}</Text>
                ) : null}
                {!mine && item.isUnread ? (
                  <Text style={{ color: t.brand, fontSize: 11, fontFamily: FF.semibold }}>New</Text>
                ) : null}
              </View>
            ) : null}
            {item.kind === 'call' ? (
              <Text
                style={{
                  color: mine ? '#fff' : t.text,
                  fontFamily: incomingBold ? FF.bold : FF.semibold,
                  flexShrink: 1,
                }}
              >
                {item.text}
              </Text>
            ) : item.kind !== 'audio' ? (
              <Text
                style={{
                  color: mine ? '#fff' : t.text,
                  fontFamily: incomingBold ? FF.bold : FF.regular,
                  fontSize: 15,
                  lineHeight: 21,
                  flexShrink: 1,
                }}
              >
                {item.deletedPlaceholder ? item.text : item.text}
              </Text>
            ) : null}
            {showMeta && item.kind !== 'audio' ? (
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
                {!mine && item.isUnread ? (
                  <Text style={{ color: t.brand, fontSize: 11, fontFamily: FF.semibold, marginLeft: 8 }}>
                    New
                  </Text>
                ) : null}
              </View>
            ) : mine && item.kind !== 'audio' ? (
              <View style={[styles.metaRow, { justifyContent: 'flex-end' }]}>
                {deliveryLabel ? (
                  <Text style={{ color: deliveryTint, fontSize: 11, fontFamily: FF.semibold, marginTop: 2 }}>
                    {deliveryLabel}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </BubbleShell>
          </Pressable>
          {hasBottomCluster ? (
            <View style={styles.reactionClusterDock} pointerEvents="box-none">
              <View style={styles.reactionClusterRow}>
                {item.isPinned ? (
                  <View style={[styles.reactionClusterChip, clusterChipBg, clusterChipBorder]}>
                    <Ionicons name="pin" size={13} color={mine ? '#fff' : t.brand} />
                  </View>
                ) : null}
                {item.starredByMe ? (
                  <View style={[styles.reactionClusterChip, clusterChipBg, clusterChipBorder]}>
                    <Ionicons name="star" size={12} color="#ca8a04" />
                  </View>
                ) : null}
                {emojiEntries.map(([emoji, count]) => (
                  <View key={emoji} style={[styles.reactionClusterChip, clusterChipBg, clusterChipBorder]}>
                    <Text style={{ fontSize: 14 }}>{emoji}</Text>
                    {count > 1 ? (
                      <Text
                        style={{
                          fontSize: 11,
                          fontFamily: FF.semibold,
                          marginLeft: 3,
                          color: mine ? 'rgba(255,255,255,0.95)' : t.textMuted,
                        }}
                      >
                        {count}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          </View>
        </View>
      );

      const pulseScale = getReplySwipePulseScale(item.id);
      const triggerReplyFromSwipe = (swipeableMethods: SwipeableMethods) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 0.82, duration: 85, useNativeDriver: true }),
          Animated.spring(pulseScale, { toValue: 1, friction: 6, tension: 220, useNativeDriver: true }),
        ]).start();
        setReplyTo(item);
        requestAnimationFrame(() => swipeableMethods.close());
        focusComposer();
      };

      const renderReplyIconStrip = (
        _p: unknown,
        _t: unknown,
        swipeableMethods: SwipeableMethods
      ) => {
        swipeableByMessageId.current.set(item.id, swipeableMethods);
        return (
          <View style={styles.replySwipeIconOnly}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reply to this message"
              hitSlop={14}
              onPress={() => triggerReplyFromSwipe(swipeableMethods)}
              style={({ pressed }) => [pressed && { opacity: 0.88 }]}
            >
              <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                <Ionicons name="arrow-undo" size={28} color={t.brand} />
              </Animated.View>
            </Pressable>
          </View>
        );
      };

      return (
        <ReanimatedSwipeable
          friction={2}
          overshootLeft={false}
          overshootRight={false}
          onSwipeableOpen={(direction) => {
            const theirsOpened = direction === SwipeDirection.RIGHT;
            const mineOpened = direction === SwipeDirection.LEFT;
            if (mine && !mineOpened) return;
            if (!mine && !theirsOpened) return;
            const sm = swipeableByMessageId.current.get(item.id);
            if (sm) triggerReplyFromSwipe(sm);
            else {
              setReplyTo(item);
              focusComposer();
            }
          }}
          renderLeftActions={mine ? undefined : renderReplyIconStrip}
          renderRightActions={mine ? renderReplyIconStrip : undefined}
        >
          <View
            style={[
              styles.bubbleRow,
              mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
              { marginBottom: rowMarginBottom + (hasBottomCluster ? 14 : 0) },
            ]}
          >
            {bubble}
          </View>
        </ReanimatedSwipeable>
      );
    },
    [
      messages,
      myId,
      peerLastReadAt,
      t,
      user,
      focusComposer,
      newMessageHighlightIds,
      pulsingMessageId,
      pulseOpacity,
      maxBubbleWidth,
      getReplySwipePulseScale,
      handleDismissComposerZoneOutside,
    ]
  );

  const isComposingText = input.trim().length > 0;
  const liquidBg = t.inputSurface;
  const liquidBorder = t.border;

  useEffect(() => {
    Animated.timing(composerActionAnim, {
      toValue: isComposingText ? 1 : 0,
      duration: 580,
      easing: Easing.bezier(0.33, 0.01, 0.25, 1),
      useNativeDriver: true,
    }).start();
  }, [isComposingText, composerActionAnim]);

  const idlePairOpacity = composerActionAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const idlePairTx = composerActionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 28] });
  const sendSlotOpacity = composerActionAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const sendSlotTx = composerActionAnim.interpolate({ inputRange: [0, 1], outputRange: [-32, 0] });

  return (
    <ScreenContainer align="stretch" scrollable={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <Pressable
          style={[styles.header, { paddingTop: Math.max(insets.top, 12), borderBottomColor: t.border }]}
          onPress={handleDismissComposerZoneOutside}
        >
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
            <ChatAvatar name={peerName ?? otherUserName ?? '?'} avatarUrl={peerAvatarUrl} size={32} />
            <Text style={[styles.headerTitle, { color: t.text, fontFamily: FF.bold }]} numberOfLines={1}>
              {peerDisplayName ?? otherUserName ?? 'Chat'}
            </Text>
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable onPress={onVoiceHeader} hitSlop={10} style={styles.iconHit}>
              <Ionicons name="call" size={22} color={t.brand} />
            </Pressable>
            <Pressable onPress={onVideoHeader} hitSlop={10} style={styles.iconHit}>
              <Ionicons name="videocam" size={24} color={t.brand} />
            </Pressable>
          </View>
        </Pressable>

        {loading ? (
          <Pressable style={styles.center} onPress={handleDismissComposerZoneOutside}>
            <ActivityIndicator color={t.brand} />
          </Pressable>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            extraData={{ peerLastReadAt, messagesLen: messages.length }}
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={handleDismissComposerZoneOutside}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 8,
              flexGrow: 1,
            }}
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: false });
            }}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({
                  index: info.index,
                  animated: true,
                  viewPosition: 0.32,
                });
              }, 400);
            }}
            onEndReached={() => {
              socketRef.current?.emit('messages_read', { conversationId });
            }}
            onEndReachedThreshold={0.15}
            renderItem={renderMessage}
            ListEmptyComponent={
              <Pressable onPress={handleDismissComposerZoneOutside}>
                <Text style={{ color: t.textMuted, fontFamily: FF.regular, textAlign: 'center', marginTop: 24 }}>
                  No messages yet. Say hello!
                </Text>
              </Pressable>
            }
          />
        )}

        {error ? (
          <Pressable onPress={handleDismissComposerZoneOutside}>
            <Text style={{ color: t.textMuted, paddingHorizontal: 16, fontFamily: FF.regular, fontSize: 13 }}>{error}</Text>
          </Pressable>
        ) : null}

        {peerTyping ? (
          <Pressable onPress={handleDismissComposerZoneOutside}>
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
          </Pressable>
        ) : null}

        {voicePreview ? (
          <View style={[styles.voicePreviewBar, { backgroundColor: t.bgSubtle, borderColor: t.border }]}>
            <Ionicons name="mic" size={22} color={t.brand} />
            <Text style={{ color: t.text, fontFamily: FF.semibold, flex: 1 }}>
              {voicePreview.durationSec}s · Ready to send
            </Text>
            <Pressable onPress={discardVoicePreview} hitSlop={8} style={styles.voicePreviewBtn}>
              <Text style={{ color: t.textMuted, fontFamily: FF.semibold }}>Undo</Text>
            </Pressable>
            <Pressable
              onPress={() => void sendVoiceFromPreview()}
              disabled={sending}
              style={[styles.voicePreviewBtnSend, { backgroundColor: t.brand, opacity: sending ? 0.5 : 1 }]}
            >
              <Text style={{ color: '#fff', fontFamily: FF.bold }}>Send</Text>
            </Pressable>
          </View>
        ) : null}

        {recording ? (
          <View style={[styles.recordingBar, { backgroundColor: t.danger + '22' }]}>
            <MicWaveBars active={!!recording} color={t.danger} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.danger, fontFamily: FF.semibold }}>
                {recordLocked ? 'Locked · slide down mic to cancel, or Stop' : 'Hold to record · slide ↑ to lock'}
              </Text>
              <Text style={{ color: t.textMuted, fontFamily: FF.regular, fontSize: 12, marginTop: 2 }}>
                {recordSecs}s / {MAX_AUDIO_SEC}s max
              </Text>
            </View>
            {recordLocked ? (
              <>
                <Pressable onPress={() => void cancelRecordingInProgress()} hitSlop={8}>
                  <Text style={{ color: t.textMuted, fontFamily: FF.semibold }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => void finishRecordingToPreview()} hitSlop={8}>
                  <Text style={{ color: t.brand, fontFamily: FF.bold }}>Stop</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

        {replyTo ? (
          <View style={[styles.replyBanner, { borderTopColor: t.border, backgroundColor: t.bgElevated }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.brand, fontFamily: FF.semibold, fontSize: 12 }}>Replying to</Text>
              <Text numberOfLines={2} style={{ color: t.textMuted, fontSize: 13 }}>
                {replyTo.text}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)}>
              <Text style={{ color: t.textMuted, fontSize: 18 }}>×</Text>
            </Pressable>
          </View>
        ) : null}

        {showEmojiSuggestions ? (
          <View style={[styles.emojiSuggestStrip, { borderTopColor: t.border, backgroundColor: t.bgElevated }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.emojiSuggestScroll}
            >
              {EMOJI_SUGGESTIONS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => {
                    setInput((prev) => prev + e);
                    focusComposer();
                  }}
                  style={({ pressed }) => [styles.emojiSuggestChip, { opacity: pressed ? 0.75 : 1 }]}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
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
          <View
            style={[
              styles.composerLiquid,
              {
                borderColor: liquidBorder,
                backgroundColor: liquidBg,
                ...(Platform.OS === 'ios'
                  ? {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 5 },
                      shadowOpacity: 0.1,
                      shadowRadius: 16,
                    }
                  : { elevation: 6 }),
              },
            ]}
          >
            <Pressable
              onPress={() => setShowAttach(true)}
              style={({ pressed }) => [styles.composerSideHit, pressed && { opacity: 0.82 }]}
              hitSlop={4}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel="Attach file or more"
            >
              <Text style={{ color: t.brand, fontSize: 24, fontFamily: FF.bold, lineHeight: 28 }}>+</Text>
            </Pressable>

            <View style={styles.composerInputShell}>
              <TextInput
                ref={composerInputRef}
                value={input}
                onChangeText={onInputChange}
                placeholder="Message…"
                placeholderTextColor={t.textMuted}
                style={[
                  styles.composerTextField,
                  {
                    color: t.text,
                    fontFamily: FF.regular,
                    maxHeight: composerInputMaxHeight,
                  },
                ]}
                multiline
                maxLength={4000}
                editable={!sending && !recording}
                textAlignVertical="top"
              />
              <Pressable
                onPress={() => {
                  void Haptics.selectionAsync();
                  setShowEmojiSuggestions(true);
                  focusComposer();
                }}
                style={({ pressed }) => [
                  styles.composerEmojiInset,
                  { opacity: sending ? 0.35 : pressed ? 0.75 : 1 },
                ]}
                hitSlop={8}
                disabled={sending || !!voicePreview || !!recording}
                accessibilityRole="button"
                accessibilityLabel="Emoji keyboard and suggestions"
              >
                <Ionicons name="happy-outline" size={24} color={t.brand} />
              </Pressable>
            </View>

            <View style={styles.composerRightSlot}>
              <Animated.View
                pointerEvents={isComposingText ? 'none' : 'auto'}
                style={[
                  styles.composerRightLayer,
                  {
                    opacity: idlePairOpacity,
                    transform: [{ translateX: idlePairTx }],
                  },
                ]}
              >
                <Pressable
                  onPress={() => openComposerCameraMenu()}
                  style={({ pressed }) => [styles.composerSideHit, pressed && { opacity: 0.82 }]}
                  hitSlop={4}
                  disabled={sending || !!voicePreview || !!recording}
                  accessibilityRole="button"
                  accessibilityLabel="Photo or video"
                >
                  <Ionicons name="camera" size={24} color={t.brand} />
                </Pressable>
                <GestureDetector gesture={micHoldGesture}>
                  <View style={styles.composerSideHit}>
                    <Ionicons name="mic" size={24} color={t.brand} />
                  </View>
                </GestureDetector>
              </Animated.View>
              <Animated.View
                pointerEvents={isComposingText ? 'auto' : 'none'}
                style={[
                  styles.composerSendLayer,
                  {
                    opacity: sendSlotOpacity,
                    transform: [{ translateX: sendSlotTx }],
                  },
                ]}
              >
                <Pressable
                  onPress={() => void send()}
                  disabled={sending || !input.trim()}
                  style={({ pressed }) => [
                    styles.composerSendLiquid,
                    {
                      backgroundColor: t.brand,
                      opacity: sending || !input.trim() ? 0.45 : pressed ? 0.9 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontFamily: FF.bold, fontSize: 15 }}>Send</Text>
                  )}
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BlurModalScrim
        visible={showAttach}
        onRequestClose={() => setShowAttach(false)}
        backdropStyle={{ justifyContent: 'flex-end', paddingBottom: Math.max(insets.bottom, 12) + 8, paddingHorizontal: 16 }}
      >
        <View style={[styles.attachCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          <Text style={{ color: t.text, fontFamily: FF.bold, marginBottom: 14, textAlign: 'center' }}>Attach</Text>
          <View style={styles.optionGrid}>
            <Pressable style={[styles.optionTile, { borderColor: t.border }]} onPress={() => void pickImage()}>
              <Ionicons name="image" size={36} color={t.brand} />
              <Text style={[styles.optionTileLabel, { color: t.text }]}>Photo</Text>
            </Pressable>
            <Pressable style={[styles.optionTile, { borderColor: t.border }]} onPress={() => void pickVideo()}>
              <Ionicons name="videocam" size={36} color={t.brand} />
              <Text style={[styles.optionTileLabel, { color: t.text }]}>Video</Text>
            </Pressable>
            <Pressable style={[styles.optionTile, { borderColor: t.border }]} onPress={() => void pickFile()}>
              <Ionicons name="document" size={36} color={t.brand} />
              <Text style={[styles.optionTileLabel, { color: t.text }]}>File</Text>
            </Pressable>
            <Pressable style={[styles.optionTile, { borderColor: t.border }]} onPress={() => void startRecording(true)}>
              <Ionicons name="mic" size={36} color={t.brand} />
              <Text style={[styles.optionTileLabel, { color: t.text }]}>Voice</Text>
              <Text style={[styles.optionTileHint, { color: t.textMuted }]}>Max {MAX_AUDIO_SEC}s</Text>
            </Pressable>
          </View>
        </View>
      </BlurModalScrim>

      <BlurModalScrim visible={actionMsg != null} onRequestClose={() => setActionMsg(null)}>
        <View style={[styles.attachCard, styles.actionMenuCard, { backgroundColor: t.bgElevated, borderColor: t.border }]}>
          {actionMsg ? (
            <View style={styles.optionGrid}>
              <MenuGridTile
                icon="arrow-undo"
                label="Reply"
                onPress={() => {
                  setReplyTo(actionMsg);
                  setActionMsg(null);
                  focusComposer();
                }}
                t={t}
              />
              <MenuGridTile
                icon="star-outline"
                label={actionMsg.starredByMe ? 'Unstar' : 'Star'}
                onPress={async () => {
                  try {
                    const res = await patchMessageStar(actionMsg.id, !actionMsg.starredByMe);
                    setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
                  } catch (e) {
                    setError(friendlyErrorMessage(e));
                  }
                  setActionMsg(null);
                }}
                t={t}
              />
              <MenuGridTile
                icon={actionMsg.id === pinnedMessageId ? 'close-circle-outline' : 'pin'}
                label={actionMsg.id === pinnedMessageId ? 'Unpin' : 'Pin'}
                onPress={async () => {
                  const msg = actionMsg;
                  setActionMsg(null);
                  if (!msg) return;
                  try {
                    if (msg.id === pinnedMessageId) {
                      await patchConversationPin(conversationId, null);
                      setPinnedMessageId(null);
                      pinScrollDoneKeyRef.current = null;
                    } else {
                      await patchConversationPin(conversationId, msg.id);
                      pinScrollDoneKeyRef.current = null;
                      setPinnedMessageId(msg.id);
                    }
                  } catch (e) {
                    setError(friendlyErrorMessage(e));
                  }
                }}
                t={t}
              />
              <MenuGridTile
                icon="happy-outline"
                label="React"
                onPress={() => {
                  setReactionMsg(actionMsg);
                  setActionMsg(null);
                }}
                t={t}
              />
              {actionMsg.senderId !== myId ? (
                <MenuGridTile
                  icon="flag-outline"
                  label="Report"
                  onPress={() => {
                    setReportTarget(actionMsg);
                    setActionMsg(null);
                    setReportOpen(true);
                  }}
                  t={t}
                />
              ) : null}
              {actionMsg.senderId === myId ? (
                <MenuGridTile
                  icon="trash-outline"
                  label="Delete"
                  danger
                  onPress={() => {
                    setDeleteTarget(actionMsg);
                    setActionMsg(null);
                    setDeleteOpen(true);
                  }}
                  t={t}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </BlurModalScrim>

      <BlurModalScrim visible={reactionMsg != null} onRequestClose={() => setReactionMsg(null)}>
        <View style={[styles.attachCard, { backgroundColor: t.bgElevated, borderColor: t.border, maxWidth: 360, alignSelf: 'center' }]}>
          <Text style={{ color: t.text, fontFamily: FF.bold, marginBottom: 12, textAlign: 'center' }}>Reaction</Text>
          <View style={styles.reactionEmojiGrid}>
            {QUICK_REACTIONS.map((e) => (
              <Pressable key={e} onPress={() => void applyReaction(e)} style={styles.emojiHitLarge}>
                <Text style={{ fontSize: 34 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>Custom emoji</Text>
          <TextInput
            value={customEmoji}
            onChangeText={setCustomEmoji}
            placeholder="Type one emoji"
            style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 10, color: t.text }}
            maxLength={8}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: t.brand, marginTop: 10, alignSelf: 'stretch' }]}
            onPress={() => {
              const e = customEmoji.trim();
              if (e) void applyReaction(e);
              else setReactionMsg(null);
            }}
          >
            <Text style={{ color: '#fff', fontFamily: FF.semibold, textAlign: 'center' }}>Apply</Text>
          </Pressable>
        </View>
      </BlurModalScrim>

      <ChatBottomSheet
        visible={deleteOpen}
        onRequestClose={() => setDeleteOpen(false)}
        sheetStyle={{ backgroundColor: t.bgElevated }}
      >
        <Text style={{ color: t.text, fontFamily: FF.bold, fontSize: 18 }}>Delete message?</Text>
        <Text style={{ color: t.textMuted, marginTop: 8, fontFamily: FF.regular }}>
          If the other person already received it, you can delete it for everyone. Otherwise it is removed only for you.
        </Text>
        <Pressable
          style={[styles.sheetBtn, { backgroundColor: t.danger }]}
          onPress={async () => {
            const target = deleteTarget;
            setDeleteOpen(false);
            setDeleteTarget(null);
            if (!target) return;
            try {
              const res = await deleteChatMessageApi(target.id, true);
              setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
            } catch {
              try {
                const res = await deleteChatMessageApi(target.id, false);
                setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
              } catch (e) {
                setError(friendlyErrorMessage(e));
              }
            }
          }}
        >
          <Text style={{ color: '#fff', fontFamily: FF.semibold, textAlign: 'center' }}>Delete for everyone</Text>
        </Pressable>
        <Pressable
          style={[styles.sheetBtn, { backgroundColor: t.bgSubtle, borderWidth: 1, borderColor: t.border }]}
          onPress={async () => {
            const target = deleteTarget;
            setDeleteOpen(false);
            setDeleteTarget(null);
            if (!target) return;
            try {
              const res = await deleteChatMessageApi(target.id, false);
              setMessages((prev) => mergeUpdated(prev, normalizeMessage(res.message)));
            } catch (e) {
              setError(friendlyErrorMessage(e));
            }
          }}
        >
          <Text style={{ color: t.text, fontFamily: FF.semibold, textAlign: 'center' }}>Delete for me</Text>
        </Pressable>
        <Pressable onPress={() => setDeleteOpen(false)} style={{ padding: 12 }}>
          <Text style={{ color: t.brand, textAlign: 'center', fontFamily: FF.semibold }}>Cancel</Text>
        </Pressable>
      </ChatBottomSheet>

      <ChatBottomSheet
        visible={reportOpen}
        onRequestClose={() => setReportOpen(false)}
        sheetStyle={{ backgroundColor: t.bgElevated }}
      >
        <Text style={{ color: t.text, fontFamily: FF.bold, fontSize: 18 }}>Report</Text>
        <Text style={{ color: t.textMuted, marginTop: 8, fontFamily: FF.regular, marginBottom: 12 }}>
          Reports are reviewed by our team. Blocking is not automatic — choose “Report & block” to request both actions.
        </Text>
        <Pressable
          style={[styles.sheetBtn, { backgroundColor: t.brand }]}
          onPress={async () => {
            const target = reportTarget;
            setReportOpen(false);
            setReportTarget(null);
            if (!target) return;
            try {
              await reportChatMessage(target.id, { block: false });
              Alert.alert('Report sent', 'Thank you — we will review this report.');
            } catch (e) {
              setError(friendlyErrorMessage(e));
            }
          }}
        >
          <Text style={{ color: '#fff', fontFamily: FF.semibold, textAlign: 'center' }}>Report</Text>
        </Pressable>
        <Pressable
          style={[styles.sheetBtn, { backgroundColor: t.bgSubtle, borderWidth: 1, borderColor: t.border }]}
          onPress={async () => {
            const target = reportTarget;
            setReportOpen(false);
            setReportTarget(null);
            if (!target) return;
            try {
              await reportChatMessage(target.id, { block: true });
              Alert.alert(
                'Report & block requested',
                'We recorded your report. Full account blocking will be available in a future update.'
              );
            } catch (e) {
              setError(friendlyErrorMessage(e));
            }
          }}
        >
          <Text style={{ color: t.text, fontFamily: FF.semibold, textAlign: 'center' }}>Report & block</Text>
        </Pressable>
        <Pressable onPress={() => setReportOpen(false)}>
          <Text style={{ color: t.brand, textAlign: 'center', fontFamily: FF.semibold, padding: 12 }}>Cancel</Text>
        </Pressable>
      </ChatBottomSheet>
    </ScreenContainer>
  );
}

function MenuGridTile({
  icon,
  label,
  onPress,
  danger,
  t,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  t: ReturnType<typeof useTheme>['t'];
}) {
  return (
    <Pressable style={[styles.optionTile, { borderColor: t.border }]} onPress={onPress}>
      <Ionicons name={icon} size={34} color={danger ? t.danger : t.brand} />
      <Text style={[styles.optionTileLabel, { color: danger ? t.danger : t.text }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 72, justifyContent: 'flex-end' },
  iconHit: { padding: 8 },
  /** Wraps bubble + frame-only UI (badges, reactions) — not part of text/content inside the bubble. */
  messageBodyFrame: {
    position: 'relative',
    zIndex: 0,
    overflow: 'visible',
  },
  /** Bubble + absolutely docked reaction cluster (bottom-right, straddling border). */
  bubbleWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  reactionClusterDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 8,
    elevation: 6,
  },
  /** Half-in / half-out on the bubble bottom edge; opaque chips sit above the stroke so the border does not cut through. */
  reactionClusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 4,
    maxWidth: '100%',
    paddingLeft: 10,
    transform: [{ translateY: 11 }],
  },
  reactionClusterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 26,
  },
  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    overflow: 'hidden',
    flexShrink: 1,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 4 },
  /** Outer strip: full width, safe padding; keyboard inset applied inline. */
  inputRow: {
    width: '100%',
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  /** One fused “liquid” bar: + | field (emoji inset) | camera · mic — or field + Send when typing. */
  composerLiquid: {
    width: '100%',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexShrink: 1,
    minHeight: 50,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  composerSideHit: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    minWidth: 46,
    minHeight: 48,
    alignSelf: 'stretch',
  },
  composerRightSlot: {
    width: 108,
    minHeight: 48,
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  composerRightLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  composerSendLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  emojiSuggestStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 56,
  },
  emojiSuggestScroll: {
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  emojiSuggestChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  voicePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  voicePreviewBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  voicePreviewBtnSend: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  composerInputShell: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    position: 'relative',
    justifyContent: 'center',
  },
  composerTextField: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingLeft: 12,
    paddingTop: Platform.OS === 'ios' ? 15 : 12,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingRight: 44,
    fontSize: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  composerEmojiInset: {
    position: 'absolute',
    right: 4,
    top: 8,
    width: 40,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerSendLiquid: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    alignSelf: 'stretch',
    minWidth: 76,
  },
  sendBtn: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 68,
  },
  /** Reply swipe: icon only, vertically centered on the message row; no background. */
  replySwipeIconOnly: {
    width: 52,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  attachCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: '100%',
    maxWidth: 360,
  },
  actionMenuCard: {
    maxWidth: 340,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
  },
  optionTile: {
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 100,
  },
  optionTileLabel: {
    fontFamily: FF.regular,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  optionTileHint: {
    fontFamily: FF.regular,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  reactionEmojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  emojiHitLarge: { padding: 10, minWidth: 52, alignItems: 'center' },
  micWaveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    gap: 4,
    marginRight: 10,
  },
  micWaveBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 4,
  },
  recordingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  sheetBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
});
