import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentTopInset, useFloatingTabBarBottomInset } from '../navigation/floatingTabBar';
import { spacing } from '../theme/tokens';

type Props = {
  children: ReactNode;
  /** 'center' for splash-style screens; 'stretch' for lists and forms */
  align?: 'center' | 'stretch';
  /**
   * When true (default), reserves space for the custom floating bottom tab bar on scrollable content.
   * Set false for auth and other screens outside the tab navigator.
   */
  tabBarInset?: boolean;
  /**
   * When true, wraps children in a vertical ScrollView (content can scroll under the floating bar).
   * When false, children handle scrolling (e.g. FlatList) — use `useFloatingTabBarBottomInset()` on `contentContainerStyle`.
   * Default: true if `tabBarInset`, else false.
   */
  scrollable?: boolean;
  /** When false, outer ScrollView does not scroll (e.g. while a modal is open). Default true. */
  scrollEnabled?: boolean;
};

export function ScreenContainer({
  children,
  align = 'center',
  tabBarInset = true,
  scrollable,
  scrollEnabled = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const topInset = useContentTopInset();
  const tabBarBottomInset = useFloatingTabBarBottomInset();
  const bottomPad = tabBarInset ? tabBarBottomInset : Math.max(insets.bottom, 12) + 20;
  const useOuterScroll = scrollable === true || (scrollable === undefined && tabBarInset);

  const padding = { paddingHorizontal: spacing.screenX, paddingTop: topInset, paddingBottom: bottomPad };

  if (useOuterScroll) {
    return (
      <View style={styles.safe}>
        <ScrollView
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollInner,
            align === 'stretch' ? styles.scrollStretch : styles.scrollCenter,
            padding,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  /** List / custom scroll: no outer insets — children apply top/bottom inside their scroll surface (matches Profile edge-to-edge). */
  return (
    <View style={styles.safe}>
      <View style={[styles.flex, styles.fillBleed]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  fillBleed: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  scrollInner: {
    flexGrow: 1,
  },
  scrollCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollStretch: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    alignSelf: 'stretch',
  },
});
