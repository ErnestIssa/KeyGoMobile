import type { LatLng, MapRegion } from './types';

/** Default camera center before GPS or trip data loads (continental US centroid). */
export const DEFAULT_MAP_CENTER: LatLng = {
  latitude: 39.8283,
  longitude: -98.5795,
};

/** Sensible initial zoom for a country-scale view; refine per screen when Mapbox lands. */
export const DEFAULT_MAP_ZOOM = 3.5;

export const DEFAULT_MAP_REGION: MapRegion = {
  center: DEFAULT_MAP_CENTER,
  zoom: DEFAULT_MAP_ZOOM,
};
