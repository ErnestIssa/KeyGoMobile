import { Audio } from 'expo-av';

const SOURCES = {
  success: require('../assets/sounds/success.wav'),
  notify: require('../assets/sounds/notify.wav'),
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
      const { sound: s } = await Audio.Sound.createAsync(SOURCES[key], { shouldPlay: false });
      cache[key] = s;
      sound = s;
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

/** Short tap for map markers (uses notify clip; optional haptics in caller). */
export function playMarkerTap() {
  return play('notify');
}
