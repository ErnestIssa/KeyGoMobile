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
import { friendlyErrorMessage } from '../lib/userFacingError';
import { hapticError, hapticLight, hapticSelection } from '../services/haptics';
import { playNotify } from '../services/sounds';
import { useTheme } from '../theme/ThemeContext';
import { FF } from '../theme/fonts';
import { radii } from '../theme/tokens';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { t } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'owner' | 'driver'>('driver');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      setError('Enter a valid phone number (7–15 digits).');
      return;
    }
    setLoading(true);
    try {
      await signUp({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role,
      });
    } catch (e) {
      void hapticError();
      void playNotify();
      setError(friendlyErrorMessage(e));
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
          <AuthScreenChrome navigation={navigation} variant="register" />

          <Animated.View entering={FadeIn.duration(380)} style={styles.brandBlock}>
            <AuthBrandHero />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(340)} style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: t.canvasText, fontFamily: FF.bold }]}>Create account</Text>
            <Text style={[styles.subline, { color: t.canvasTextMuted, fontFamily: FF.regular }]}>
              Owner ↔ Driver in Profile anytime.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.formWrap}>
            <Card style={styles.authCard}>
              <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>First name</Text>
              <Input
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="name-given"
              />

              <View style={styles.fieldGap} />

              <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Last name</Text>
              <Input
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="name-family"
              />

              <View style={styles.fieldGap} />

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

              <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Phone number</Text>
              <Input
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                placeholder="+1 or local number"
              />

              <View style={styles.fieldGap} />

              <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Password</Text>
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="password-new"
                placeholder="At least 6 characters"
              />

              <View style={styles.fieldGap} />

              <Text style={[styles.label, { color: t.textMuted, fontFamily: FF.semibold }]}>Starting as</Text>
              <View style={styles.roleRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleBtn,
                    {
                      borderColor: role === 'owner' ? t.brand : t.border,
                      backgroundColor: role === 'owner' ? t.brandSoft : t.inputSurface,
                    },
                    pressed && { opacity: 0.92 },
                  ]}
                  onPress={() => {
                    void hapticSelection();
                    setRole('owner');
                  }}
                >
                  <Text style={[styles.roleTitle, { color: role === 'owner' ? t.brand : t.text, fontFamily: FF.bold }]}>
                    Owner
                  </Text>
                  <Text style={[styles.roleHint, { color: t.textMuted, fontFamily: FF.regular }]}>List trips</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.roleBtn,
                    {
                      borderColor: role === 'driver' ? t.brand : t.border,
                      backgroundColor: role === 'driver' ? t.brandSoft : t.inputSurface,
                    },
                    pressed && { opacity: 0.92 },
                  ]}
                  onPress={() => {
                    void hapticSelection();
                    setRole('driver');
                  }}
                >
                  <Text style={[styles.roleTitle, { color: role === 'driver' ? t.brand : t.text, fontFamily: FF.bold }]}>
                    Driver
                  </Text>
                  <Text style={[styles.roleHint, { color: t.textMuted, fontFamily: FF.regular }]}>Accept trips</Text>
                </Pressable>
              </View>

              {error ? (
                <Text style={[styles.error, { color: t.textMuted, fontFamily: FF.semibold }]} accessibilityLiveRegion="polite">
                  {error}
                </Text>
              ) : null}

              <View style={styles.beforeCta} />

              <Button onPress={onSubmit} disabled={loading} loading={loading} fullWidth>
                Create account
              </Button>

              <View style={[styles.ruleLine, { backgroundColor: t.border }]} />

              <Pressable
                style={({ pressed }) => [styles.footerTap, pressed && { opacity: 0.75 }]}
                onPress={() => {
                  void hapticLight();
                  navigation.navigate('Login');
                }}
              >
                <Text style={[styles.footerMuted, { color: t.textMuted, fontFamily: FF.regular }]}>Have an account?</Text>
                <Text style={[styles.footerAction, { color: t.brand, fontFamily: FF.bold }]}> Sign in</Text>
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
    justifyContent: 'flex-start',
    paddingBottom: 24,
    paddingTop: 4,
  },
  brandBlock: {
    marginBottom: 2,
  },
  titleBlock: {
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  screenTitle: {
    fontSize: 22,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  subline: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 280,
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
    height: 16,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.button,
    borderWidth: 1.5,
    justifyContent: 'center',
    gap: 4,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  roleHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  beforeCta: {
    height: 20,
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
