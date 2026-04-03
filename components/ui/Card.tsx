import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { t, theme } = useTheme();
  const shadow = theme === 'dark' ? styles.shadowDark : styles.shadowLight;
  return (
    <View
      style={[
        styles.base,
        shadow,
        {
          backgroundColor: t.bgElevated,
          borderColor: t.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 20,
  },
  shadowLight: {
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});
