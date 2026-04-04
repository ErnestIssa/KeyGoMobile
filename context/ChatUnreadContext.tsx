import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { getChatUnreadCount } from '../services/api';

export type ChatUnreadContextValue = {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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

  const value = useMemo(() => ({ unreadCount, refreshUnread }), [unreadCount, refreshUnread]);

  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread(): ChatUnreadContextValue {
  const ctx = useContext(ChatUnreadContext);
  if (!ctx) {
    throw new Error('useChatUnread must be used within ChatUnreadProvider');
  }
  return ctx;
}
