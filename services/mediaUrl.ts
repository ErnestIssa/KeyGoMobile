import { API_BASE_URL } from './api';

/** Turn stored `avatarUrl` into a fetchable URI for `<Image source={{ uri }} />`. */
export function resolveAvatarUri(avatarUrl: string | undefined): string | undefined {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) return avatarUrl;
  const path = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}
