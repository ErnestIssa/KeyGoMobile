import { StyleSheet, Text, View } from 'react-native';
import { IconKeyGoLogo } from '../icons/navIcons';
import { useTheme } from '../../theme/ThemeContext';
import { FF } from '../../theme/fonts';

const LOGO_SIZE = 132;

export function AuthBrandHero() {
  const { t, theme } = useTheme();
  const logoColor = theme === 'light' ? t.brand : t.canvasText;

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={[styles.logoRing, { borderColor: t.border, backgroundColor: t.bgElevated }]}>
        <IconKeyGoLogo size={LOGO_SIZE - 28} color={logoColor} strokeWidth={1.5} />
      </View>
      <View style={styles.wordmark}>
        <Text style={[styles.key, { color: t.canvasText, fontFamily: FF.extrabold }]}>Key</Text>
        <Text style={[styles.go, { color: t.accent, fontFamily: FF.extrabold }]}>Go</Text>
      </View>
      <View style={[styles.rule, { backgroundColor: t.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  logoRing: {
    width: LOGO_SIZE + 28,
    height: LOGO_SIZE + 28,
    borderRadius: (LOGO_SIZE + 28) / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 2,
  },
  key: {
    fontSize: 40,
    letterSpacing: -1.2,
    fontWeight: '900',
  },
  go: {
    fontSize: 40,
    letterSpacing: -1.2,
    fontWeight: '900',
  },
  rule: {
    marginTop: 14,
    width: 36,
    height: 3,
    borderRadius: 2,
    opacity: 0.85,
  },
});
