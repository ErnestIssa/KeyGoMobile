import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getToken } from './authStorage';

/** Same origin as REST (`EXPO_PUBLIC_API_URL`), Socket.IO path `/socket.io/`. */
export async function connectChatSocket(): Promise<Socket | null> {
  if (!API_BASE_URL) return null;
  const token = await getToken();
  if (!token) return null;
  return io(API_BASE_URL, {
    path: '/socket.io/',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });
}
