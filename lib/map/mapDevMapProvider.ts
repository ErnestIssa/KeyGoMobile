/**
 * Dev-only map backend toggle: MapLibre + OSM-style tiles vs Mapbox (production).
 * Set `EXPO_PUBLIC_USE_MAPLIBRE=1` and rebuild native (Expo prebuild / dev client) to use MapLibre.
 * Mapbox code paths stay in the repo; this only switches which native map renders at runtime.
 */
import { NativeModules } from 'react-native';

/** True in dev when env requests MapLibre and the native module is linked (never in production store builds). */
export function shouldUseMapLibreOsmDev(): boolean {
  if (!__DEV__) return false;
  return process.env.EXPO_PUBLIC_USE_MAPLIBRE === '1' && isMapLibreNativeAvailable();
}

export function isMapLibreNativeAvailable(): boolean {
  return NativeModules.MLRNModule != null;
}
