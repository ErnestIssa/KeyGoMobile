/**
 * Imperative Mapbox Camera handle (subset of `@rnmapbox/maps` CameraRef) — avoids deep type imports.
 */
export type MapboxCameraHandle = {
  setCamera: (config: {
    centerCoordinate?: [number, number];
    zoomLevel?: number;
    animationDuration?: number;
    animationMode?: 'flyTo' | 'easeTo' | 'linearTo' | 'moveTo' | 'none';
  }) => void;
};
