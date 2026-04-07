import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from '../navigation/navigationRef';
import { registerPushToken } from '../services/api';
import {
  getActiveChatConversationId,
  getAppInForeground,
  getPushNotificationsAllowed,
  initChatPresenceAppState,
  setPushNotificationsAllowed,
} from '../services/chatPresence';
import { playNotify } from '../services/sounds';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { conversationId?: string } | undefined;
    const cid = data?.conversationId;
    const inApp = getAppInForeground();
    const inThatThread = Boolean(cid && getActiveChatConversationId() === cid);
    const pushOk = getPushNotificationsAllowed();

    const title = notification.request.content.title ?? '';
    const isChat =
      Boolean(cid) || (typeof title === 'string' && title.toLowerCase().includes('message'));

    if (isChat) {
      if (inThatThread) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      if (inApp) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
      if (!pushOk) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/**
 * Registers Expo push token with the API and handles notification taps (deep link to chat thread).
 */
export function ChatNotificationBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    initChatPresenceAppState();
  }, []);

  useEffect(() => {
    const pushPref = user?.appSettings?.communication?.push;
    setPushNotificationsAllowed(pushPref !== false);
  }, [user?.appSettings?.communication?.push]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { conversationId?: string } | undefined;
      const cid = data?.conversationId;
      if (!cid || !navigationRef.isReady()) return;
      navigationRef.navigate('Chat', {
        screen: 'ChatThread',
        params: {
          conversationId: cid,
          peerUserId: '',
          peerName: 'Chat',
        },
      });
    });

    return () => sub.remove();
  }, []);

  /** Foreground chat pushes: banner suppressed above — subtle haptic + sound here when a push still arrives. */
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { conversationId?: string } | undefined;
      const cid = data?.conversationId;
      const title = notification.request.content.title ?? '';
      const isChat =
        Boolean(cid) || (typeof title === 'string' && title.toLowerCase().includes('message'));
      if (!isChat || !getAppInForeground()) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void playNotify();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    void (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        const finalStatus =
          status === 'granted' ? status : (await Notifications.requestPermissionsAsync()).status;
        const pushPref = user.appSettings?.communication?.push !== false;
        if (finalStatus !== 'granted' || !pushPref) {
          await registerPushToken(undefined, false);
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenRes = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId: String(projectId) } : undefined
        );
        await registerPushToken(tokenRes.data, true);
      } catch {
        /* simulator / missing project id */
      }
    })();
  }, [user?.id, user?.appSettings?.communication?.push]);

  return null;
}
