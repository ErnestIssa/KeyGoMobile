import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getProfile,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  switchRole as apiSwitchRole,
  type RegisterPayload,
} from '../services/api';
import { getToken, loadStoredAuth, saveAuth } from '../services/authStorage';
import type { User } from '../types/user';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (next: User) => Promise<void>;
  switchRole: (role: 'owner' | 'driver') => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadStoredAuth().then(({ token: t, user: u }) => {
      if (cancelled) return;
      setToken(t);
      setUser(u);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    const data = await apiRegister(payload);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    await apiLogout();
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const t = await getToken();
      if (!t) return;
      const { user: u } = await getProfile();
      await saveAuth(t, u);
      setUser(u);
    } catch {
      /* offline / 401 handled elsewhere */
    }
  }, []);

  const updateUser = useCallback(async (next: User) => {
    const t = await getToken();
    if (t) await saveAuth(t, next);
    setUser(next);
  }, []);

  const switchRole = useCallback(async (role: 'owner' | 'driver') => {
    const data = await apiSwitchRole(role);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateUser,
      switchRole,
    }),
    [user, token, ready, signIn, signUp, signOut, refreshProfile, updateUser, switchRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
