export type User = {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  /** Short label e.g. "Jane S." — from API */
  displayName?: string;
  role: string;
  /** API-relative path e.g. /uploads/avatars/id.jpg */
  avatarUrl?: string;
  /** 0–5 display rating */
  ratingAverage?: number;
  /** Collected at signup; may be omitted for legacy accounts */
  phone?: string;
};
