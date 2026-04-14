import { useIsFocused } from '@react-navigation/native';
import { useLayoutEffect, useState } from 'react';
import { Switch, type SwitchProps } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>;

/**
 * React Native `Switch` often draws the wrong track/thumb on first paint when `value` is true
 * (cold start, navigating to a screen, or switching tabs). Remounting after focus + theme updates
 * keeps the “on” state visibly brand-colored without toggling off/on.
 */
export function ThemedSwitch({ value, onValueChange, disabled, ...rest }: Props) {
  const { theme, t } = useTheme();
  const isFocused = useIsFocused();
  const [paintKey, setPaintKey] = useState(0);

  useLayoutEffect(() => {
    if (!isFocused) return;
    const id = requestAnimationFrame(() => setPaintKey((k) => k + 1));
    return () => cancelAnimationFrame(id);
  }, [isFocused, theme]);

  const trackColor = { false: t.bgSubtle, true: t.brandSoft };
  const thumbColor = value ? t.brand : t.textMuted;

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
