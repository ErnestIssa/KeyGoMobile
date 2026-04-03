/**
 * Mapbox public token (same token for RN Mapbox and mapbox-gl-js).
 * Set `EXPO_PUBLIC_MAPBOX_TOKEN` in `.env` before enabling the map packages.
 */
export const MAPBOX_ACCESS_TOKEN =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAPBOX_TOKEN
    ? process.env.EXPO_PUBLIC_MAPBOX_TOKEN
    : '';
