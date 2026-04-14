/**
 * KeyGo branded loader — animated car-key mark + pulse ring + bouncing dots.
 * Optional rotating taglines only for session bootstrap (see `showMarketingLines`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { IconKeyGoLogo } from '../icons/navIcons';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

const LOGO_SIZE = 72;
const LOGO_STROKE = 1.55;
/** Time each marketing line stays on screen before advancing. */
export const MARKETING_LINE_INTERVAL_MS = 2800;

function BouncingDot({ color, delayMs }: { color: string; delayMs: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 320, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [delayMs]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, anim]} />;
}

type Props = {
  /** Full canvas background + centered (boot, overlays). */
  fullscreen?: boolean;
  /** Live counts from GET /api/public/bootstrap — enriches rotating lines when `showMarketingLines`. */
  stats?: { userCount: number; tripCount: number } | null;
  /**
   * When true, shows rotating lines under the logo (session bootstrap only).
   * Overlays and in-screen loading use the logo only — no copy below.
   */
  showMarketingLines?: boolean;
  /** When set, these lines rotate instead of the default stats-based copy (e.g. Login cold entry). */
  marketingLines?: string[];
  /** Logo + rings only — no bouncing dots, no marketing copy (generic loading). */
  minimal?: boolean;
  /**
   * Fired once after every line has been shown for one interval (one full loop).
   * Used so the auth gate can wait for a full rotation before Login/Register.
   */
  onMarketingCycleComplete?: () => void;
};

function useMarketingLines(stats: { userCount: number; tripCount: number } | null | undefined) {
  return useMemo(() => {
    const u = stats?.userCount ?? 0;
    const tr = stats?.tripCount ?? 0;
    const uStr = u.toLocaleString();
    const trStr = tr.toLocaleString();
    return [
      'Preparing your workspace…',
      'Making sure routes and safety checks are ready…',
      u > 0 ? `${uStr} drivers and owners on KeyGo` : 'Join drivers and owners who trust KeyGo',
      tr > 0 ? `${trStr} relocations logged` : 'Your trips sync securely with the cloud',
      'Syncing preferences and notifications…',
      'Almost there — polishing the experience…',
    ];
  }, [stats]);
}

export function BrandedLoading({
  fullscreen,
  stats,
  showMarketingLines = false,
  marketingLines: marketingLinesProp,
  minimal = false,
  onMarketingCycleComplete,
}: Props) {
  const { t } = useTheme();
  const breathe = useSharedValue(0);
  const tilt = useSharedValue(0);
  const ringPulse = useSharedValue(0);
  const ringSpin = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 880, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 880, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    ringSpin.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; shared values are stable
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(breathe.value, [0, 1], [0.92, 1.08]) },
      { rotateZ: `${interpolate(tilt.value, [0, 1], [-7, 7])}deg` },
    ],
  }));

  const ringOuterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringPulse.value, [0, 1], [0.2, 0.5]),
    transform: [
      { scale: interpolate(ringPulse.value, [0, 1], [1, 1.35]) },
      { rotateZ: `${ringSpin.value * 360}deg` },
    ],
  }));

  const ringInnerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathe.value, [0, 1], [0.35, 0.65]),
    transform: [{ scale: interpolate(breathe.value, [0, 1], [0.88, 1.02]) }],
  }));

  const defaultLines = useMarketingLines(stats ?? null);
  const lines = marketingLinesProp?.length ? marketingLinesProp : defaultLines;
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (minimal || !showMarketingLines || lines.length === 0) return;
    const id = setInterval(() => {
      setLineIndex((i) => (i + 1) % lines.length);
    }, MARKETING_LINE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [minimal, showMarketingLines, lines.length]);

  const onCycleRef = useRef(onMarketingCycleComplete);
  onCycleRef.current = onMarketingCycleComplete;
  const cycleFiredRef = useRef(false);

  useEffect(() => {
    cycleFiredRef.current = false;
  }, [minimal, showMarketingLines, lines.length]);

  useEffect(() => {
    if (minimal || !showMarketingLines || lines.length === 0) return;
    const ms = lines.length * MARKETING_LINE_INTERVAL_MS;
    const id = setTimeout(() => {
      if (cycleFiredRef.current) return;
      cycleFiredRef.current = true;
      onCycleRef.current?.();
    }, ms);
    return () => clearTimeout(id);
  }, [minimal, showMarketingLines, lines.length]);

  const core = (
    <View style={styles.core}>
      <View style={styles.markWrap}>
        <Animated.View style={[styles.ringOuter, { borderColor: t.accent }, ringOuterStyle]} />
        <Animated.View style={[styles.ringInner, { borderColor: t.accent }, ringInnerStyle]} />
        <Animated.View style={[styles.logoLayer, logoStyle]}>
          <IconKeyGoLogo size={LOGO_SIZE} color={t.accent} strokeWidth={LOGO_STROKE} />
        </Animated.View>
      </View>
      {!minimal ? (
        <View style={styles.dotsRow} accessibilityRole="progressbar" accessibilityLabel="Loading">
          <BouncingDot color={t.accent} delayMs={0} />
          <BouncingDot color={t.accent} delayMs={120} />
          <BouncingDot color={t.accent} delayMs={240} />
        </View>
      ) : null}
      {showMarketingLines && !minimal ? (
        <View key={lineIndex} style={styles.marketingWrap}>
          <Text style={[styles.marketingLine, { color: t.textMuted, fontFamily: FF.regular }]} numberOfLines={3}>
            {lines[lineIndex]}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (fullscreen) {
    return (
      <View style={[styles.fullscreen, { backgroundColor: t.bgPage }]} accessibilityLiveRegion="polite">
        {core}
      </View>
    );
  }

  return <View style={styles.inline}>{core}</View>;
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  core: {
    alignItems: 'center',
    gap: 28,
  },
  markWrap: {
    width: LOGO_SIZE + 56,
    height: LOGO_SIZE + 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: LOGO_SIZE + 52,
    height: LOGO_SIZE + 52,
    borderRadius: 999,
    borderWidth: 2,
  },
  ringInner: {
    position: 'absolute',
    width: LOGO_SIZE + 24,
    height: LOGO_SIZE + 24,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  logoLayer: {},
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 12,
  },
  marketingWrap: {
    minHeight: 52,
    justifyContent: 'center',
  },
  marketingLine: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
    paddingHorizontal: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
