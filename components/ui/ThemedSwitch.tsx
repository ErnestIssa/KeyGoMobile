import { useIsFocused } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { Switch, type SwitchProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>;

/**
 * React Native `Switch` often paints the off (white/grey) track/thumb on first layout when `value` is true
 * (navigation, async prefs, tab focus). Bumping a remount key after focus + when `value` / theme changes
 * forces the native control to apply `trackColor` / `thumbColor` for the real on state.
 */
export function ThemedSwitch({ value, onValueChange, disabled, ...rest }: Props) {
  const { theme, t } = useTheme();
  const isFocused = useIsFocused();
  const [paintKey, setPaintKey] = useState(0);

  useLayoutEffect(() => {
    if (!isFocused) return;
    const id = requestAnimationFrame(() => {
      setPaintKey((k) => k + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [isFocused, theme, value]);

  const trackColor = { false: t.bgSubtle, true: t.brand };
  const thumbColor = value ? '#ffffff' : t.textMuted;

  return (
    <Switch
      key={`${theme}-sw-${paintKey}`}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={trackColor}
      thumbColor={thumbColor}
      ios_backgroundColor={t.bgSubtle}
      {...rest}
    />
  );
}
