/**
 * API client — set EXPO_PUBLIC_API_URL to your server origin (e.g. https://your-api.onrender.com), no trailing slash.
 * Requests are sent to `${EXPO_PUBLIC_API_URL}/api/...`.
 */

import { clearAuth, getToken, saveAuth } from './authStorage';
import type { User } from '../types/user';

export type { User } from '../types/user';

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type AuthResponse = {
  token: string;
  user: User;
};

function isPublicAuthPath(path: string): boolean {
  const base = path.split('?')[0];
  return base === '/auth/login' || base === '/auth/register';
}

function buildUrl(path: string): string {
  const segment = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    throw new ApiError(
      'EXPO_PUBLIC_API_URL is not set. Add it in .env (e.g. EXPO_PUBLIC_API_URL=https://your-api.onrender.com).',
      0
    );
  }
  return `${API_BASE_URL}/api${segment}`;
}

/**
 * Generic JSON fetch helper. Attaches `Authorization: Bearer <token>` except for `/auth/login` and `/auth/register`.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  if (!isPublicAuthPath(path)) {
    const token = await getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const body = init.body;
  if (body !== undefined && body !== null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError('Network request failed. Check your connection and EXPO_PUBLIC_API_URL.', 0);
  }

  const text = await res.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      if (!res.ok) {
        throw new ApiError(text.slice(0, 200) || res.statusText || 'Request failed', res.status);
      }
      throw new ApiError('Invalid JSON in response', res.status);
    }
  } else {
    data = undefined;
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : res.statusText || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

/** POST /api/auth/login */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await saveAuth(data.token, data.user);
  return data;
}

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role: 'owner' | 'driver';
};

/** POST /api/auth/register */
export async function register(userData: RegisterPayload): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
  await saveAuth(data.token, data.user);
  return data;
}

/** Clear stored credentials (e.g. sign out). */
export async function logout(): Promise<void> {
  await clearAuth();
}

export type TripParty = {
  id: string;
  name?: string;
  email?: string;
};

export type TripVehicleLocation = {
  latitude: number;
  longitude: number;
  heading?: number;
  recordedAt: string;
};

export type Trip = {
  id: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  vehicleLocation?: TripVehicleLocation;
  carDescription: string;
  paymentAmount: number;
  status: string;
  createdAt?: string;
  owner?: TripParty;
  driver?: TripParty;
  /** From API — only the server decides which actions this user may perform. */
  allowedActions?: { accept: boolean; complete: boolean };
};

/**
 * GET /api/jobs — available driver work (requires driver JWT).
 */
export async function getJobs(init?: RequestInit): Promise<Trip[]> {
  const data = await request<{ trips: Trip[] }>('/jobs', { method: 'GET', ...init });
  return data.trips;
}

export async function getProfile(): Promise<{ user: User }> {
  return request<{ user: User }>('/users/profile', { method: 'GET' });
}

/** PATCH /api/users/role — `{ role: "owner" | "driver" }`; returns new JWT + user */
export async function switchRole(role: 'owner' | 'driver'): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/users/role', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  await saveAuth(data.token, data.user);
  return data;
}

/** POST /api/users/avatar — body: `{ image: dataUrl }` (data:image/jpeg;base64,...) */
export async function uploadAvatar(imageDataUrl: string): Promise<{ user: User }> {
  return request<{ user: User }>('/users/avatar', {
    method: 'POST',
    body: JSON.stringify({ image: imageDataUrl }),
  });
}

export type CreateTripPayload = {
  pickupLocation: string;
  dropoffLocation: string;
  carDescription: string;
  paymentAmount: number;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
};

export async function createTrip(payload: CreateTripPayload): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listAvailableTrips(): Promise<{ trips: Trip[] }> {
  return request<{ trips: Trip[] }>('/trips/available', { method: 'GET' });
}

export async function listMyTrips(): Promise<{ trips: Trip[] }> {
  return request<{ trips: Trip[] }>('/trips/mine', { method: 'GET' });
}

export async function getTrip(id: string): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}`, { method: 'GET' });
}

export async function acceptTrip(id: string): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    body: '{}',
  });
}

export async function completeTrip(id: string): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: '{}',
  });
}

/** GET /api/vehicles — `{ id, lat, lng, ... }[]` (requires JWT). */
export type VehiclePositionRow = {
  id: string;
  lat: number;
  lng: number;
  status?: string;
  speedKmh?: number;
};

export async function fetchVehicles(init?: RequestInit): Promise<VehiclePositionRow[]> {
  return request<VehiclePositionRow[]>('/vehicles', { method: 'GET', ...init });
}

/** PATCH /api/trips/:id/vehicle-location — driver-only, accepted trips. */
export async function updateTripVehicleLocation(
  id: string,
  body: { latitude: number; longitude: number; heading?: number }
): Promise<{ trip: Trip }> {
  return request<{ trip: Trip }>(`/trips/${encodeURIComponent(id)}/vehicle-location`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
