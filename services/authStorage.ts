import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types/user';

const TOKEN_KEY = 'keygo_token';
const USER_KEY = 'keygo_user';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function saveAuth(token: string, user: User): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function loadStoredAuth(): Promise<{ token: string | null; user: User | null }> {
  const [token, userRaw] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  const t = token[1];
  const raw = userRaw[1];
  if (!t || !raw) return { token: null, user: null };
  try {
    return { token: t, user: JSON.parse(raw) as User };
  } catch {
    await clearAuth();
    return { token: null, user: null };
  }
}
