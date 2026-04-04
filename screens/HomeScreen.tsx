import * as Location from 'expo-location';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Easing, NativeModules, StyleSheet, Text, View } from 'react-native';
import { MapPlaceholder } from '../components/map/MapPlaceholder';
import { TRACKABLE_USER_ID } from '../lib/map/tracking';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';

/** Mapbox `centerCoordinate` is `[longitude, latitude]` — Stockholm default. */
const STOCKHOLM_CENTER: [number, number] = [18.0686, 59.3293];
const DEFAULT_ZOOM = 12;

function isMapboxNativeAvailable(): boolean {
  return NativeModules.RNMBXModule != null;
}

/**
 * Home: full-screen Mapbox + live user GPS marker (native build).
 * Expo Go: placeholder only — no Mapbox native module.
 */
export function HomeScreen() {
  const { t } = useTheme();

  if (!isMapboxNativeAvailable()) {
    return (
      <View style={[styles.fill, { backgroundColor: t.bgPage }]}>
        <MapPlaceholder />
        {__DEV__ ? (
          <View style={styles.fallbackBanner} pointerEvents="none">
            <Text style={[styles.fallbackTitle, { fontFamily: FF.bold }]}>Map preview (Expo Go)</Text>
            <Text style={[styles.fallbackBody, { fontFamily: FF.regular }]}>
              Run a dev build for the real map:{'\n'}
              <Text style={{ fontFamily: FF.semibold }}>npx expo run:ios</Text>
              {' or '}
              <Text style={{ fontFamily: FF.semibold }}>npx expo run:android</Text>
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  return <HomeMapboxBody />;
}

function HomeMapboxBody() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- avoid loading in Expo Go (throws on import)
  const Mapbox = require('@rnmapbox/maps') as typeof import('@rnmapbox/maps');

  const [cameraCenter, setCameraCenter] = useState<[number, number]>(STOCKHOLM_CENTER);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  /** Latest user fix — drives animated `Annotation`. */
  const [userCoordinate, setUserCoordinate] = useState<[number, number] | null>(null);

  const didCenterCameraOnUser = useRef(false);

  useLayoutEffect(() => {
    void Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 4,
          timeInterval: 750,
        },
        (loc) => {
          const next: [number, number] = [loc.coords.longitude, loc.coords.latitude];
          setUserCoordinate(next);
          if (!didCenterCameraOnUser.current) {
            didCenterCameraOnUser.current = true;
            setCameraCenter(next);
            setZoomLevel(14);
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  return (
    <View style={styles.fill}>
      <Mapbox.MapView style={styles.fill} styleURL={Mapbox.StyleURL.Street} scaleBarEnabled={false}>
        <Mapbox.Camera
          centerCoordinate={cameraCenter}
          zoomLevel={zoomLevel}
          animationMode="moveTo"
          animationDuration={0}
        />
        {userCoordinate ? (
          <Mapbox.Annotation
            id={TRACKABLE_USER_ID}
            coordinates={userCoordinate}
            animated
            animationDuration={450}
            animationEasingFunction={Easing.out(Easing.cubic)}
          >
            <Mapbox.CircleLayer
              id={`${TRACKABLE_USER_ID}-circle`}
              style={{
                circleRadius: 11,
                circleColor: '#0A84FF',
                circleOpacity: 0.95,
                circleStrokeWidth: 2.5,
                circleStrokeColor: '#FFFFFF',
              }}
            />
          </Mapbox.Annotation>
        ) : null}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  fallbackBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 120,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  fallbackTitle: {
    fontSize: 15,
    marginBottom: 6,
    color: '#fff',
  },
  fallbackBody: {
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },
});
