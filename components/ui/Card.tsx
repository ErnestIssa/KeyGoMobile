import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radii } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeContext';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { t, theme } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: t.bgElevated,
          borderColor: t.border,
          shadowColor: theme === 'dark' ? '#000' : '#0f172a',
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
    borderRadius: radii.xxl,
    padding: 16,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

