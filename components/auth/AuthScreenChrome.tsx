import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';
import { hapticLight, hapticSelection } from '../../services/haptics';
import type { AuthStackParamList } from '../../navigation/types';

type Props = {
  navigation: { navigate: (name: keyof AuthStackParamList) => void };
  /** `registerWizard` — theme toggle only (no back link; sign-in from Login). */
  variant: 'login' | 'register' | 'registerWizard';
};

export function AuthScreenChrome({ navigation, variant }: Props) {
  const { t, toggleTheme, theme } = useTheme();

  return (
    <View style={styles.row}>
      {variant === 'register' ? (
        <Pressable
          onPress={() => {
            void hapticLight();
            navigation.navigate('Login');
          }}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.72 }]}
        >
          <Text style={[styles.backLabel, { color: t.canvasTextMuted, fontFamily: FF.semibold }]}>← Sign in</Text>
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
      <Pressable
        onPress={() => {
          void hapticSelection();
          toggleTheme();
        }}
        style={({ pressed }) => [
          styles.themePill,
          {
            borderColor: t.border,
            backgroundColor: t.bgElevated,
          },
          pressed && { opacity: 0.88 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        <Text style={styles.themeIcon}>{theme === 'dark' ? '☀' : '☾'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 44,
  },
  backBtn: {
    minWidth: 88,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  themePill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  themeIcon: {
    fontSize: 20,
    lineHeight: 22,
  },
});
