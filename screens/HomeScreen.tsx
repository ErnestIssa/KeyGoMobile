/**
 * WHAT THIS DOES
 * - Fleet state: `VehicleFleetProvider` + `useVehicleFleet` (poll + RAF lerp; `applyFleetSnapshot` for WebSockets).
 * - `expo-location`: user GPS (`useUserLocationWatch`).
 * - Native: Mapbox (prod) or MapLibre + OSM (EXPO_PUBLIC_USE_MAPLIBRE=1 dev), follow (user / vehicle / pan), marker tap → card + haptics + sound.
 * - Expo Go / no native Mapbox: `react-native-maps` (Apple Maps on iOS, Google on Android) + markers + follow modes.
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
} from 'react';
import { ActivityIndicator, NativeModules, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { IconKeyGoLogo } from '../components/icons/navIcons';
import { MapHomeControls, type MapVisualMode } from '../components/map/MapHomeControls';
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

/** ~zoom 14 for `animateToRegion` in Expo Go map. */
const EXPO_GO_REGION_DELTA = { latitudeDelta: 0.015, longitudeDelta: 0.015 };

function isMapboxNativeAvailable(): boolean {
  return NativeModules.RNMBXModule != null;
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
  const mapRef = useRef<MapView | null>(null);
  const didInitialCenter = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const selectedLngLat = useMemo(() => {
    if (!fleet.selectedVehicleId) return null;
    return fleet.vehiclesLngLat.find((v) => v.id === fleet.selectedVehicleId)?.lngLat ?? null;
  }, [fleet.selectedVehicleId, fleet.vehiclesLngLat]);

  const animateToLngLat = useCallback((lngLat: [number, number], duration: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude: lngLat[1],
        longitude: lngLat[0],
        ...EXPO_GO_REGION_DELTA,
      },
      duration
    );
  }, []);

  useEffect(() => {
    if (!mapReady || !coordinate || didInitialCenter.current) return;
    didInitialCenter.current = true;
    animateToLngLat(coordinate, 0);
  }, [mapReady, coordinate, animateToLngLat]);

  useEffect(() => {
    if (!mapReady || !didInitialCenter.current) return;
    if (fleet.followMode !== 'user' || !coordinate) return;
    animateToLngLat(coordinate, 280);
  }, [mapReady, coordinate, fleet.followMode, animateToLngLat]);

  useEffect(() => {
    if (!mapReady || !didInitialCenter.current) return;
    if (fleet.followMode !== 'vehicle' || !selectedLngLat) return;
    animateToLngLat(selectedLngLat, 300);
  }, [mapReady, fleet.followMode, selectedLngLat, animateToLngLat]);

  const onMapPress = useCallback(() => {
    fleet.selectVehicle(null);
  }, [fleet]);

  const onVehiclePress = async (id: string) => {
    await markerTapFeedback();
    fleet.selectVehicle(id);
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.bgPage }]}>
      <MapView
        ref={mapRef}
        style={styles.fill}
        initialRegion={{
          latitude: STOCKHOLM_CENTER[1],
          longitude: STOCKHOLM_CENTER[0],
          ...EXPO_GO_REGION_DELTA,
        }}
        mapType="standard"
        userInterfaceStyle={mapVisualMode === 'night' ? 'dark' : 'light'}
        showsTraffic={trafficEnabled}
        rotateEnabled
        pitchEnabled
        scrollEnabled
        zoomEnabled
        onMapReady={() => setMapReady(true)}
        onPress={onMapPress}
        onPanDrag={() => fleet.setFollowMode('none')}
      >
        {fleet.vehiclesLngLat.map((v) => (
          <Marker
            key={v.id}
            coordinate={{ latitude: v.lngLat[1], longitude: v.lngLat[0] }}
            onPress={() => void onVehiclePress(v.id)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.vehicleMarkerWrap}>
              <IconKeyGoLogo size={28} color={t.brand} strokeWidth={1.65} />
            </View>
          </Marker>
        ))}
        {permissionGranted && coordinate ? (
          <Marker
            coordinate={{ latitude: coordinate[1], longitude: coordinate[0] }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={1000}
          >
            <View style={styles.expoGoUserDot} />
          </Marker>
        ) : null}
      </MapView>
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
  expoGoUserDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A84FF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
});
