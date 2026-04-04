import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import type { NavigationState, PartialState, Route } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useContext, useEffect, useRef, type MutableRefObject, type ReactNode } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  IconChat,
  IconHome,
  IconKeyGoLogo,
  IconMyTrips,
  IconProfile,
} from '../components/icons/navIcons';
import { useAuth } from '../context/AuthContext';
import { useChatUnread } from '../context/ChatUnreadContext';
import { hapticSelection } from '../services/haptics';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';
import { FLOATING_TAB_BAR_BOTTOM_GAP, FLOATING_TAB_BAR_HORIZONTAL_INSET } from './floatingTabBar';
import type { AppTabParamList } from './types';
import type { ThemeTokens } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Prevents overlapping tab presses while a navigation is in flight. */
const NAV_INTERACTION_LOCK_MS = 260;

const ICON_TAB = 26;
const ICON_CENTER_LOGO = 38;
const STROKE_TAB = 2.35;
const KEYGO_LOGO_STROKE = 1.6;

type RouteWithOptionalState = Route<string> & {
  state?: NavigationState | PartialState<NavigationState>;
};

function routeIndexForName(
  state: NavigationState | PartialState<NavigationState>,
  name: keyof AppTabParamList
) {
  const routes = state.routes ?? [];
  return routes.findIndex((r) => r.name === name);
}

function nestedRouteName(route: Route<string>): string | undefined {
  const st = (route as RouteWithOptionalState).state;
  if (!st || st.routes == null || st.index == null) return route.name;
  const r = st.routes[st.index];
  return r?.name;
}

/** Must match AppTabs screen order — used so only one tab is “active” at a time. */
const TAB_HOME = 0;
const TAB_MY_TRIPS = 1;
const TAB_ACTION = 2;
const TAB_CHAT = 3;
const TAB_PROFILE = 4;

type TabBarItemProps = {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  flex?: number;
  brandColor: string;
  mutedColor: string;
  softBg: string;
  navInteractionLockRef: MutableRefObject<boolean>;
  badgeCount?: number;
  badgeBgColor?: string;
};

/** Aligned with AppTabs tab scene fade duration */
const HIGHLIGHT_MS = 640;
const HIGHLIGHT_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const TAB_SCALE_DOWN = 0.96;
const TAB_PRESS_SPRING = { damping: 24, stiffness: 175, mass: 0.95 } as const;

function TabBarItem({
  active,
  label,
  icon,
  onPress,
  flex = 1,
  brandColor,
  mutedColor,
  softBg,
  navInteractionLockRef,
  badgeCount,
  badgeBgColor,
}: TabBarItemProps) {
  const scale = useSharedValue(1);
  const highlight = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    highlight.value = withTiming(active ? 1 : 0, {
      duration: HIGHLIGHT_MS,
      easing: HIGHLIGHT_EASING,
    });
  }, [active]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const innerBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(highlight.value, [0, 1], ['transparent', softBg]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(highlight.value, [0, 1], [mutedColor, brandColor]),
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => {
        if (navInteractionLockRef.current) return;
        navInteractionLockRef.current = true;
        setTimeout(() => {
          navInteractionLockRef.current = false;
        }, NAV_INTERACTION_LOCK_MS);
        void hapticSelection();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(TAB_SCALE_DOWN, TAB_PRESS_SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, TAB_PRESS_SPRING);
      }}
      style={[styles.tabItemOuter, { flex }, anim]}
    >
      <Animated.View style={[styles.tabItemInner, innerBg]}>
        <View style={styles.iconWrap}>
          {icon}
          {badgeCount != null && badgeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: badgeBgColor ?? brandColor }]}>
              <Text style={[styles.badgeText, { fontFamily: FF.bold }]}>
                {badgeCount > 99 ? '99+' : String(badgeCount)}
              </Text>
            </View>
          ) : null}
        </View>
        <Animated.Text numberOfLines={1} style={[styles.tabLabel, labelStyle, { fontFamily: FF.semibold }]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

type CenterActionTabProps = {
  centerActive: boolean;
  centerLabel: string;
  isOwner: boolean;
  navigation: BottomTabBarProps['navigation'];
  t: ThemeTokens;
  navInteractionLockRef: MutableRefObject<boolean>;
};

function CenterActionTab({
  centerActive,
  centerLabel,
  isOwner,
  navigation,
  t,
  navInteractionLockRef,
}: CenterActionTabProps) {
  const scale = useSharedValue(1);
  const highlight = useSharedValue(centerActive ? 1 : 0);

  useEffect(() => {
    highlight.value = withTiming(centerActive ? 1 : 0, {
      duration: HIGHLIGHT_MS,
      easing: HIGHLIGHT_EASING,
    });
  }, [centerActive]);

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const innerBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(highlight.value, [0, 1], ['transparent', t.brandSoft]),
  }));

  return (
    <View style={styles.centerSlot}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={isOwner ? 'Create trip' : 'Browse trips'}
        accessibilityState={{ selected: centerActive }}
        onPress={() => {
          if (navInteractionLockRef.current) return;
          navInteractionLockRef.current = true;
          setTimeout(() => {
            navInteractionLockRef.current = false;
          }, NAV_INTERACTION_LOCK_MS);
          void hapticSelection();
          if (isOwner) {
            navigation.navigate('Action', { screen: 'Create' });
          } else {
            navigation.navigate('Action', { screen: 'Browse' });
          }
        }}
        onPressIn={() => {
          scale.value = withSpring(TAB_SCALE_DOWN, TAB_PRESS_SPRING);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, TAB_PRESS_SPRING);
        }}
        style={[styles.tabItemOuter, { flex: 1 }, anim]}
      >
        <Animated.View style={[styles.tabItemInner, innerBg]}>
          <View style={styles.iconWrap}>
            <IconKeyGoLogo size={ICON_CENTER_LOGO} color={t.accent} strokeWidth={KEYGO_LOGO_STROKE} />
          </View>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.tabLabel, styles.centerPinkLabel, { color: t.accent, fontFamily: FF.bold }]}
          >
            {centerLabel}
          </Text>
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
}

export function WebTabBar({ state, navigation }: BottomTabBarProps) {
  const { t, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useChatUnread();
  const isOwner = user?.role === 'owner';
  const navInteractionLockRef = useRef(false);
  const onTabBarHeightChange = useContext(BottomTabBarHeightCallbackContext);

  const idxAction = routeIndexForName(state, 'Action');
  const actionRoute = idxAction >= 0 ? state.routes[idxAction] : undefined;
  const actionNested = actionRoute ? nestedRouteName(actionRoute) : undefined;

  const idx = state.index;
  const homeActive = idx === TAB_HOME;
  const mineActive = idx === TAB_MY_TRIPS;
  const centerActive = isOwner
    ? idx === TAB_ACTION && actionNested === 'Create'
    : idx === TAB_ACTION && actionNested === 'Browse';
  const chatActive = idx === TAB_CHAT;
  const profileActive = idx === TAB_PROFILE;

  const centerLabel = isOwner ? 'Create' : 'Browse';

  /** Hairline pink ring around the floating pill (matches brand accent, very subtle). */
  const pillBorderColor =
    theme === 'dark' ? 'rgba(244, 114, 182, 0.42)' : 'rgba(219, 39, 119, 0.34)';
  const tabShadow =
    theme === 'dark'
      ? { shadowColor: '#000' as const, shadowOpacity: 0.4, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } }
      : { shadowColor: '#000' as const, shadowOpacity: 0.12, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } };

  const barContent = (
    <View style={styles.row}>
      <TabBarItem
        active={homeActive}
        label="Home"
        brandColor={t.brand}
        mutedColor={t.textMuted}
        softBg={t.brandSoft}
        navInteractionLockRef={navInteractionLockRef}
        icon={<IconHome size={ICON_TAB} color={homeActive ? t.brand : t.textMuted} strokeWidth={STROKE_TAB} />}
        onPress={() => navigation.navigate('Home')}
      />
      <TabBarItem
        active={mineActive}
        label="My trips"
        brandColor={t.brand}
        mutedColor={t.textMuted}
        softBg={t.brandSoft}
        navInteractionLockRef={navInteractionLockRef}
        icon={<IconMyTrips size={ICON_TAB} color={mineActive ? t.brand : t.textMuted} strokeWidth={STROKE_TAB} />}
        onPress={() => navigation.navigate('MyTrips', { screen: 'MyTripsList' })}
      />

      <CenterActionTab
        centerActive={centerActive}
        centerLabel={centerLabel}
        isOwner={isOwner}
        navigation={navigation}
        t={t}
        navInteractionLockRef={navInteractionLockRef}
      />

      <TabBarItem
        active={chatActive}
        label="Chat"
        brandColor={t.brand}
        mutedColor={t.textMuted}
        softBg={t.brandSoft}
        navInteractionLockRef={navInteractionLockRef}
        badgeCount={unreadCount}
        badgeBgColor={t.accent}
        icon={<IconChat size={ICON_TAB} color={chatActive ? t.brand : t.textMuted} strokeWidth={STROKE_TAB} />}
        onPress={() => navigation.navigate('Chat', { screen: 'ConversationsList' })}
      />
      <TabBarItem
        active={profileActive}
        label="Profile"
        brandColor={t.brand}
        mutedColor={t.textMuted}
        softBg={t.brandSoft}
        navInteractionLockRef={navInteractionLockRef}
        icon={<IconProfile size={ICON_TAB} color={profileActive ? t.brand : t.textMuted} strokeWidth={STROKE_TAB} />}
        onPress={() => navigation.navigate('Profile', { screen: 'ProfileHome' })}
      />
    </View>
  );

  const outerPaddingBottom = FLOATING_TAB_BAR_BOTTOM_GAP + insets.bottom;

  const roundedShell = (children: ReactNode) =>
    Platform.OS === 'ios' ? (
      <BlurView
        intensity={88}
        tint={theme === 'dark' ? 'dark' : 'light'}
        style={[styles.blurInner, { borderColor: pillBorderColor }]}
      >
        {children}
      </BlurView>
    ) : (
      <View
        style={[
          styles.androidInner,
          {
            backgroundColor: theme === 'dark' ? `${t.bgElevated}F0` : `${t.bgElevated}F5`,
            borderColor: pillBorderColor,
          },
        ]}
      >
        {children}
      </View>
    );

  const onLayout = (e: LayoutChangeEvent) => {
    onTabBarHeightChange?.(e.nativeEvent.layout.height);
  };

  return (
    <View
      pointerEvents="box-none"
      onLayout={onLayout}
      style={[
        styles.floatOuter,
        {
          paddingHorizontal: FLOATING_TAB_BAR_HORIZONTAL_INSET,
          paddingBottom: outerPaddingBottom,
        },
      ]}
    >
      <View style={[styles.floatShadow, tabShadow]}>{roundedShell(barContent)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Custom tab bars do not receive `tabBarStyle`; without this, the bar stays in document flow
   * and reserves a full-width bottom strip. Overlay so only the pill occludes content.
   */
  floatOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
    elevation: 100,
  },
  floatShadow: {
    borderRadius: 28,
    overflow: 'visible',
  },
  blurInner: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  androidInner: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tabItemOuter: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 2,
    /** iconWrap 44 + gap + label — 50 was clipping the bottom label row */
    minHeight: 60,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    flexShrink: 0,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 12,
  },
  tabLabel: {
    fontSize: 10,
    textAlign: 'center',
    maxWidth: '100%',
    flexShrink: 0,
  },
  centerSlot: {
    flex: 1,
    minWidth: 64,
    maxWidth: 84,
    zIndex: 10,
  },
  /** Ensures accent label isn’t flattened on Android when nested in Animated.View */
  centerPinkLabel: Platform.select({
    android: { marginTop: 0, includeFontPadding: false },
    default: { marginTop: 0 },
  }),
});
