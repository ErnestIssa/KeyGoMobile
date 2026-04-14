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
import {
  fetchBootstrap,
  getProfile,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  switchRole as apiSwitchRole,
  type RegisterPayload,
} from '../services/api';
import { disconnectSharedChatSocket } from '../services/chatSocket';
import { getToken, loadStoredAuth, saveAuth } from '../services/authStorage';
import type { User } from '../types/user';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  ready: boolean;
  /** Public stats from GET /api/public/bootstrap (splash / marketing). */
  bootstrapStats: { userCount: number; tripCount: number } | null;
  /**
   * True only for cold entry to Login (not after sign-out, not after opening Register).
   * Login uses this to show the full branded gate with marketing lines once.
   */
  allowLoginEntryBranding: boolean;
  /** Call when Register (or any non-Login auth screen) mounts so Login skips entry branding on return. */
  markAuthNavigatedBeyondInitialLogin: () => void;
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
  const [bootstrapStats, setBootstrapStats] = useState<{ userCount: number; tripCount: number } | null>(null);
  /** Bumps when auth presentation flags change so `allowLoginEntryBranding` recomputes. */
  const [authPresentationRev, setAuthPresentationRev] = useState(0);
  const entryBrandingAfterSignOutRef = useRef(false);
  const entryBrandingBeyondLoginRef = useRef(false);

  const markAuthNavigatedBeyondInitialLogin = useCallback(() => {
    if (entryBrandingBeyondLoginRef.current) return;
    entryBrandingBeyondLoginRef.current = true;
    setAuthPresentationRev((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [stored, boot] = await Promise.all([
        loadStoredAuth(),
        fetchBootstrap().catch(() => ({ userCount: 0, tripCount: 0, tagline: '' })),
      ]);
      if (cancelled) return;
      setBootstrapStats({ userCount: boot.userCount, tripCount: boot.tripCount });
      setToken(stored.token);
      setUser(stored.user);
      setReady(true);
    })();
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
    entryBrandingAfterSignOutRef.current = true;
    setAuthPresentationRev((n) => n + 1);
    await apiLogout();
    disconnectSharedChatSocket();
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

  const allowLoginEntryBranding =
    !entryBrandingAfterSignOutRef.current && !entryBrandingBeyondLoginRef.current;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      bootstrapStats,
      allowLoginEntryBranding,
      markAuthNavigatedBeyondInitialLogin,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateUser,
      switchRole,
    }),
    [
      user,
      token,
      ready,
      bootstrapStats,
      authPresentationRev,
      allowLoginEntryBranding,
      markAuthNavigatedBeyondInitialLogin,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateUser,
      switchRole,
    ]
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
