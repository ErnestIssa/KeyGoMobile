import { createContext, useContext, type ReactNode } from 'react';

/** When false, the floating tab pill is hidden (subpage); content should use smaller bottom inset. */
const TabBarVisibilityContext = createContext(true);

export function TabBarVisibilityProvider({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  return <TabBarVisibilityContext.Provider value={visible}>{children}</TabBarVisibilityContext.Provider>;
}

export function useIsMainTabBarVisible(): boolean {
  return useContext(TabBarVisibilityContext);
}
