import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

/** Mapbox order: `[longitude, latitude]` */
export type UserLngLat = [number, number];

/**
 * Foreground GPS stream for Home map tracking (native Mapbox + Expo Go placeholder overlay).
 * Single subscription per mounted Home screen.
 */
export function useUserLocationWatch(watchOptions: Location.LocationOptions) {
  const [coordinate, setCoordinate] = useState<UserLngLat | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') return;

      setPermissionGranted(true);

      sub = await Location.watchPositionAsync(watchOptions, (loc) => {
        setCoordinate([loc.coords.longitude, loc.coords.latitude]);
      });
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [watchOptions]);

  return { coordinate, permissionGranted };
}
