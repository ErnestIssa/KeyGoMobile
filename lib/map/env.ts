/**
 * Mapbox public token (same token for RN Mapbox and mapbox-gl-js).
 * Set `EXPO_PUBLIC_MAPBOX_TOKEN` in `.env` before enabling the map packages.
 *
 * Dev-only MapLibre + free tiles (no token): set `EXPO_PUBLIC_USE_MAPLIBRE=1` and rebuild native
 * (`npx expo prebuild` / `expo run:*`). See `mapDevMapProvider.ts`.
 */
export const MAPBOX_ACCESS_TOKEN =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_MAPBOX_TOKEN
    ? process.env.EXPO_PUBLIC_MAPBOX_TOKEN
    : '';
