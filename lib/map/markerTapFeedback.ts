import * as Haptics from 'expo-haptics';
import { playMarkerTap } from '../../services/sounds';

/** Shared by Mapbox and MapLibre home map bodies — haptic + tap sound. */
export async function markerTapFeedback() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* simulator / web */
  }
  void playMarkerTap();
}
