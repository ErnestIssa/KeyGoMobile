import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchVehicles, type VehiclePositionRow } from '../services/api';
import { useAuth } from './AuthContext';

/**
 * Live fleet positions for the map — interpolates between API/WebSocket snapshots for smooth markers.
 *
 * **Polling:** `GET /api/vehicles` while authenticated.
 * **WebSocket (later):** call `applyFleetSnapshot(rows)` from your socket handler instead of (or in addition to) polling.
 */
export const VEHICLE_FLEET_POLL_MS = 5000;

export type VehicleLngLat = {
  id: string;
  lngLat: [number, number];
};

export type FollowMode = 'none' | 'user' | 'vehicle';

const LERP = 0.18;
const SNAP_EPS_SQ = 1e-16;

function rowToLngLat(r: VehiclePositionRow): VehicleLngLat {
  return { id: r.id, lngLat: [r.lng, r.lat] };
}

function lerpPair(a: [number, number], b: [number, number], t: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function distSq(a: [number, number], b: [number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

type VehicleFleetContextValue = {
  vehiclesLngLat: VehicleLngLat[];
  /** Latest row data merged with smoothed coordinates (for UI cards). */
  vehicles: VehiclePositionRow[];
  selectedVehicleId: string | null;
  selectVehicle: (id: string | null) => void;
  followMode: FollowMode;
  setFollowMode: (mode: FollowMode) => void;
  /** Push positions from a WebSocket or manual refresh; same shape as REST. */
  applyFleetSnapshot: (rows: VehiclePositionRow[]) => void;
};

const VehicleFleetContext = createContext<VehicleFleetContextValue | null>(null);

export function VehicleFleetProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();

  const [vehiclesLngLat, setVehiclesLngLat] = useState<VehicleLngLat[]>([]);
  const [lastRows, setLastRows] = useState<VehiclePositionRow[]>([]);
  const targetsRef = useRef<VehicleLngLat[]>([]);
  const rafRef = useRef(0);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [followMode, setFollowModeState] = useState<FollowMode>('none');

  const applyFleetSnapshot = useCallback((rows: VehiclePositionRow[]) => {
    setLastRows(rows);
    targetsRef.current = rows.map(rowToLngLat);
  }, []);

  useEffect(() => {
    if (!token) {
      targetsRef.current = [];
      setLastRows([]);
      setVehiclesLngLat([]);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const rows = await fetchVehicles();
        if (cancelled) return;
        applyFleetSnapshot(rows);
      } catch {
        /* keep previous snapshot */
      }
    };

    void poll();
    const intervalId = setInterval(poll, VEHICLE_FLEET_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [token, applyFleetSnapshot]);

  useEffect(() => {
    const tick = () => {
      setVehiclesLngLat((prev) => {
        const targets = targetsRef.current;
        if (targets.length === 0) return [];

        const byId = new Map(prev.map((v) => [v.id, v]));
        return targets.map((tgt) => {
          const cur = byId.get(tgt.id);
          if (!cur) return tgt;
          const next = lerpPair(cur.lngLat, tgt.lngLat, LERP);
          if (distSq(next, tgt.lngLat) < SNAP_EPS_SQ) return tgt;
          return { id: tgt.id, lngLat: next };
        });
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const setFollowMode = useCallback((mode: FollowMode) => {
    setFollowModeState(mode);
  }, []);

  const selectVehicle = useCallback((id: string | null) => {
    setSelectedVehicleId(id);
  }, []);

  const vehicles = useMemo((): VehiclePositionRow[] => {
    const byId = new Map(lastRows.map((r) => [r.id, r]));
    return vehiclesLngLat.map((v) => {
      const row = byId.get(v.id);
      return {
        id: v.id,
        lat: v.lngLat[1],
        lng: v.lngLat[0],
        status: row?.status,
        speedKmh: row?.speedKmh,
      };
    });
  }, [vehiclesLngLat, lastRows]);

  const value = useMemo<VehicleFleetContextValue>(
    () => ({
      vehiclesLngLat,
      vehicles,
      selectedVehicleId,
      selectVehicle,
      followMode,
      setFollowMode,
      applyFleetSnapshot,
    }),
    [
      vehiclesLngLat,
      vehicles,
      selectedVehicleId,
      selectVehicle,
      followMode,
      setFollowMode,
      applyFleetSnapshot,
    ]
  );

  return <VehicleFleetContext.Provider value={value}>{children}</VehicleFleetContext.Provider>;
}

export function useVehicleFleet(): VehicleFleetContextValue {
  const ctx = useContext(VehicleFleetContext);
  if (!ctx) throw new Error('useVehicleFleet must be used within VehicleFleetProvider');
  return ctx;
}
