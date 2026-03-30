import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = PressableProps & {
  children: ReactNode;
  variant?: Variant;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({ children, variant = 'primary', style, disabled, ...props }: Props) {
  const { t } = useTheme();
  const scale = useSharedValue(1);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const colors =
    variant === 'primary'
      ? { bg: t.brand, border: 'transparent', text: '#fff' }
      : variant === 'danger'
        ? { bg: t.dangerSoft, border: t.danger, text: t.danger }
        : { bg: t.bgSubtle, border: t.border, text: t.text };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 18, stiffness: 320 });
        props.onPressOut?.(e);
      }}
      style={[
        styles.base,
        { backgroundColor: colors.bg, borderColor: colors.border, opacity: disabled ? 0.7 : 1 },
        anim,
        style,
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{children}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});

