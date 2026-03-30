import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function BlobsBackground() {
  const { t, theme } = useTheme();
  // Rough equivalent of the web's blurred gradient blobs.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.blob,
          styles.blobA,
          { backgroundColor: t.accent, opacity: theme === 'dark' ? 0.18 : 0.22 },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobB,
          { backgroundColor: t.brand, opacity: theme === 'dark' ? 0.16 : 0.18 },
        ]}
      />
      <View
        style={[
          styles.blob,
          styles.blobC,
          { backgroundColor: t.accent, opacity: theme === 'dark' ? 0.12 : 0.14 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
  },
  blobA: {
    top: -80,
    right: -80,
  },
  blobB: {
    top: '35%',
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 320,
  },
  blobC: {
    bottom: -40,
    right: '25%',
    width: 240,
    height: 240,
    borderRadius: 240,
  },
});

