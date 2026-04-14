import { Audio } from 'expo-av';

const SOURCES = {
  success: require('../assets/sounds/success.wav'),
  notify: require('../assets/sounds/notify.wav'),
  /** In-app chat: incoming message from another user (foreground / realtime). */
  chatIncoming: require('../assets/sounds/messageNotice.mp3'),
  /** In-app chat: own message successfully sent. */
  chatSent: require('../assets/sounds/messageSent.wav'),
} as const;

type SoundKey = keyof typeof SOURCES;

const cache: Partial<Record<SoundKey, Audio.Sound>> = {};

let modeReady = false;

export async function initSounds() {
  if (modeReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    modeReady = true;
  } catch {
    /* ignore */
  }
}

async function play(key: SoundKey) {
  try {
    await initSounds();
    let sound = cache[key];
    if (!sound) {
      const { sound: s } = await Audio.Sound.createAsync(SOURCES[key], { shouldPlay: false, volume: 1 });
      cache[key] = s;
      sound = s;
    }
    const status = await sound.getStatusAsync();
    if (status.isLoaded && status.isPlaying) {
      await sound.stopAsync();
    }
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch {
    /* missing asset / simulator */
  }
}

export function playSuccess() {
  return play('success');
}

export function playNotify() {
  return play('notify');
}

/** Incoming chat from someone else (not push UI); restarts cleanly on rapid replays. */
export function playChatMessageIncoming() {
  return play('chatIncoming');
}

/** Own message send acknowledged; subtle — pair with light haptic in caller if desired. */
export function playChatMessageSent() {
  return play('chatSent');
}

/** Short tap for map markers (uses notify clip; optional haptics in caller). */
export function playMarkerTap() {
  return play('notify');
}
