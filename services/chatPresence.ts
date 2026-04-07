import { AppState, type AppStateStatus } from 'react-native';

let activeConversationId: string | null = null;
let appState: AppStateStatus = AppState.currentState ?? 'active';
let pushNotificationsAllowed = true;

export function setActiveChatConversationId(id: string | null): void {
  activeConversationId = id;
}

export function getActiveChatConversationId(): string | null {
  return activeConversationId;
}

export function getAppInForeground(): boolean {
  return appState === 'active';
}

export function setPushNotificationsAllowed(v: boolean): void {
  pushNotificationsAllowed = v;
}

export function getPushNotificationsAllowed(): boolean {
  return pushNotificationsAllowed;
}

let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

/** Call once from app root (e.g. ChatNotificationBootstrap). */
export function initChatPresenceAppState(): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (next) => {
    appState = next;
  });
}
