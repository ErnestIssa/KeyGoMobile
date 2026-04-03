export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  /** API-relative path e.g. /uploads/avatars/id.jpg */
  avatarUrl?: string;
  /** 0–5 display rating */
  ratingAverage?: number;
};
