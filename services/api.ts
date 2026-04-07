/**
 * API client — set EXPO_PUBLIC_API_URL to your server origin (e.g. https://your-api.onrender.com), no trailing slash.
 * Requests are sent to `${EXPO_PUBLIC_API_URL}/api/...`.
 */

import { clearAuth, getToken, saveAuth } from './authStorage';
import type { PatchAppSettings, UserAddress } from '../types/appSettings';
import type { User } from '../types/user';

export type { User } from '../types/user';
export type { AppSettings, UserAddress } from '../types/appSettings';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type AuthResponse = {
  token: string;
  user: User;
};

function isPublicAuthPath(path: string): boolean {
  const base = path.split('?')[0];
  return base === '/auth/login' || base === '/auth/register';
}

export function buildUrl(path: string): string {
  const segment = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    throw new ApiError(
      'EXPO_PUBLIC_API_URL is not set. Add it in .env (e.g. EXPO_PUBLIC_API_URL=https://your-api.onrender.com).',
      0
    );
  }
  return `${API_BASE_URL}/api${segment}`;
}

/**
 * Generic JSON fetch helper. Attaches `Authorization: Bearer <token>` except for `/auth/login` and `/auth/register`.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (!isPublicAuthPath(path)) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const body = init.body;
  if (body !== undefined && body !== null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError('Network request failed. Check your connection and EXPO_PUBLIC_API_URL.', 0);
  }

  const text = await res.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!res.ok) {
        throw new ApiError(text.slice(0, 200) || res.statusText || 'Request failed', res.status);
      }
      throw new ApiError('Invalid JSON in response', res.status);
    }
  } else {
    data = undefined;
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : res.statusText || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

/** POST /api/auth/login */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await saveAuth(data.token, data.user);
  return data;
}

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  role: 'owner' | 'driver';
  accountKind?: 'individual' | 'organization';
  organizationName?: string;
  organizationType?: string;
};

/** POST /api/auth/register */
export async function register(userData: RegisterPayload): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  await saveAuth(data.token, data.user);
  return data;
}

/** Clear stored credentials (e.g. sign out). */
export async function logout(): Promise<void> {
  await clearAuth();
}

export type TripParty = {
  id: string;
  name?: string;
  email?: string;
};

export type TripVehicleLocation = {
  latitude: number;
  longitude: number;
  heading?: number;
  recordedAt: string;
};

export type Trip = {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  vehicleLocation?: TripVehicleLocation;
  carDescription: string;
  paymentAmount: number;
  status: string;
  createdAt?: string;
  owner?: TripParty;
  driver?: TripParty;
  /** From API — only the server decides which actions this user may perform. */
  allowedActions?: { accept: boolean; complete: boolean };
};

/**
 * GET /api/jobs — available driver work (requires driver JWT).
 */
export async function getJobs(init?: RequestInit): Promise<Trip[]> {
  const data = await request<{ trips: Trip[] }>('/jobs', { method: 'GET', ...init });
  return data.trips;
}

export async function getProfile(): Promise<{ user: User }> {
  return request<{ user: User }>('/users/profile', { method: 'GET' });
}

export type BootstrapPayload = {
  userCount: number;
  tripCount: number;
  tagline: string;
};

/** GET /api/public/bootstrap — counts for splash (no auth). */
export async function fetchBootstrap(): Promise<BootstrapPayload> {
  return request<BootstrapPayload>('/public/bootstrap', { method: 'GET' });
}

/** PATCH /api/users/settings — merge app settings (caller should `updateUser` in AuthContext). */
export async function patchUserSettings(patch: PatchAppSettings): Promise<{ user: User }> {
  return request<{ user: User }>('/users/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

/** PATCH /api/users/address */
export async function patchUserAddress(patch: Partial<UserAddress>): Promise<{ user: User }> {
  return request<{ user: User }>('/users/address', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export type InboxMessage = {
  id: string;
  channel: 'notifications' | 'support';
  title: string;
  body: string;
  read: boolean;
  fromSupport: boolean;
  createdAt: string;
};

export async function getInbox(): Promise<{ notifications: InboxMessage[]; support: InboxMessage[] }> {
  return request<{ notifications: InboxMessage[]; support: InboxMessage[] }>('/users/inbox', { method: 'GET' });
}

export async function postSupportInboxMessage(body: string): Promise<{ message: InboxMessage }> {
  return request<{ message: InboxMessage }>('/users/inbox/support', {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function markInboxMessageRead(id: string): Promise<{ message: InboxMessage }> {
  return request<{ message: InboxMessage }>(`/users/inbox/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

/** PATCH /api/users/role — `{ role: "owner" | "driver" }`; returns new JWT + user */
export async function switchRole(role: 'owner' | 'driver'): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/users/role', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  await saveAuth(data.token, data.user);
  return data;
}

/** POST /api/users/avatar — body: `{ image: dataUrl }` (data:image/jpeg;base64,...) */
export async function uploadAvatar(imageDataUrl: string): Promise<{ user: User }> {
  return request<{ user: User }>('/users/avatar', {
    method: 'POST',
    body: JSON.stringify({ image: imageDataUrl }),
  });
}

export type CreateTripPayload = {
  pickupLocation: string;
  dropoffLocation: string;
  carDescription: string;
  paymentAmount: number;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
};

export async function createTrip(payload: CreateTripPayload): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listAvailableTrips(): Promise<{ trips: Trip[] }> {
  return request<{ trips: Trip[] }>('/trips/available', { method: 'GET' });
}

export async function listMyTrips(): Promise<{ trips: Trip[] }> {
  return request<{ trips: Trip[] }>('/trips/mine', { method: 'GET' });
}

export async function getTrip(id: string): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function acceptTrip(id: string): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    body: '{}',
  });
}

export async function completeTrip(id: string): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: '{}',
  });
}

/** GET /api/vehicles — `{ id, lat, lng, ... }[]` (requires JWT). */
export type VehiclePositionRow = {
  id: string;
  lat: number;
  lng: number;
  status?: string;
  speedKmh?: number;
};

export async function fetchVehicles(init?: RequestInit): Promise<VehiclePositionRow[]> {
  return request<VehiclePositionRow[]>('/vehicles', { method: 'GET', ...init });
}

/** PATCH /api/trips/:id/vehicle-location — driver-only, accepted trips. */
export async function updateTripVehicleLocation(
  id: string,
  body: { latitude: number; longitude: number; heading?: number }
): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}/vehicle-location`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/** --- Chat (matched users only; see KeyGo_Server chat routes) --- */

export type ChatUserPreview = {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
};

export type LastMessageStatus = 'sent' | 'delivered' | 'read' | 'received';

export type ConversationMySettings = {
  archived: boolean;
  muted: boolean;
  favorite: boolean;
  listTag: string | null;
  manualUnread: boolean;
};

export type ConversationListItem = {
  id: string;
  participants: string[];
  otherUser: ChatUserPreview;
  otherUserId: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSenderId?: string;
  /** Server-computed status for the latest message in this thread */
  lastMessageStatus?: LastMessageStatus;
  mySettings?: ConversationMySettings;
  isLocked?: boolean;
};

export type MessageDeliveryStatus = 'sent' | 'delivered' | 'read';

export type ChatMessageKind = 'text' | 'image' | 'video' | 'file' | 'audio' | 'call' | 'system';

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  kind?: ChatMessageKind;
  text: string;
  createdAt: string;
  senderDisplayName?: string;
  /** Full name for initials when avatar image is missing */
  senderName?: string;
  senderAvatarUrl?: string;
  /** Inbound: true if this message is still “new” vs your read cursor */
  isUnread?: boolean;
  /** Outgoing: sent / delivered / read */
  deliveryStatus?: MessageDeliveryStatus;
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  durationSec?: number;
  replyToMessageId?: string;
  replyToPreview?: string;
  reactions?: { userId: string; emoji: string }[];
  starredByMe?: boolean;
  isPinned?: boolean;
  deleted?: boolean;
  deletedPlaceholder?: boolean;
};

export async function createConversation(participantId: string): Promise<{
  conversation: { id: string; participants: string[]; createdAt: string; updatedAt: string };
}> {
  return request('/conversations', {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
}

export async function listConversations(includeArchived?: boolean): Promise<{ conversations: ConversationListItem[] }> {
  const q = includeArchived ? '?includeArchived=1' : '';
  return request(`/conversations${q}`, { method: 'GET' });
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await request(`/conversations/${encodeURIComponent(conversationId)}`, { method: 'DELETE' });
}

export async function patchConversationSettings(
  conversationId: string,
  patch: Partial<{
    archived: boolean;
    muted: boolean;
    favorite: boolean;
    listTag: string | null;
    manualUnread: boolean;
  }>
): Promise<{ settings: ConversationMySettings }> {
  return request(`/conversations/${encodeURIComponent(conversationId)}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function clearConversationHistory(conversationId: string): Promise<void> {
  await request(`/conversations/${encodeURIComponent(conversationId)}/clear`, { method: 'POST' });
}

export async function postConversationMarkUnread(conversationId: string): Promise<void> {
  await request(`/conversations/${encodeURIComponent(conversationId)}/mark-unread`, { method: 'POST' });
}

export async function postConversationLock(conversationId: string, locked: boolean): Promise<void> {
  await request(`/conversations/${encodeURIComponent(conversationId)}/lock`, {
    method: 'POST',
    body: JSON.stringify({ locked }),
  });
}

export type PublicUserProfile = {
  id: string;
  name: string;
  displayName?: string;
  role: string;
  avatarUrl?: string;
  ratingAverage?: number;
};

/** GET /api/users/public/:userId — other user’s profile (no email). */
export async function getPublicUser(userId: string): Promise<{ user: PublicUserProfile }> {
  return request(`/users/public/${encodeURIComponent(userId)}`, { method: 'GET' });
}

export async function postChatMessage(
  conversationId: string,
  text: string,
  opts?: {
    kind?: ChatMessageKind;
    mediaUrl?: string;
    fileName?: string;
    mimeType?: string;
    durationSec?: number;
    replyToMessageId?: string;
  }
): Promise<{ message: ChatMessage }> {
  return request('/messages', {
    method: 'POST',
    body: JSON.stringify({
      conversationId,
      text,
      kind: opts?.kind,
      mediaUrl: opts?.mediaUrl,
      fileName: opts?.fileName,
      mimeType: opts?.mimeType,
      durationSec: opts?.durationSec,
      replyToMessageId: opts?.replyToMessageId,
    }),
  });
}

export async function uploadChatMedia(
  conversationId: string,
  kind: 'image' | 'video' | 'file' | 'audio',
  file: { uri: string; name: string; type: string },
  opts?: { caption?: string; durationSec?: number }
): Promise<{ message: ChatMessage }> {
  const url = buildUrl('/messages/upload');
  const token = await getToken();
  const form = new FormData();
  form.append('conversationId', conversationId);
  form.append('kind', kind);
  if (opts?.caption) {
    form.append('caption', opts.caption);
  }
  if (opts?.durationSec != null) {
    form.append('durationSec', String(opts.durationSec));
  }
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);

  const res = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(text.slice(0, 200) || res.statusText || 'Upload failed', res.status);
    }
  }
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error: string }).error === 'string'
        ? (data as { error: string }).error
        : 'Upload failed';
    throw new ApiError(msg, res.status, data);
  }
  return data as { message: ChatMessage };
}

export async function postChatCallLog(
  conversationId: string,
  body: { callKind: 'voice' | 'video'; status: 'completed' | 'missed' | 'declined'; durationSec?: number }
): Promise<{ message: ChatMessage }> {
  return request(`/conversations/${encodeURIComponent(conversationId)}/call-log`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchMessageReaction(messageId: string, emoji: string | null): Promise<{ message: ChatMessage }> {
  return request(`/messages/${encodeURIComponent(messageId)}/reaction`, {
    method: 'PATCH',
    body: JSON.stringify({ emoji }),
  });
}

export async function patchMessageStar(messageId: string, starred: boolean): Promise<{ message: ChatMessage }> {
  return request(`/messages/${encodeURIComponent(messageId)}/star`, {
    method: 'PATCH',
    body: JSON.stringify({ starred }),
  });
}

export async function patchConversationPin(conversationId: string, messageId: string | null): Promise<{ ok: boolean }> {
  return request(`/conversations/${encodeURIComponent(conversationId)}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ messageId }),
  });
}

export async function deleteChatMessageApi(messageId: string, forEveryone: boolean): Promise<{ message: ChatMessage }> {
  return request(`/messages/${encodeURIComponent(messageId)}`, {
    method: 'DELETE',
    body: JSON.stringify({ forEveryone }),
  });
}

export async function reportChatMessage(
  messageId: string,
  body: { reason?: string; block?: boolean }
): Promise<{ ok: boolean; blockRequested?: boolean }> {
  return request(`/messages/${encodeURIComponent(messageId)}/report`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listChatMessages(conversationId: string): Promise<{
  messages: ChatMessage[];
  peerLastReadAt?: string | null;
  pinnedMessageId?: string | null;
}> {
  return request(`/messages/${encodeURIComponent(conversationId)}`, { method: 'GET' });
}

/** POST /api/users/push-token — Expo push token + notification opt-in. */
export async function registerPushToken(expoPushToken: string, notificationsEnabled: boolean): Promise<void> {
  await request('/users/push-token', {
    method: 'POST',
    body: JSON.stringify({ expoPushToken, notificationsEnabled }),
  });
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await request(`/conversations/${encodeURIComponent(conversationId)}/read`, { method: 'POST' });
}

export async function getChatUnreadCount(): Promise<number> {
  const { total } = await request<{ total: number }>('/chat/unread-count', { method: 'GET' });
  return total;
}

export async function listChatMatches(): Promise<{
  matches: { user: ChatUserPreview; conversationId: string | null }[];
}> {
  return request('/chat/matches', { method: 'GET' });
}

export type ChatActivityLogRow = {
  id: string;
  tripId: string;
  at: string;
  who: string;
  summary: string;
};

export type ChatRecentTripRow = {
  id: string;
  status: string;
  pickupLocation: string;
  dropoffLocation: string;
  updatedAt: string;
  createdAt: string;
  paymentAmount: number;
  owner?: { name?: string };
  driver?: { name?: string };
};

export async function listChatRecentTrips(): Promise<{
  trips: ChatRecentTripRow[];
  activities?: ChatActivityLogRow[];
}> {
  return request('/chat/recent-trips', { method: 'GET' });
}
