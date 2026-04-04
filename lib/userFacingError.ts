import { ApiError } from '../services/api';

/** Maps API/network errors to short, non-technical copy for end users. */
export function friendlyErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 0) {
      return "We couldn't reach the server. Check your connection and try again.";
    }
    if (err.status === 401) {
      const raw = err.message.trim();
      if (/token/i.test(raw) && raw.length < 80) {
        return 'Please sign in again to continue.';
      }
      if (raw.length > 0 && raw.length < 200) {
        return raw;
      }
      return 'Please sign in again to continue.';
    }
    if (err.status === 403) {
      return "You don't have access to this.";
    }
    if (err.status === 404) {
      return "We couldn't find what you're looking for.";
    }
    if (err.status >= 500) {
      return 'Something went wrong on our side. Please try again in a moment.';
    }
    const m = err.message.trim();
    if (m.length > 0 && m.length < 200) {
      return m;
    }
  }
  return 'Something went wrong. Please try again.';
}
