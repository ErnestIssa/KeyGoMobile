import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { tokens, type ThemeName, type ThemeTokens } from './tokens';

type ThemeContextValue = {
  theme: ThemeName;
  t: ThemeTokens;
  setTheme: (next: ThemeName) => void;
  toggleTheme: () => void;
  ready: boolean;
};

const STORAGE_KEY = 'keygo_theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function coerceTheme(value: string | null): ThemeName | null {
  return value === 'light' || value === 'dark' ? value : null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const systemTheme: ThemeName = system === 'dark' ? 'dark' : 'light';

  const [theme, setThemeState] = useState<ThemeName>(systemTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (cancelled) return;
        const stored = coerceTheme(v);
        setThemeState(stored ?? systemTheme);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setThemeState(systemTheme);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [systemTheme]);

  const setTheme = useCallback((next: ThemeName) => {
    setThemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, t: tokens[theme], setTheme, toggleTheme, ready }),
    [theme, setTheme, toggleTheme, ready]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

