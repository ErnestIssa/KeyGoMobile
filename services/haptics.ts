import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

async function run(fn: () => Promise<void>) {
  if (!enabled) return;
  try {
    await fn();
  } catch {
    /* simulator / unsupported */
  }
}

export function hapticLight() {
  return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function hapticMedium() {
  return run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function hapticSuccess() {
  return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function hapticError() {
  return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

export function hapticWarning() {
  return run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function hapticSelection() {
  return run(() => Haptics.selectionAsync());
}
