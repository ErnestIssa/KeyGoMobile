import type { Trip } from '../../services/api';
import type { LatLng, VehicleLocationSample } from './types';

/** Pickup pin when the trip includes coordinates (e.g. from Mapbox geocoding on create). */
export function tripPickupCoord(trip: Trip): LatLng | null {
  const { pickupLatitude: lat, pickupLongitude: lng } = trip;
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng };
}

export function tripDropoffCoord(trip: Trip): LatLng | null {
  const { dropoffLatitude: lat, dropoffLongitude: lng } = trip;
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng };
}

/** Live vehicle sample for Mapbox `GeoJSON` / marker updates. */
export function tripVehicleSample(trip: Trip): VehicleLocationSample | null {
  const v = trip.vehicleLocation;
  if (!v) return null;
  return {
    latitude: v.latitude,
    longitude: v.longitude,
    ...(v.heading != null ? { heading: v.heading } : {}),
    recordedAt: v.recordedAt,
  };
}
