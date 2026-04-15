import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  listMyTrips,
  postTripLiveLocation,
  type Trip,
  type TripLiveTracking,
} from '../services/api';
import { getSharedChatSocket, subscribeChatRelay } from '../services/chatSocket';
import type { UserLngLat } from './useUserLocationWatch';

const POST_INTERVAL_MS = 2500;
const LERP = 0.22;

export type LiveRelocationMapMarker = {
  id: string;
  lngLat: [number, number];
  kind: 'car' | 'person';
  headingDeg?: number;
};

type SocketTripLivePayload = {
  tripId?: string;
  relocationPhase?: TripLiveTracking['relocationPhase'];
  ownerLiveLocation?: TripLiveTracking['ownerLiveLocation'];
  driverLiveLocation?: TripLiveTracking['driverLiveLocation'];
  ownerMarkerKind?: TripLiveTracking['ownerMarkerKind'];
  driverMarkerKind?: TripLiveTracking['driverMarkerKind'];
};

function liveToMarkers(live: TripLiveTracking | null): LiveRelocationMapMarker[] {
  if (!live) return [];
  const out: LiveRelocationMapMarker[] = [];
  if (live.ownerLiveLocation) {
    out.push({
      id: 'live-owner',
      lngLat: [live.ownerLiveLocation.longitude, live.ownerLiveLocation.latitude],
      kind: live.ownerMarkerKind,
      headingDeg: live.ownerLiveLocation.heading,
    });
  }
  if (live.driverLiveLocation) {
    out.push({
      id: 'live-driver',
      lngLat: [live.driverLiveLocation.longitude, live.driverLiveLocation.latitude],
      kind: live.driverMarkerKind,
      headingDeg: live.driverLiveLocation.heading,
    });
  }
  return out;
}

function isMarkerKind(k: unknown): k is 'car' | 'person' {
  return k === 'car' || k === 'person';
}

function socketPayloadToLive(p: SocketTripLivePayload): TripLiveTracking | null {
  if (!isMarkerKind(p.ownerMarkerKind) || !isMarkerKind(p.driverMarkerKind)) {
    return null;
  }
  return {
    relocationPhase: p.relocationPhase ?? null,
    ownerLiveLocation: p.ownerLiveLocation,
    driverLiveLocation: p.driverLiveLocation,
    ownerMarkerKind: p.ownerMarkerKind,
    driverMarkerKind: p.driverMarkerKind,
  };
}

function pickActiveTrip(trips: Trip[], userId: string): Trip | null {
  for (const t of trips) {
    if (t.status === 'pending' && t.owner?.id === userId) {
      return t;
    }
    if (t.status === 'accepted' && (t.owner?.id === userId || t.driver?.id === userId)) {
      return t;
    }
  }
  return null;
}

/**
 * Server-authoritative relocation tracking: polls `liveTracking`, POSTs GPS on interval, merges `trip_live_update` socket.
 * Map should hide the default user puck when `hideUserPuck` is true and draw `markers` instead.
 */
export function useTripLiveTracking(
  coordinate: UserLngLat | null,
  headingDeg?: number | null
): {
  markers: LiveRelocationMapMarker[];
  activeTripId: string | null;
  hideUserPuck: boolean;
  liveTracking: TripLiveTracking | null;
} {
  const { user, token } = useAuth();
  const userId = user?.id;

  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const activeTripIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeTripIdRef.current = activeTripId;
  }, [activeTripId]);

  const [live, setLive] = useState<TripLiveTracking | null>(null);

  const targetsRef = useRef<LiveRelocationMapMarker[]>([]);
  const [smoothed, setSmoothed] = useState<LiveRelocationMapMarker[]>([]);

  useEffect(() => {
    targetsRef.current = liveToMarkers(live);
  }, [live]);

  useEffect(() => {
    const id = setInterval(() => {
      setSmoothed((prev) => {
        const targets = targetsRef.current;
        if (targets.length === 0) return [];
        return targets.map((t) => {
          const p = prev.find((x) => x.id === t.id);
          if (!p) return t;
          const lng = p.lngLat[0] + (t.lngLat[0] - p.lngLat[0]) * LERP;
          const lat = p.lngLat[1] + (t.lngLat[1] - p.lngLat[1]) * LERP;
          return { ...t, lngLat: [lng, lat] as [number, number] };
        });
      });
    }, 45);
    return () => clearInterval(id);
  }, []);

  const resolveActiveTripCb = useCallback(
    (trips: Trip[]) => {
      if (!userId) return null;
      return pickActiveTrip(trips, userId);
    },
    [userId]
  );

  useEffect(() => {
    if (!token || !userId) {
      setActiveTripId(null);
      setLive(null);
      setSmoothed([]);
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        const { trips } = await listMyTrips();
        if (cancelled) return;
        const t = resolveActiveTripCb(trips);
        if (!t) {
          setActiveTripId(null);
          setLive(null);
          return;
        }
        setActiveTripId(t.id);
        setLive(t.liveTracking ?? null);
      } catch {
        /* keep prior */
      }
    };

    void sync();
    const interval = setInterval(() => void sync(), 25000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, userId, resolveActiveTripCb]);

  useEffect(() => {
    if (!token) return;
    let unsub: (() => void) | undefined;
    void (async () => {
      await getSharedChatSocket();
      unsub = subscribeChatRelay('trip_live_update', (raw) => {
        const p = raw as SocketTripLivePayload;
        if (!p?.tripId || p.tripId !== activeTripIdRef.current) return;
        const next = socketPayloadToLive(p);
        if (next) setLive(next);
      });
    })();
    return () => {
      unsub?.();
    };
  }, [token, activeTripId]);

  const coordRef = useRef(coordinate);
  const headingRef = useRef(headingDeg);
  useEffect(() => {
    coordRef.current = coordinate;
  }, [coordinate]);
  useEffect(() => {
    headingRef.current = headingDeg;
  }, [headingDeg]);

  useEffect(() => {
    if (!token || !activeTripId) return;

    const send = () => {
      const c = coordRef.current;
      if (!c) return;
      const h = headingRef.current;
      void postTripLiveLocation(activeTripId, {
        latitude: c[1],
        longitude: c[0],
        ...(typeof h === 'number' && !Number.isNaN(h) ? { heading: h } : {}),
      })
        .then((res) => {
          if (res.trip?.liveTracking) setLive(res.trip.liveTracking);
        })
        .catch(() => {
          /* offline */
        });
    };

    send();
    const id = setInterval(send, POST_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token, activeTripId]);

  const markers = useMemo(() => smoothed, [smoothed]);
  const hideUserPuck = markers.length > 0;

  return {
    markers,
    activeTripId,
    hideUserPuck,
    liveTracking: live,
  };
}
