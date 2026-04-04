/**
 * Live map entities — one user + future vehicles/drivers from the API.
 * Mapbox uses `[longitude, latitude]` for coordinates.
 */

/** Reserved id for the signed-in user’s GPS puck (not a vehicle). */
export const TRACKABLE_USER_ID = 'user' as const;

export type MapTrackableId = string;

/** One entity on the map (user GPS now; later: trip vehicle, etc.). */
export type MapTrackablePosition = {
  id: MapTrackableId;
  /** WGS84, Mapbox order */
  coordinate: [longitude: number, latitude: number];
  /** Degrees clockwise from north, when known */
  headingDeg?: number;
  updatedAtMs: number;
};

/** Normalized store for rendering multiple markers without prop drilling. */
export type MapTrackableFleet = Record<MapTrackableId, MapTrackablePosition>;
