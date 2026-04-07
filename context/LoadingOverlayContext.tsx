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
import { StyleSheet, View } from 'react-native';
import { BrandedLoading } from '../components/ui/BrandedLoading';

type LoadingOverlayContextValue = {
  begin: () => void;
  end: () => void;
};

const LoadingOverlayContext = createContext<LoadingOverlayContextValue | null>(null);

export function LoadingOverlayProvider({ children }: { children: ReactNode }) {
  const depthRef = useRef(0);
  const [visible, setVisible] = useState(false);

  const begin = useCallback(() => {
    depthRef.current += 1;
    if (depthRef.current === 1) setVisible(true);
  }, []);

  const end = useCallback(() => {
    depthRef.current = Math.max(0, depthRef.current - 1);
    if (depthRef.current === 0) setVisible(false);
  }, []);

  const value = useMemo(() => ({ begin, end }), [begin, end]);

  return (
    <LoadingOverlayContext.Provider value={value}>
      <View style={styles.host}>
        {children}
        {visible ? (
          <View style={styles.overlay} pointerEvents="auto">
            <BrandedLoading fullscreen minimal />
          </View>
        ) : null}
      </View>
    </LoadingOverlayContext.Provider>
  );
}

export function useLoadingOverlay(): LoadingOverlayContextValue {
  const ctx = useContext(LoadingOverlayContext);
  if (!ctx) throw new Error('useLoadingOverlay must be used within LoadingOverlayProvider');
  return ctx;
}

/** Ties a boolean loading flag to the global branded overlay (ref-counted). */
export function useSyncGlobalLoading(loading: boolean) {
  const { begin, end } = useLoadingOverlay();
  useEffect(() => {
    if (!loading) return;
    begin();
    return () => end();
  }, [loading, begin, end]);
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
