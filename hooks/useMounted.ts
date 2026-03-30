import { useEffect, useRef } from 'react';

/** Returns whether the component is still mounted (useful to avoid setState after unmount). */
export function useMounted(): () => boolean {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return () => mounted.current;
}
