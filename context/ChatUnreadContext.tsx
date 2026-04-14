import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  getChatUnreadCount,
  listConversations,
  type ChatMessage,
  type ConversationListItem,
  type LastMessageStatus,
} from '../services/api';
import { emitChatTabPulse } from '../services/chatAttention';
import { getActiveChatConversationId } from '../services/chatPresence';
import {
  disconnectSharedChatSocket,
  getSharedChatSocket,
  subscribeChatRelay,
  syncChatConversationRooms,
} from '../services/chatSocket';
import { playChatMessageIncoming } from '../services/sounds';

const TYPING_FALLBACK_CLEAR_MS = 6500;

function toIso(m: ChatMessage['createdAt']): string {
  if (typeof m === 'string') return m;
  return new Date(m).toISOString();
}

function previewFromMessage(m: ChatMessage): string {
  if (m.kind === 'image') return 'Photo';
  if (m.kind === 'video') return 'Video';
  if (m.kind === 'audio') return 'Voice';
  if (m.kind === 'file') return m.fileName ?? 'File';
  const raw = (m.text ?? '').trim();
  if (!raw) return m.deletedPlaceholder ? m.text : 'Message';
  return raw.length > 120 ? `${raw.slice(0, 117)}…` : raw;
}

export type ChatUnreadContextValue = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  /** Bumps when overlays / typing change so list rows re-merge. */
  conversationListOverlayRev: number;
  peerTypingByConversationId: Record<string, boolean>;
  mergeConversationListItem: (c: ConversationListItem) => ConversationListItem;
  clearConversationListOverlays: () => void;
  /** Call after loading conversations so delivery/read patches know last sender per thread. */
  syncConversationLastSendersFromList: (rows: ConversationListItem[]) => void;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationListOverlayRev, setConversationListOverlayRev] = useState(0);
  const [peerTypingByConversationId, setPeerTypingByConversationId] = useState<Record<string, boolean>>({});
  const conversationOverlaysRef = useRef<Record<string, Partial<ConversationListItem>>>({});
  /** Last message sender per thread (from list sync + socket); avoids wrong delivery/read badges when overlay is empty. */
  const lastMessageSenderByConvoRef = useRef<Record<string, string>>({});
  const typingClearTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const bumpOverlays = useCallback(() => {
    setConversationListOverlayRev((x) => x + 1);
  }, []);

  const clearConversationListOverlays = useCallback(() => {
    conversationOverlaysRef.current = {};
    bumpOverlays();
  }, [bumpOverlays]);

  const syncConversationLastSendersFromList = useCallback((rows: ConversationListItem[]) => {
    const m = lastMessageSenderByConvoRef.current;
    for (const r of rows) {
      if (r.lastMessageSenderId) m[r.id] = r.lastMessageSenderId;
    }
  }, []);

  const mergeConversationListItem = useCallback(
    (c: ConversationListItem) => {
      const o = conversationOverlaysRef.current[c.id];
      return o ? { ...c, ...o } : c;
    },
    [conversationListOverlayRev]
  );

  const refreshUnread = useCallback(async () => {
    if (!token || !user) {
      setUnreadCount(0);
      return;
    }
    try {
      const n = await getChatUnreadCount();
      setUnreadCount(n);
    } catch {
      setUnreadCount(0);
    }
  }, [token, user]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    if (!token || !user) return;
    const id = setInterval(() => void refreshUnread(), 28000);
    return () => clearInterval(id);
  }, [token, user, refreshUnread]);

  const scheduleTypingFallbackClear = useCallback((conversationId: string) => {
    const prev = typingClearTimersRef.current[conversationId];
    if (prev) clearTimeout(prev);
    typingClearTimersRef.current[conversationId] = setTimeout(() => {
      delete typingClearTimersRef.current[conversationId];
      setPeerTypingByConversationId((p) => {
        if (!p[conversationId]) return p;
        const next = { ...p };
        delete next[conversationId];
        return next;
      });
    }, TYPING_FALLBACK_CLEAR_MS);
  }, []);

  /** Relay + room sync — listeners attach immediately (no wait for REST). */
  useEffect(() => {
    if (!token || !user?.id) {
      lastMessageSenderByConvoRef.current = {};
      disconnectSharedChatSocket();
      return;
    }
    let cancelled = false;
    const uid = user.id;

    void getSharedChatSocket();

    const patchConversation = (conversationId: string, patch: Partial<ConversationListItem>) => {
      conversationOverlaysRef.current[conversationId] = {
        ...conversationOverlaysRef.current[conversationId],
        ...patch,
      };
      bumpOverlays();
    };

    const onNewMessage = (payload: { message?: ChatMessage }) => {
      if (cancelled) return;
      const m = payload?.message;
      if (!m) return;
      const cid = String(m.conversationId ?? '');
      const at = toIso(m.createdAt);
      const preview = previewFromMessage(m);
      let status: LastMessageStatus | undefined;
      if (m.senderId === uid) {
        status = 'sent';
      } else {
        status = 'received';
      }
      lastMessageSenderByConvoRef.current[cid] = m.senderId;
      patchConversation(cid, {
        lastMessagePreview: preview,
        lastMessageAt: at,
        lastMessageSenderId: m.senderId,
        lastMessageStatus: status,
      });

      setPeerTypingByConversationId((p) => {
        if (!p[cid]) return p;
        const next = { ...p };
        delete next[cid];
        return next;
      });
      const t = typingClearTimersRef.current[cid];
      if (t) {
        clearTimeout(t);
        delete typingClearTimersRef.current[cid];
      }

      if (m.senderId !== uid) {
        const active = getActiveChatConversationId();
        if (String(active) !== cid) {
          setUnreadCount((c) => c + 1);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          void playChatMessageIncoming();
          emitChatTabPulse();
        }
      }
      void refreshUnread();
    };

    const lastSenderFor = (cid: string) =>
      conversationOverlaysRef.current[cid]?.lastMessageSenderId ?? lastMessageSenderByConvoRef.current[cid];

    const onMessageDelivery = (payload: { conversationId?: string; messageId?: string }) => {
      if (cancelled || !payload?.conversationId) return;
      const cid = String(payload.conversationId);
      const last = lastSenderFor(cid);
      if (last !== undefined && last !== uid) return;
      patchConversation(cid, { lastMessageStatus: 'delivered' });
    };

    const onMessagesRead = (payload: { conversationId?: string; readerId?: string }) => {
      if (cancelled || !payload?.conversationId || payload.readerId === uid) return;
      const cid = String(payload.conversationId);
      const last = lastSenderFor(cid);
      if (last !== undefined && last !== uid) return;
      patchConversation(cid, { lastMessageStatus: 'read' });
    };

    const onUserTyping = (payload: { conversationId?: string; userId?: string; isTyping?: boolean }) => {
      if (cancelled || !payload?.conversationId || payload.userId === uid) return;
      const cid = String(payload.conversationId);
      const on = Boolean(payload.isTyping);
      setPeerTypingByConversationId((p) => ({ ...p, [cid]: on }));
      if (on) {
        scheduleTypingFallbackClear(cid);
      } else {
        const timer = typingClearTimersRef.current[cid];
        if (timer) {
          clearTimeout(timer);
          delete typingClearTimersRef.current[cid];
        }
      }
    };

    const unsubNew = subscribeChatRelay('new_message', (p) => onNewMessage(p as { message?: ChatMessage }));
    const unsubDelivery = subscribeChatRelay('message_delivery', (p) =>
      onMessageDelivery(p as { conversationId?: string; messageId?: string })
    );
    const unsubRead = subscribeChatRelay('messages_read', (p) =>
      onMessagesRead(p as { conversationId?: string; readerId?: string })
    );
    const unsubTyping = subscribeChatRelay('user_typing', (p) =>
      onUserTyping(p as { conversationId?: string; userId?: string; isTyping?: boolean })
    );

    void (async () => {
      const socket = await getSharedChatSocket();
      if (cancelled || !socket) return;
      try {
        const { conversations } = await listConversations(false);
        if (cancelled) return;
        for (const c of conversations) {
          if (c.lastMessageSenderId) lastMessageSenderByConvoRef.current[c.id] = c.lastMessageSenderId;
        }
        syncChatConversationRooms(conversations.map((c) => c.id));
      } catch {
        /* offline — rooms may still be server auto-joined */
      }
    })();

    return () => {
      cancelled = true;
      unsubNew();
      unsubDelivery();
      unsubRead();
      unsubTyping();
      Object.values(typingClearTimersRef.current).forEach(clearTimeout);
      typingClearTimersRef.current = {};
    };
  }, [token, user?.id, refreshUnread, bumpOverlays, scheduleTypingFallbackClear]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnread,
      conversationListOverlayRev,
      peerTypingByConversationId,
      mergeConversationListItem,
      clearConversationListOverlays,
      syncConversationLastSendersFromList,
    }),
    [
      unreadCount,
      refreshUnread,
      conversationListOverlayRev,
      peerTypingByConversationId,
      mergeConversationListItem,
      clearConversationListOverlays,
      syncConversationLastSendersFromList,
    ]
  );

  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread(): ChatUnreadContextValue {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) {
    throw new Error('useChatUnread must be used within ChatUnreadProvider');
  }
  return ctx;
}
