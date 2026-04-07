/**
 * Temporary dev map: MapLibre Native + free OSM/Carto styles (no Mapbox token).
 * Mirrors `HomeMapboxBody` in HomeScreen — markers, follow modes, camera — using `@maplibre/maplibre-react-native`.
 * Production Mapbox implementation remains in HomeScreen (`HomeMapboxBody`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Camera, MapView, PointAnnotation } from '@maplibre/maplibre-react-native';
import { IconKeyGoLogo } from '../icons/navIcons';
import { MapHomeControls, type MapVisualMode } from './MapHomeControls';
import { MapVehicleInfoCard } from './MapVehicleInfoCard';
import type { useVehicleFleet } from '../../hooks/useVehicleFleet';
import type { UserLngLat } from '../../hooks/useUserLocationWatch';
import type { MapboxCameraHandle } from '../../lib/map/mapboxCamera';
import { mapLibreDevStyleUrl } from '../../lib/map/maplibreDevStyles';
import { markerTapFeedback } from '../../lib/map/markerTapFeedback';
import { TRACKABLE_USER_ID } from '../../lib/map/tracking';

/** `[longitude, latitude]` — Stockholm default; matches Mapbox HomeScreen. */
const STOCKHOLM_CENTER: [number, number] = [18.0686, 59.3293];
const DEFAULT_ZOOM = 12;

type FleetBundle = ReturnType<typeof useVehicleFleet>;

type Props = {
  coordinate: UserLngLat | null;
  fleet: FleetBundle;
  brandColor: string;
  mapVisualMode: MapVisualMode;
  trafficEnabled: boolean;
  onToggleMapVisualMode: () => void;
  onToggleTraffic: () => void;
  selectedVehicle: import('../../services/api').VehiclePositionRow | null;
};

export function HomeMapLibreBody({
  coordinate,
  fleet,
  brandColor,
  mapVisualMode,
  trafficEnabled,
  onToggleMapVisualMode,
  onToggleTraffic,
  selectedVehicle,
}: Props) {
  const cameraRef = useRef<MapboxCameraHandle | null>(null);
  const didInitialCenter = useRef(false);
  const [userZoom, setUserZoom] = useState(14);

  const mapStyle = useMemo(
    () => mapLibreDevStyleUrl(mapVisualMode, trafficEnabled),
    [mapVisualMode, trafficEnabled]
  );

  const selectedLngLat = useMemo(() => {
    if (!fleet.selectedVehicleId) return null;
    return fleet.vehiclesLngLat.find((v) => v.id === fleet.selectedVehicleId)?.lngLat ?? null;
  }, [fleet.selectedVehicleId, fleet.vehiclesLngLat]);

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
    (feature: GeoJSON.Feature<GeoJSON.Point, { zoomLevel?: number; isUserInteraction?: boolean }>) => {
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
      <MapView
        style={styles.fill}
        mapStyle={mapStyle}
        scrollEnabled
        zoomEnabled
        pitchEnabled
        rotateEnabled
        onPress={onMapPress}
        onRegionDidChange={onRegionDidChange}
      >
        <Camera
          ref={(instance) => {
            cameraRef.current = instance as unknown as MapboxCameraHandle | null;
          }}
          defaultSettings={{
            centerCoordinate: STOCKHOLM_CENTER,
            zoomLevel: DEFAULT_ZOOM,
          }}
        />
        {fleet.vehiclesLngLat.map((v) => (
          <PointAnnotation
            key={v.id}
            id={`vehicle-${v.id}`}
            coordinate={v.lngLat}
            onSelected={() => onVehicleSelected(v.id)}
          >
            <View style={styles.vehicleMarkerWrap}>
              <IconKeyGoLogo size={28} color={brandColor} strokeWidth={1.65} />
            </View>
          </PointAnnotation>
        ))}
        {coordinate ? (
          <PointAnnotation id={TRACKABLE_USER_ID} coordinate={coordinate}>
            <View style={styles.maplibreUserMarker} />
          </PointAnnotation>
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
      <MapVehicleInfoCard vehicle={selectedVehicle} onClose={() => fleet.selectVehicle(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  vehicleMarkerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  maplibreUserMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0A84FF',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
});
