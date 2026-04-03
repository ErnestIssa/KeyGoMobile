/**
 * Map / tracking data shapes shared with the web app (`KeyGo/src/lib/map/types.ts`).
 * Keep fields aligned for Mapbox (WGS84). UI lives elsewhere — this is contract-only.
 */

export type LatLng = {
  latitude: number;
  longitude: number;
};

/** Optional heading in degrees clockwise from north (0–360); used for vehicle bearing. */
export type LatLngHeading = LatLng & {
  heading?: number;
};

/** Last reported vehicle position for a trip (live tracking). */
export type VehicleLocationSample = LatLngHeading & {
  /** ISO timestamp from the API */
  recordedAt: string;
};

/**
 * Bounding box in WGS84 (Mapbox `LngLatBounds`-friendly: west, south, east, north).
 * Longitude/latitude order matches mapbox-gl `fitBounds`.
 */
export type LngLatBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** Camera / viewport hints for RN Mapbox (`Camera` / `MapView` bounds). */
export type MapRegion = {
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
};
