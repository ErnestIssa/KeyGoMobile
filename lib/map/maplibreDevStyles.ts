/**
 * MapLibre style URLs for local dev — no Mapbox token.
 * Day: OpenFreeMap OSM liberty style (free tiles).
 * Night: Carto Dark Matter (free).
 * Traffic layers are not available on these free styles; toggles are no-ops visually for MapLibre dev.
 */

/** OpenStreetMap-based vector style (OpenFreeMap). */
export const MAPLIBRE_OSM_LIBERTY_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** Fallback / demo tiles (MapLibre project). */
export const MAPLIBRE_DEMO_STYLE = 'https://demotiles.maplibre.org/style.json';

export const MAPLIBRE_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export function mapLibreDevStyleUrl(
  mapVisualMode: 'day' | 'night',
  _trafficEnabled: boolean
): string {
  if (mapVisualMode === 'night') {
    return MAPLIBRE_DARK_STYLE;
  }
  return MAPLIBRE_OSM_LIBERTY_STYLE;
}
