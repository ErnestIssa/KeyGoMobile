import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { navigationRef } from '../navigation/navigationRef';
import { registerPushToken } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registers Expo push token with the API and handles notification taps (deep link to chat thread).
 */
export function ChatNotificationBootstrap() {
  const { user } = useAuth();

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

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;

    void (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        const finalStatus =
          status === 'granted' ? status : (await Notifications.requestPermissionsAsync()).status;
        if (finalStatus !== 'granted') return;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenRes = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId: String(projectId) } : undefined
        );
        await registerPushToken(tokenRes.data, true);
      } catch {
        /* simulator / missing project id */
      }
    })();
  }, [user?.id]);

  return null;
}
