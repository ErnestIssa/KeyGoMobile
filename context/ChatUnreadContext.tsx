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
import type { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getChatUnreadCount, listConversations, type ChatMessage } from '../services/api';
import { emitChatTabPulse } from '../services/chatAttention';
import { getActiveChatConversationId } from '../services/chatPresence';
import { disconnectSharedChatSocket, getSharedChatSocket } from '../services/chatSocket';
import { playNotify } from '../services/sounds';

export type ChatUnreadContextValue = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  /** Bumps when a new chat message should refresh the conversations list (real-time). */
  conversationListVersion: number;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationListVersion, setConversationListVersion] = useState(0);
  const socketHandlerRef = useRef<Socket | null>(null);

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

  /** Shared socket: join all conversations + bump list on incoming messages from others. */
  useEffect(() => {
    if (!token || !user?.id) {
      disconnectSharedChatSocket();
      return;
    }
    let cancelled = false;
    const uid = user.id;
    const onNew = (payload: { message?: ChatMessage }) => {
      if (cancelled) return;
      const m = payload?.message;
      if (!m || m.senderId === uid) return;
      const active = getActiveChatConversationId();
      if (active !== m.conversationId) {
        setConversationListVersion((v) => v + 1);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        void playNotify();
        emitChatTabPulse();
      }
      void refreshUnread();
    };

    void (async () => {
      const socket = await getSharedChatSocket();
      if (cancelled || !socket) return;
      socketHandlerRef.current = socket;
      try {
        const { conversations } = await listConversations(false);
        if (cancelled) return;
        for (const c of conversations) {
          socket.emit('join_conversation', c.id);
        }
      } catch {
        /* offline */
      }
      if (cancelled) return;
      socket.on('new_message', onNew);
    })();

    return () => {
      cancelled = true;
      socketHandlerRef.current?.off('new_message', onNew);
      socketHandlerRef.current = null;
    };
  }, [token, user?.id, refreshUnread]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnread, conversationListVersion }),
    [unreadCount, refreshUnread, conversationListVersion]
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
