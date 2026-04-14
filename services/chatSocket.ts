import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getToken } from './authStorage';

/** Single shared connection — join conversation rooms so `new_message` reaches list + thread without reload. */
let sharedSocket: Socket | null = null;

/**
 * All conversation rooms this user should stay subscribed to. Socket.IO drops room membership on disconnect;
 * we re-emit `join_conversation` for every id on each `connect`.
 */
const conversationRooms = new Set<string>();

function flushJoinConversationRooms(socket: Socket) {
  if (!socket.connected) return;
  for (const id of conversationRooms) {
    socket.emit('join_conversation', id);
  }
}

/** Merge conversation ids from API list (or new thread) and join immediately if connected. */
export function syncChatConversationRooms(conversationIds: string[]) {
  for (const id of conversationIds) {
    if (id) conversationRooms.add(id);
  }
  if (sharedSocket?.connected) flushJoinConversationRooms(sharedSocket);
}

/** Ensure a single thread is joined (e.g. opened before list sync). */
export function addChatConversationRoom(conversationId: string) {
  if (!conversationId) return;
  conversationRooms.add(conversationId);
  if (sharedSocket?.connected) {
    sharedSocket.emit('join_conversation', conversationId);
  }
}

/** --- Central relay: one `socket.on` per event so reconnect / listener churn never drops updates. --- */

export type ChatRelayEvent = 'new_message' | 'message_delivery' | 'messages_read' | 'user_typing' | 'message_updated';

type RelayHandler = (payload: unknown) => void;

const relayHandlers: Record<ChatRelayEvent, Set<RelayHandler>> = {
  new_message: new Set(),
  message_delivery: new Set(),
  messages_read: new Set(),
  user_typing: new Set(),
  message_updated: new Set(),
};

function emitRelay(event: ChatRelayEvent, payload: unknown) {
  relayHandlers[event].forEach((h) => {
    try {
      h(payload);
    } catch {
      /* subscriber bug — don't break others */
    }
  });
}

/** Subscribe to realtime payloads. Call from React effects; unsubscribe on cleanup. */
export function subscribeChatRelay(event: ChatRelayEvent, handler: RelayHandler): () => void {
  relayHandlers[event].add(handler);
  return () => {
    relayHandlers[event].delete(handler);
  };
}

let relayBoundSocket: Socket | null = null;

function bindRelayToSocket(socket: Socket) {
  if (relayBoundSocket === socket) return;
  if (relayBoundSocket && relayBoundSocket !== socket) {
    relayBoundSocket.off('new_message');
    relayBoundSocket.off('message_delivery');
    relayBoundSocket.off('messages_read');
    relayBoundSocket.off('user_typing');
    relayBoundSocket.off('message_updated');
  }
  relayBoundSocket = socket;
  socket.on('new_message', (p) => emitRelay('new_message', p));
  socket.on('message_delivery', (p) => emitRelay('message_delivery', p));
  socket.on('messages_read', (p) => emitRelay('messages_read', p));
  socket.on('user_typing', (p) => emitRelay('user_typing', p));
  socket.on('message_updated', (p) => emitRelay('message_updated', p));
}

/** Same origin as REST (`EXPO_PUBLIC_API_URL`), Socket.IO path `/socket.io/`. */
export async function getSharedChatSocket(): Promise<Socket | null> {
  if (!API_BASE_URL) return null;
  const token = await getToken();
  if (!token) {
    disconnectSharedChatSocket();
    return null;
  }
  if (sharedSocket?.connected) return sharedSocket;
  /** Let Socket.IO finish reconnect on the same instance; do not tear down while `active`. */
  if (sharedSocket && sharedSocket.active) {
    return sharedSocket;
  }
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
    relayBoundSocket = null;
  }
  const s = io(API_BASE_URL, {
    path: '/socket.io/',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
  bindRelayToSocket(s);
  s.on('connect', () => {
    flushJoinConversationRooms(s);
  });
  sharedSocket = s;
  return s;
}

export function disconnectSharedChatSocket(): void {
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  relayBoundSocket = null;
  conversationRooms.clear();
}

export function getSharedChatSocketIfConnected(): Socket | null {
  return sharedSocket?.connected ? sharedSocket : null;
}

/** @deprecated Use getSharedChatSocket — kept for gradual migration */
export const connectChatSocket = getSharedChatSocket;
