import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

type Props = {
  count?: number;
};

export function TripCardSkeleton({ count = 6 }: Props) {
  const { t } = useTheme();
  return (
    <View style={styles.wrap}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[styles.row, { backgroundColor: t.bgSubtle, borderColor: t.border }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    height: 96,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
    opacity: 0.9,
  },
});
