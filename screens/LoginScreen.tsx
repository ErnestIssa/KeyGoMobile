import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AuthBrandHero } from '../components/auth/AuthBrandHero';
import { AuthScreenChrome } from '../components/auth/AuthScreenChrome';
import { ScreenContainer } from '../components/ScreenContainer';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import type { AuthStackParamList } from '../navigation/types';
import { ApiError } from '../services/api';
import { hapticError, hapticLight } from '../services/haptics';
import { playNotify } from '../services/sounds';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { t } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      void hapticError();
      void playNotify();
      setError(e instanceof ApiError ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScreenContainer align="stretch" tabBarInset={false} scrollable>
        <View style={styles.column}>
          <AuthScreenChrome navigation={navigation} variant="login" />

          <Animated.View entering={FadeIn.duration(380)} style={styles.brandBlock}>
            <AuthBrandHero />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(340)} style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Sign in</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.formWrap}>
            <Card style={styles.authCard}>
              <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Email</Text>
              <Input
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
              />

              <View style={styles.fieldGap} />

              <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Password</Text>
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                autoComplete="password"
              />

              {error ? (
                <Text style={[styles.error, { color: t.danger, fontFamily: FF.semibold }]} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}

              <View style={styles.beforeCta} />

              <Button onPress={onSubmit} disabled={loading} loading={loading} fullWidth>
                Sign in
              </Button>

              <View style={[styles.ruleLine, { backgroundColor: t.border }]} />

              <Pressable
                style={({ pressed }) => [styles.footerTap, pressed && { opacity: 0.75 }]}
                onPress={() => {
                  void hapticLight();
                  navigation.navigate('Register');
                }}
              >
                <Text style={[styles.footerMuted, { color: t.textMuted, fontFamily: FF.regular }]}>No account?</Text>
                <Text style={[styles.footerAction, { color: t.brand, fontFamily: FF.bold }]}> Create one</Text>
              </Pressable>
            </Card>
          </Animated.View>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
  },
  column: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  brandBlock: {
    marginBottom: 4,
  },
  titleBlock: {
    marginBottom: 18,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 22,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  formWrap: {
    width: '100%',
  },
  authCard: {
    paddingVertical: 24,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: '600',
  },
  fieldGap: {
    height: 18,
  },
  error: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
  },
  beforeCta: {
    height: 22,
  },
  ruleLine: {
    height: StyleSheet.hairlineWidth,
    marginTop: 22,
    marginBottom: 18,
    alignSelf: 'stretch',
  },
  footerTap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  footerMuted: {
    fontSize: 15,
  },
  footerAction: {
    fontSize: 15,
    fontWeight: '700',
  },
});
