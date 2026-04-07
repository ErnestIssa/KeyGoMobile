import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getToken } from './authStorage';

/** Single shared connection — join conversation rooms so `new_message` reaches list + thread without reload. */
let sharedSocket: Socket | null = null;

/** Same origin as REST (`EXPO_PUBLIC_API_URL`), Socket.IO path `/socket.io/`. */
export async function getSharedChatSocket(): Promise<Socket | null> {
  if (!API_BASE_URL) return null;
  const token = await getToken();
  if (!token) {
    disconnectSharedChatSocket();
    return null;
  }
  if (sharedSocket?.connected) return sharedSocket;
  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  const s = io(API_BASE_URL, {
    path: '/socket.io/',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
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
}

export function getSharedChatSocketIfConnected(): Socket | null {
  return sharedSocket?.connected ? sharedSocket : null;
}

/** @deprecated Use getSharedChatSocket — kept for gradual migration */
export const connectChatSocket = getSharedChatSocket;
