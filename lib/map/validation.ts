/** Client-side checks before sending coordinates to the API or Mapbox. */

export function isValidLatitude(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

export function isValidLongitude(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

export function isValidLatLng(latitude: number, longitude: number): boolean {
  return isValidLatitude(latitude) && isValidLongitude(longitude);
}
