import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { radii } from '../../theme/tokens';
import { FF } from '../../theme/fonts';
import { useTheme } from '../../theme/ThemeContext';
import { hapticLight } from '../../services/haptics';

type Variant = 'primary' | 'secondary' | 'danger' | 'accent' | 'ghost';

type Props = PressableProps & {
  children: ReactNode;
  variant?: Variant;
  style?: ViewStyle;
  loading?: boolean;
  fullWidth?: boolean;
  /** Default true — light impact on press */
  hapticOnPress?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  children,
  variant = 'primary',
  style,
  disabled,
  loading,
  fullWidth,
  hapticOnPress = true,
  ...props
}: Props) {
  const { t, theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const colors =
    variant === 'primary'
      ? { bg: t.brand, border: 'transparent', text: '#fff', shadow: true }
      : variant === 'accent'
        ? { bg: t.accent, border: 'transparent', text: '#fff', shadow: true }
        : variant === 'danger'
          ? { bg: t.danger, border: 'transparent', text: '#fff', shadow: true }
          : variant === 'ghost'
            ? { bg: 'transparent', border: 'transparent', text: t.textMuted, shadow: false }
            : { bg: t.bgElevated, border: t.border, text: t.text, shadow: false };

  const inactive = disabled || loading;

  return (
    <AnimatedPressable
      {...props}
      disabled={inactive}
      onPressIn={(e) => {
        if (!inactive) {
          if (hapticOnPress) void hapticLight();
          scale.value = withSpring(0.95, { damping: 28, stiffness: 420 });
          opacity.value = withTiming(0.92, { duration: 90 });
        }
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 28, stiffness: 420 });
        opacity.value = withTiming(1, { duration: 140 });
        props.onPressOut?.(e);
      }}
      style={[
        styles.base,
        fullWidth ? styles.fullWidth : null,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
        inactive ? styles.disabled : null,
        colors.shadow ? (theme === 'light' ? styles.shadowLight : styles.shadowDark) : null,
        anim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: colors.text, fontFamily: FF.semibold }]}>{children}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  shadowLight: {
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
});

