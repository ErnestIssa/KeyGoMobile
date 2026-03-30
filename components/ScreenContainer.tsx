import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

type Props = {
  children: ReactNode;
  /** 'center' for splash-style screens; 'stretch' for lists and forms */
  align?: 'center' | 'stretch';
};

export function ScreenContainer({ children, align = 'center' }: Props) {
  const { t } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.bgPage }]} edges={['top', 'left', 'right']}>
      <View style={[styles.inner, align === 'stretch' ? styles.innerStretch : styles.innerCenter]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 16,
  },
  innerCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerStretch: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
});
