import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  dotSize?: number;
  gap?: number;
};

/**
 * Three-dot “typing” animation for chat list + thread.
 */
export function TypingDots({ color, dotSize = 5, gap = 5 }: Props) {
  const a0 = useRef(new Animated.Value(0)).current;
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const anims = useRef([a0, a1, a2]).current;

  useEffect(() => {
    const wave = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 280,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 280,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(320),
        ])
      );
    const loops = [wave(a0, 0), wave(a1, 120), wave(a2, 240)];
    loops.forEach((l) => l.start());
    return () => {
      loops.forEach((l) => l.stop());
      anims.forEach((v) => v.setValue(0));
    };
  }, [a0, a1, a2, anims]);

  return (
    <View style={[styles.row, { gap }]}>
      {anims.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
              transform: [
                {
                  translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  dot: {},
});
