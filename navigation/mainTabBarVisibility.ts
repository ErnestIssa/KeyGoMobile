import type { NavigationState, Route } from '@react-navigation/native';
import type { AppTabParamList } from './types';

type RouteWithOptionalState = Route<string> & {
  state?: NavigationState;
};

/** Deepest focused route name inside a tab (or the tab route name if the stack isn’t mounted yet). */
export function getNestedFocusedRouteName(route: Route<string>): string | undefined {
  const st = (route as RouteWithOptionalState).state;
  if (!st || st.routes == null || st.index == null) return route.name;
  const r = st.routes[st.index];
  return r?.name;
}

/**
 * When true, the floating main tab pill should hide (user left the “hub” screen for that tab).
 * Home is always a hub. Action (owner) is only Create — always a hub.
 */
export function shouldHideMainTabBar(state: NavigationState, isOwner: boolean): boolean {
  const focused = state.routes[state.index];
  const tab = focused.name as keyof AppTabParamList;
  const nested = getNestedFocusedRouteName(focused);

  switch (tab) {
    case 'Home':
      return false;
    case 'MyTrips':
      return nested === 'TripDetail';
    case 'Action':
      if (isOwner) return false;
      return nested === 'TripDetail';
    case 'Chat':
      return nested === 'ChatThread';
    case 'Profile':
      return nested != null && nested !== 'ProfileHome' && nested !== 'Profile';
    default:
      return false;
  }
}
