/**
 * WHAT THIS DOES
 * - Fleet state: `VehicleFleetProvider` + `useVehicleFleet` (poll + RAF lerp; `applyFleetSnapshot` for WebSockets).
 * - `expo-location`: user GPS (`useUserLocationWatch`).
 * - Native: Mapbox (prod) or MapLibre + OSM (EXPO_PUBLIC_USE_MAPLIBRE=1 dev), follow (user / vehicle / pan), marker tap → card + haptics + sound.
 * - Expo Go: placeholder + same UX minus real map tiles.
 */
import * as Location from 'expo-location';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, Animated, NativeModules, Pressable, StyleSheet, View } from 'react-native';
import { IconKeyGoLogo } from '../components/icons/navIcons';
import { MapHomeControls, type MapVisualMode } from '../components/map/MapHomeControls';
import { MapPlaceholder } from '../components/map/MapPlaceholder';
import { MapVehicleInfoCard } from '../components/map/MapVehicleInfoCard';
import { useVehicleFleet } from '../hooks/useVehicleFleet';
import { useUserLocationWatch, type UserLngLat } from '../hooks/useUserLocationWatch';
import type { MapboxCameraHandle } from '../lib/map/mapboxCamera';
import { markerTapFeedback } from '../lib/map/markerTapFeedback';
import { shouldUseMapLibreOsmDev } from '../lib/map/mapDevMapProvider';
import { TRACKABLE_USER_ID } from '../lib/map/tracking';
import { useTheme } from '../theme/ThemeContext';

/**
 * Lazy so `@maplibre/maplibre-react-native` is never `require`d in Expo Go (no native module there).
 * Only loads when `shouldUseMapLibreOsmDev()` is true (dev build + EXPO_PUBLIC_USE_MAPLIBRE=1).
 */
const HomeMapLibreBodyLazy = lazy(() => import('../components/map/HomeMapLibreBody'));

/** Mapbox `centerCoordinate` / `PointAnnotation`: `[longitude, latitude]` — Stockholm default. */
const STOCKHOLM_CENTER: [number, number] = [18.0686, 59.3293];
const DEFAULT_ZOOM = 12;

/** Scales lon/lat delta to pixels for Expo Go overlay (toy projection, not geographic). */
const EXPO_GO_MOTION_SCALE = 320_000;

function isMapboxNativeAvailable(): boolean {
  return NativeModules.RNMBXModule != null;
}

function lngLatToOverlayPx(
  lngLat: [number, number],
  anchor: [number, number],
  scale: number
): { x: number; y: number } {
  const dLng = lngLat[0] - anchor[0];
  const dLat = lngLat[1] - anchor[1];
  const latRad = (lngLat[1] * Math.PI) / 180;
  return {
    x: dLng * scale * Math.cos(latRad),
    y: -dLat * scale,
  };
}

export function HomeScreen() {
  const { t, theme } = useTheme();
  const locationWatchOptions = useMemo<Location.LocationOptions>(
    () => ({
      accuracy: Location.Accuracy.High,
      distanceInterval: 4,
      timeInterval: 750,
    }),
    []
  );
  const location = useUserLocationWatch(locationWatchOptions);
  const fleet = useVehicleFleet();

  const [mapVisualMode, setMapVisualMode] = useState<MapVisualMode>(() =>
    theme === 'dark' ? 'night' : 'day'
  );
  const [trafficEnabled, setTrafficEnabled] = useState(false);

  const toggleMapVisualMode = useCallback(() => {
    setMapVisualMode((m) => (m === 'day' ? 'night' : 'day'));
  }, []);

  const selectedVehicle = useMemo(
    () => fleet.vehicles.find((v) => v.id === fleet.selectedVehicleId) ?? null,
    [fleet.vehicles, fleet.selectedVehicleId]
  );

  useEffect(() => {
    if (fleet.followMode === 'vehicle' && !fleet.selectedVehicleId) {
      fleet.setFollowMode('none');
    }
  }, [fleet.followMode, fleet.selectedVehicleId, fleet.setFollowMode]);

  if (shouldUseMapLibreOsmDev()) {
    return (
      <Suspense
        fallback={
          <View style={[styles.fill, { backgroundColor: t.bgPage, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={t.brand} />
          </View>
        }
      >
        <HomeMapLibreBodyLazy
          coordinate={location.coordinate}
          fleet={fleet}
          brandColor={t.brand}
          mapVisualMode={mapVisualMode}
          trafficEnabled={trafficEnabled}
          onToggleMapVisualMode={toggleMapVisualMode}
          onToggleTraffic={() => setTrafficEnabled((x) => !x)}
          selectedVehicle={selectedVehicle}
        />
      </Suspense>
    );
  }

  if (!isMapboxNativeAvailable()) {
    return (
      <ExpoGoHomeBody
        coordinate={location.coordinate}
        permissionGranted={location.permissionGranted}
        fleet={fleet}
        mapVisualMode={mapVisualMode}
        trafficEnabled={trafficEnabled}
        onToggleMapVisualMode={toggleMapVisualMode}
        onToggleTraffic={() => setTrafficEnabled((x) => !x)}
        selectedVehicle={selectedVehicle}
        t={t}
      />
    );
  }

  return (
    <HomeMapboxBody
      coordinate={location.coordinate}
      fleet={fleet}
      brandColor={t.brand}
      mapVisualMode={mapVisualMode}
      trafficEnabled={trafficEnabled}
      onToggleMapVisualMode={toggleMapVisualMode}
      onToggleTraffic={() => setTrafficEnabled((x) => !x)}
      selectedVehicle={selectedVehicle}
    />
  );
}

type FleetBundle = ReturnType<typeof useVehicleFleet>;

function ExpoGoHomeBody({
  coordinate,
  permissionGranted,
  fleet,
  mapVisualMode,
  trafficEnabled,
  onToggleMapVisualMode,
  onToggleTraffic,
  selectedVehicle,
  t,
}: {
  coordinate: UserLngLat | null;
  permissionGranted: boolean;
  fleet: FleetBundle;
  mapVisualMode: MapVisualMode;
  trafficEnabled: boolean;
  onToggleMapVisualMode: () => void;
  onToggleTraffic: () => void;
  selectedVehicle: import('../services/api').VehiclePositionRow | null;
  t: ReturnType<typeof useTheme>['t'];
}) {
  const userAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    if (!coordinate) return;
    const { x, y } = lngLatToOverlayPx(coordinate, STOCKHOLM_CENTER, EXPO_GO_MOTION_SCALE);
    Animated.spring(userAnim, {
      toValue: { x, y },
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [coordinate, userAnim]);

  const onVehiclePress = async (id: string) => {
    await markerTapFeedback();
    fleet.selectVehicle(id);
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.bgPage }]}>
      <MapPlaceholder />
      <MapHomeControls
        mapVisualMode={mapVisualMode}
        onToggleMapVisualMode={onToggleMapVisualMode}
        trafficEnabled={trafficEnabled}
        onToggleTraffic={onToggleTraffic}
        followMode={fleet.followMode}
        onSetFollowMode={fleet.setFollowMode}
        hasSelectedVehicle={fleet.selectedVehicleId != null}
      />
      <View style={styles.expoGoMarkerHost} pointerEvents="box-none">
        {fleet.vehiclesLngLat.map((v) => (
          <AnimatedVehicleExpoMarker
            key={v.id}
            lngLat={v.lngLat}
            anchor={STOCKHOLM_CENTER}
            scale={EXPO_GO_MOTION_SCALE}
            onPress={() => void onVehiclePress(v.id)}
          >
            <IconKeyGoLogo size={28} color={t.brand} strokeWidth={1.65} />
          </AnimatedVehicleExpoMarker>
        ))}
        {permissionGranted && coordinate ? (
          <View style={[StyleSheet.absoluteFillObject, styles.expoGoMarkerLayer]}>
            <Animated.View style={[styles.expoGoUserDot, { transform: userAnim.getTranslateTransform() }]} />
          </View>
        ) : null}
      </View>
      <MapVehicleInfoCard
        vehicle={selectedVehicle}
        onClose={() => fleet.selectVehicle(null)}
      />
    </View>
  );
}

function AnimatedVehicleExpoMarker({
  lngLat,
  anchor,
  scale,
  onPress,
  children,
}: {
  lngLat: [number, number];
  anchor: [number, number];
  scale: number;
  onPress: () => void;
  children: ReactNode;
}) {
  const anim = useRef(
    new Animated.ValueXY(lngLatToOverlayPx(lngLat, anchor, scale))
  ).current;

  useEffect(() => {
    const { x, y } = lngLatToOverlayPx(lngLat, anchor, scale);
    Animated.spring(anim, {
      toValue: { x, y },
      friction: 7,
      tension: 42,
      useNativeDriver: true,
    }).start();
  }, [lngLat[0], lngLat[1], anchor, scale, anim]);

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.expoGoMarkerLayer]}>
      <Animated.View style={{ transform: anim.getTranslateTransform() }}>
        <Pressable onPress={onPress} hitSlop={10} style={styles.expoVehicleHit}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function HomeMapboxBody({
  coordinate,
  fleet,
  brandColor,
  mapVisualMode,
  trafficEnabled,
  onToggleMapVisualMode,
  onToggleTraffic,
  selectedVehicle,
}: {
  coordinate: UserLngLat | null;
  fleet: FleetBundle;
  brandColor: string;
  mapVisualMode: MapVisualMode;
  trafficEnabled: boolean;
  onToggleMapVisualMode: () => void;
  onToggleTraffic: () => void;
  selectedVehicle: import('../services/api').VehiclePositionRow | null;
}) {
  const Mapbox = useMemo(
    () => require('@rnmapbox/maps') as typeof import('@rnmapbox/maps'),
    []
  );

  const cameraRef = useRef<MapboxCameraHandle | null>(null);
  const didInitialCenter = useRef(false);
  const [userZoom, setUserZoom] = useState(14);

  const styleURL = useMemo(() => {
    if (trafficEnabled) {
      return mapVisualMode === 'night' ? Mapbox.StyleURL.TrafficNight : Mapbox.StyleURL.TrafficDay;
    }
    return mapVisualMode === 'night' ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street;
  }, [Mapbox, mapVisualMode, trafficEnabled]);

  const selectedLngLat = useMemo(() => {
    if (!fleet.selectedVehicleId) return null;
    return fleet.vehiclesLngLat.find((v) => v.id === fleet.selectedVehicleId)?.lngLat ?? null;
  }, [fleet.selectedVehicleId, fleet.vehiclesLngLat]);

  useLayoutEffect(() => {
    void Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);
  }, [Mapbox]);

  useEffect(() => {
    if (!coordinate || !cameraRef.current || didInitialCenter.current) return;
    didInitialCenter.current = true;
    setUserZoom(14);
    cameraRef.current.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: 14,
      animationDuration: 0,
      animationMode: 'moveTo',
    });
  }, [coordinate]);

  useEffect(() => {
    if (fleet.followMode !== 'user' || !coordinate || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: userZoom,
      animationDuration: 280,
      animationMode: 'easeTo',
    });
  }, [coordinate, fleet.followMode, userZoom]);

  useEffect(() => {
    if (fleet.followMode !== 'vehicle' || !selectedLngLat || !cameraRef.current) return;
    cameraRef.current.setCamera({
      centerCoordinate: selectedLngLat,
      zoomLevel: userZoom,
      animationDuration: 300,
      animationMode: 'easeTo',
    });
  }, [fleet.followMode, selectedLngLat, userZoom]);

  const onRegionDidChange = useCallback(
    (feature: { properties?: { zoomLevel?: number; isUserInteraction?: boolean } }) => {
      const p = feature.properties;
      if (!p) return;
      if (typeof p.zoomLevel === 'number') {
        setUserZoom(p.zoomLevel);
      }
      if (p.isUserInteraction) {
        fleet.setFollowMode('none');
      }
    },
    [fleet]
  );

  const onMapPress = useCallback(() => {
    fleet.selectVehicle(null);
  }, [fleet]);

  const onVehicleSelected = useCallback(
    async (id: string) => {
      await markerTapFeedback();
      fleet.selectVehicle(id);
    },
    [fleet]
  );

  return (
    <View style={styles.fill}>
      <Mapbox.MapView
        style={styles.fill}
        styleURL={styleURL}
        scaleBarEnabled={false}
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled
        gestureSettings={{
          doubleTapToZoomInEnabled: true,
          doubleTouchToZoomOutEnabled: true,
          pinchPanEnabled: true,
          pinchZoomEnabled: true,
          panEnabled: true,
          rotateEnabled: true,
        }}
        onPress={onMapPress}
        onRegionDidChange={onRegionDidChange}
      >
        <Mapbox.Camera
          ref={(instance) => {
            cameraRef.current = instance as unknown as MapboxCameraHandle | null;
          }}
          defaultSettings={{
            centerCoordinate: STOCKHOLM_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />
        {fleet.vehiclesLngLat.map((v) => (
          <Mapbox.PointAnnotation
            key={v.id}
            id={`vehicle-${v.id}`}
            coordinate={v.lngLat}
            onSelected={() => void onVehicleSelected(v.id)}
          >
            <View style={styles.vehicleMarkerWrap}>
              <IconKeyGoLogo size={28} color={brandColor} strokeWidth={1.65} />
            </View>
          </Mapbox.PointAnnotation>
        ))}
        {coordinate ? (
          <Mapbox.PointAnnotation id={TRACKABLE_USER_ID} coordinate={coordinate}>
            <View style={styles.mapboxUserMarker} />
          </Mapbox.PointAnnotation>
        ) : null}
      </Mapbox.MapView>
      <MapHomeControls
        mapVisualMode={mapVisualMode}
        onToggleMapVisualMode={onToggleMapVisualMode}
        trafficEnabled={trafficEnabled}
        onToggleTraffic={onToggleTraffic}
        followMode={fleet.followMode}
        onSetFollowMode={fleet.setFollowMode}
        hasSelectedVehicle={fleet.selectedVehicleId != null}
      />
      <MapVehicleInfoCard
        vehicle={selectedVehicle}
        onClose={() => fleet.selectVehicle(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  vehicleMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapboxUserMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A84FF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  expoGoMarkerHost: {
    ...StyleSheet.absoluteFillObject,
  },
  expoGoMarkerLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expoVehicleHit: {
    padding: 4,
  },
  expoGoUserDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A84FF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
});
